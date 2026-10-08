// =============================================================================
// Shipment tracking: Shiprocket webhook events + live tracking refresh
// Both paths produce a TrackingSnapshot and go through applyTrackingSnapshot(), so the order,
// scan history, order status and customer emails are updated the same way (and only once).
// =============================================================================
import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { transitionOrderStatus } from "@/lib/orders/transitions";
import { notifyOrder } from "@/lib/services/email/order-notifications";
import { getShiprocketConfig, shiprocketTrackingUrl, trackByAwb } from "./shiprocket";
import { normalizeShipmentStatus, orderStatusForShipment, parseShiprocketTime, type ShipmentStatus } from "./status";
import type { OrderStatus } from "@/lib/types";

export interface TrackingScan {
  time: string | null; // raw IST string from Shiprocket
  label: string | null;
  activity: string | null;
  location: string | null;
}

export interface TrackingSnapshot {
  awb: string | null;
  reference: string | null; // our order number (Shiprocket channel order id)
  shiprocketOrderId: number | null;
  courierName: string | null;
  statusLabel: string | null;
  statusCode: number | null;
  etd: string | null;
  trackUrl: string | null;
  isReturn: boolean;
  scans: TrackingScan[];
}

const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));
const int = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

/** Parses a Shiprocket tracking webhook body. Tolerant of missing fields; never throws. */
export function snapshotFromWebhook(body: any): TrackingSnapshot {
  const scans: any[] = Array.isArray(body?.scans) ? body.scans : [];
  return {
    awb: str(body?.awb ?? body?.awb_code),
    reference: str(body?.order_id ?? body?.channel_order_id),
    shiprocketOrderId: int(body?.sr_order_id),
    courierName: str(body?.courier_name),
    statusLabel: str(body?.current_status ?? body?.shipment_status),
    statusCode: int(body?.current_status_id ?? body?.shipment_status_id),
    etd: str(body?.etd),
    trackUrl: null,
    isReturn: Number(body?.is_return) === 1,
    scans: scans.map((s) => ({
      time: str(s?.date),
      label: str(s?.["sr-status-label"] ?? s?.status),
      activity: str(s?.activity),
      location: str(s?.location),
    })),
  };
}

/** Parses GET courier/track/awb/<awb>. */
export function snapshotFromTrackingApi(body: any, awb: string): TrackingSnapshot | null {
  const t = body?.tracking_data;
  if (!t || typeof t !== "object") return null;
  const track = Array.isArray(t.shipment_track) ? t.shipment_track[0] || {} : {};
  const acts: any[] = Array.isArray(t.shipment_track_activities) ? t.shipment_track_activities : [];
  return {
    awb: str(track.awb_code) || awb,
    reference: str(track.channel_order_id ?? track.order_id),
    shiprocketOrderId: null,
    courierName: str(track.courier_name),
    statusLabel: str(track.current_status),
    statusCode: int(t.shipment_status),
    etd: str(t.etd ?? track.edd),
    trackUrl: str(t.track_url),
    isReturn: false,
    scans: acts.map((s) => ({
      time: str(s?.date),
      label: str(s?.["sr-status-label"] ?? s?.status),
      activity: str(s?.activity),
      location: str(s?.location),
    })),
  };
}

export function webhookDedupeKey(body: unknown): string {
  const b = (body || {}) as any;
  const scans = Array.isArray(b.scans) ? b.scans : [];
  const last = scans[scans.length - 1] || {};
  const basis = [b.awb, b.sr_order_id, b.order_id, b.current_status_id, b.current_status, b.shipment_status_id, b.current_timestamp, scans.length, last.date, last.activity]
    .map((x) => String(x ?? ""))
    .join("|");
  return createHash("sha256").update(basis || JSON.stringify(b)).digest("hex");
}

const scanKey = (orderId: string, s: TrackingScan, awb: string | null) =>
  createHash("sha256").update([orderId, awb, s.time, s.label, s.activity, s.location].map((x) => x ?? "").join("|")).digest("hex");

const SAFE_ID = /^[A-Za-z0-9-]{4,50}$/;

async function findOrderForSnapshot(snap: TrackingSnapshot) {
  const db = createAdminClient();
  const cols = "id, order_number, order_status, payment_method, payment_status, shiprocket_awb, tracking_number, courier_partner, shipment_status, pickup_status";
  // Strict format check before the value is used in a filter (no PostgREST filter injection)
  if (snap.awb && SAFE_ID.test(snap.awb)) {
    const { data } = await db.from("orders").select(cols).or(`shiprocket_awb.eq.${snap.awb},tracking_number.eq.${snap.awb}`).limit(1).maybeSingle();
    if (data) return data;
  }
  if (snap.reference && SAFE_ID.test(snap.reference)) {
    const { data } = await db.from("orders").select(cols).eq("order_number", snap.reference).maybeSingle();
    if (data) return data;
  }
  if (snap.shiprocketOrderId) {
    const { data } = await db.from("orders").select(cols).eq("shiprocket_order_id", snap.shiprocketOrderId).maybeSingle();
    if (data) return data;
  }
  return null;
}

/**
 * Applies a tracking snapshot to the matching order. Idempotent: scans are deduplicated, status
 * transitions are compare-and-swap, emails are keyed per order/status.
 */
export async function applyTrackingSnapshot(
  snap: TrackingSnapshot,
  source: "webhook" | "api"
): Promise<{ orderId: string | null; result: "processed" | "ignored"; note?: string }> {
  const order = await findOrderForSnapshot(snap);
  if (!order) return { orderId: null, result: "ignored", note: "No matching order" };

  const db = createAdminClient();
  const awb = (snap.awb && SAFE_ID.test(snap.awb) ? snap.awb : null) || order.shiprocket_awb || order.tracking_number || null;

  // 1. scan history (customer-visible)
  const rows = snap.scans
    .filter((s) => s.activity || s.label)
    .map((s) => {
      const when = parseShiprocketTime(s.time);
      return {
        order_id: order.id,
        awb,
        status_label: s.label?.slice(0, 150) || null,
        activity: s.activity?.slice(0, 1000) || null,
        location: s.location?.slice(0, 255) || null,
        event_time: when ? when.toISOString() : null,
        raw_time: s.time?.slice(0, 50) || null,
        source,
        dedupe_key: scanKey(order.id, s, awb),
      };
    });
  if (rows.length) {
    const { error } = await db.from("shipment_tracking_events").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
    if (error) throw new Error(`Saving scans failed: ${error.message}`);
  }

  // Return-pickup shipments (customer returns) are recorded but never move the forward order
  if (snap.isReturn) return { orderId: order.id, result: "processed", note: "Return shipment event recorded" };

  // 2. shipment fields on the order
  const shipment: ShipmentStatus = normalizeShipmentStatus(snap.statusLabel);
  const update: Record<string, unknown> = { last_tracking_update: new Date().toISOString() };
  if (snap.statusLabel) update.shiprocket_status = snap.statusLabel.slice(0, 100);
  if (snap.statusCode !== null) update.shiprocket_status_code = snap.statusCode;
  if (shipment !== "unknown") update.shipment_status = shipment;
  if (awb && !order.shiprocket_awb) {
    update.shiprocket_awb = awb;
    update.tracking_number = awb;
    update.tracking_url = snap.trackUrl || shiprocketTrackingUrl(awb);
  } else if (snap.trackUrl && /^https:\/\//.test(snap.trackUrl)) {
    update.tracking_url = snap.trackUrl;
  }
  if (snap.courierName && awb) update.courier_partner = snap.courierName.slice(0, 100);
  const etd = parseShiprocketTime(snap.etd);
  if (etd) update.estimated_delivery = etd.toISOString().slice(0, 10);
  if (["picked_up", "in_transit", "out_for_delivery", "delivered"].includes(shipment)) update.pickup_status = "picked_up";
  if (shipment === "delivered") update.delivered_at = new Date().toISOString();
  if (shipment === "cancelled") update.fulfillment_status = "cancelled";

  const { error: updErr } = await db.from("orders").update(update).eq("id", order.id);
  if (updErr) throw new Error(`Updating order failed: ${updErr.message}`);

  // A courier assigned on Shiprocket's side (e.g. auto-ship rules) still gets the customer email
  if (awb && !order.shiprocket_awb) await notifyOrder("tracking_available", order.id);

  // 3. order status (forward-only) + customer email for that status
  const target = orderStatusForShipment(shipment, order.order_status as OrderStatus);
  if (target) {
    const extra: Record<string, unknown> = {};
    await transitionOrderStatus(order.id, order.order_status, target, {
      notes: `Shiprocket: ${snap.statusLabel}${snap.courierName ? ` (${snap.courierName})` : ""}`,
      extraUpdate: extra,
    });
  }
  return { orderId: order.id, result: "processed" };
}

/** Processes a stored webhook event row once (status 'received' or 'failed' -> 'processed'/'ignored'/'failed'). */
export async function processShippingWebhookEvent(eventId: string) {
  const db = createAdminClient();
  // Everything below is idempotent (scan dedupe keys, compare-and-swap status changes, keyed emails),
  // so processing the same event twice concurrently cannot double-apply it.
  const { data: ev } = await db
    .from("shipping_webhook_events")
    .select("*")
    .eq("id", eventId)
    .in("status", ["received", "failed"])
    .maybeSingle();
  if (!ev) return;
  try {
    const r = await applyTrackingSnapshot(snapshotFromWebhook(ev.payload), "webhook");
    await db
      .from("shipping_webhook_events")
      .update({ status: r.result, order_id: r.orderId, error: r.note || null, attempts: (ev.attempts || 0) + 1, processed_at: new Date().toISOString() })
      .eq("id", eventId);
  } catch (err: any) {
    await db
      .from("shipping_webhook_events")
      .update({ status: "failed", error: String(err?.message || err).slice(0, 1000), attempts: (ev.attempts || 0) + 1 })
      .eq("id", eventId);
    console.error(`[shiprocket-webhook] event ${eventId} failed: ${err?.message || err}`);
  }
}

/** Re-processes webhook events that were stored but not processed (crash) or failed (max 5 tries). */
export async function retryPendingWebhookEvents(limit = 25) {
  const db = createAdminClient();
  const staleIso = new Date(Date.now() - 2 * 60_000).toISOString();
  const { data } = await db
    .from("shipping_webhook_events")
    .select("id")
    .in("status", ["received", "failed"])
    .lt("attempts", 5)
    .lt("received_at", staleIso)
    .order("received_at", { ascending: true })
    .limit(limit);
  for (const r of data || []) await processShippingWebhookEvent(r.id);
  return { attempted: data?.length || 0 };
}

/**
 * Pulls live tracking from Shiprocket for an order that has an AWB, at most once per `minAgeMs`.
 * Used by the customer tracking page and the admin "refresh tracking" button.
 */
export async function refreshTrackingFromApi(orderId: string, minAgeMs = 30 * 60_000): Promise<{ ok: boolean; message: string }> {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, shiprocket_awb, last_tracking_update").eq("id", orderId).maybeSingle();
  if (!order?.shiprocket_awb) return { ok: false, message: "No AWB yet" };
  if (order.last_tracking_update && Date.now() - new Date(order.last_tracking_update).getTime() < minAgeMs) {
    return { ok: true, message: "Tracking is up to date" };
  }
  const { config, reason } = getShiprocketConfig();
  if (!config) return { ok: false, message: `Shiprocket is not configured: ${reason}` };
  try {
    const body = await trackByAwb(config, order.shiprocket_awb);
    const snap = snapshotFromTrackingApi(body, order.shiprocket_awb);
    // Always stamp the check time so a quiet shipment is not re-fetched on every page view
    await db.from("orders").update({ last_tracking_update: new Date().toISOString() }).eq("id", orderId);
    if (!snap) return { ok: true, message: "No tracking events yet" };
    await applyTrackingSnapshot(snap, "api");
    return { ok: true, message: "Tracking refreshed" };
  } catch (err: any) {
    console.error(`[tracking] refresh ${orderId} failed: ${err?.message || err}`);
    return { ok: false, message: err?.message || "Tracking refresh failed" };
  }
}
