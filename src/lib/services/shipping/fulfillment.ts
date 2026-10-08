// =============================================================================
// Order -> Shiprocket fulfillment pipeline
// -----------------------------------------------------------------------------
// Steps (each one is skipped if its result is already stored, so the pipeline is safe to re-run):
//   1. create order + shipment in Shiprocket   (reference = Raveena order number)
//   2. assign courier / AWB                      (SHIPROCKET_AUTO_ASSIGN_AWB, default on)
//   3. schedule pickup                           (SHIPROCKET_AUTO_PICKUP, default on)
// Duplicate protection:
//   - a compare-and-swap lease on the order row: only one worker runs at a time
//   - before re-trying step 1 after any earlier attempt, Shiprocket is searched for an existing
//     order with our reference, so a timed-out create is adopted instead of duplicated
//   - unique indexes on shiprocket_order_id / shipment_id / awb
// Failures are recorded on the order (error, operation, time, next retry); nothing fails silently.
// =============================================================================
import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { notifyOrder } from "@/lib/services/email/order-notifications";
import {
  assignAwb,
  cancelOrders,
  createAdhocOrder,
  findOrderByReference,
  generatePickup,
  getShiprocketConfig,
  shiprocketTrackingUrl,
  ShiprocketError,
  type AdhocOrderPayload,
  type ShiprocketConfig,
} from "./shiprocket";
import { parseShiprocketTime } from "./status";

export const FULFILLMENT_MAX_AUTO_ATTEMPTS = 6;
const LEASE_MS = 120_000;

export type FulfillmentOutcome =
  | { ok: true; status: string; message: string }
  | { ok: false; status: string; message: string; skipped?: boolean };

const retryDelayMs = (attempt: number) => Math.min(6 * 60 * 60_000, 2 * 60_000 * 3 ** Math.max(0, attempt - 1)); // 2m, 6m, 18m, 54m...

/** True when the order may be shipped: Razorpay payment captured. */
export function isOrderShippable(order: any): boolean {
  if (["cancelled", "returned", "refunded", "refund_processing", "return_requested"].includes(order.order_status)) return false;
  return order.payment_status === "paid";
}

const digits10 = (phone: string) => String(phone || "").replace(/\D/g, "").slice(-10);
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

function istOrderDate(iso: string) {
  const d = new Date(new Date(iso).getTime() + 5.5 * 60 * 60_000);
  return d.toISOString().slice(0, 16).replace("T", " "); // "YYYY-MM-DD HH:mm" in IST
}

/** Maps a Raveena order to Shiprocket's adhoc order payload. Pure; exported for tests. */
export function buildShiprocketOrderPayload(order: any, cfg: ShiprocketConfig): AdhocOrderPayload {
  const a = (order.shipping_address || {}) as Record<string, string | undefined>;
  const fullName = clip(a.name || order.customer_name, 100);
  const [first, ...rest] = fullName.split(/\s+/);
  const items = (order.order_items || []) as any[];

  const seen = new Map<string, number>();
  const orderItems = items.map((i) => {
    const base = clip(i.sku || i.product_id || "ITEM", 40);
    const n = (seen.get(base) || 0) + 1;
    seen.set(base, n);
    return {
      name: clip(`${i.product_name}${i.selected_color ? ` - ${i.selected_color}` : ""}`, 200),
      sku: n > 1 ? `${base}-${n}` : base,
      units: Math.max(1, Number(i.quantity || 1)),
      selling_price: Number(i.price || 0),
      discount: 0,
      tax: 0,
    };
  });
  const units = orderItems.reduce((s, i) => s + i.units, 0) || 1;

  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || 0);
  const shipping = Number(order.shipping_fee || 0);
  const total = Number(order.total_amount || 0);
  const giftwrap = order.gift_wrap ? Math.max(0, Math.round((total - (subtotal - discount + shipping)) * 100) / 100) : 0;

  return {
    order_id: order.order_number,
    order_date: istOrderDate(order.created_at),
    pickup_location: cfg.pickupLocation,
    ...(cfg.channelId ? { channel_id: cfg.channelId } : {}),
    ...(order.gift_wrap ? { comment: clip(`Gift wrap${order.gift_message ? `: ${order.gift_message}` : ""}`, 250) } : {}),
    billing_customer_name: first || fullName || "Customer",
    billing_last_name: rest.join(" "),
    billing_address: clip([a.houseNumber, a.streetAddress || a.street].filter(Boolean).join(", "), 190) || clip(a.locality, 190),
    billing_address_2: clip([a.locality, a.landmark ? `Near ${a.landmark}` : ""].filter(Boolean).join(", "), 190),
    billing_city: clip(a.city, 60),
    billing_pincode: clip(a.pincode, 6),
    billing_state: clip(a.state, 60),
    billing_country: "India",
    billing_email: clip(order.customer_email, 120),
    billing_phone: digits10(a.phone || order.customer_phone),
    shipping_is_billing: true,
    order_items: orderItems,
    payment_method: "Prepaid",
    shipping_charges: shipping,
    giftwrap_charges: giftwrap,
    transaction_charges: 0,
    total_discount: discount,
    sub_total: subtotal,
    length: cfg.pkg.lengthCm,
    breadth: cfg.pkg.breadthCm,
    height: cfg.pkg.heightCm,
    weight: Math.round(cfg.pkg.weightKgPerItem * units * 100) / 100,
  };
}

async function loadOrder(orderId: string) {
  const { data } = await createAdminClient().from("orders").select("*, order_items (*)").eq("id", orderId).maybeSingle();
  return data;
}

async function recordFailure(orderId: string, operation: string, err: unknown, attempts: number) {
  const e = err instanceof ShiprocketError ? err : null;
  const message = (e?.message || (err as any)?.message || String(err)).slice(0, 1000);
  // Validation errors (4xx) need a human fix (address, pickup location...) - do not retry them automatically
  const retryable = e ? e.retryable : true;
  const autoRetry = retryable && attempts < FULFILLMENT_MAX_AUTO_ATTEMPTS;
  await createAdminClient()
    .from("orders")
    .update({
      fulfillment_status: "failed",
      fulfillment_operation: operation,
      fulfillment_error: message,
      fulfillment_error_at: new Date().toISOString(),
      fulfillment_locked_until: null,
      fulfillment_next_retry_at: autoRetry ? new Date(Date.now() + retryDelayMs(attempts)).toISOString() : null,
    })
    .eq("id", orderId);
  console.error(`[fulfillment] ${orderId} ${operation} failed (attempt ${attempts}): ${message}`);
  return message;
}

/**
 * Runs (or resumes) fulfillment for one order. Idempotent and safe under concurrency.
 * `force` (admin retry) ignores the automatic-attempt limit and the retry schedule.
 */
export async function runFulfillment(orderId: string, opts: { force?: boolean; trigger?: string } = {}): Promise<FulfillmentOutcome> {
  const db = createAdminClient();
  const order = await loadOrder(orderId);
  if (!order) return { ok: false, status: "missing", message: "Order not found", skipped: true };
  if (!isOrderShippable(order)) return { ok: false, status: "not_ready", message: "Order is not paid/confirmed yet or is cancelled", skipped: true };
  if (order.fulfillment_status === "pickup_scheduled" || order.fulfillment_status === "cancelled") {
    return { ok: true, status: order.fulfillment_status, message: "Nothing to do" };
  }

  const { config, reason } = getShiprocketConfig();
  if (!config) {
    await db
      .from("orders")
      .update({
        fulfillment_status: "failed",
        fulfillment_operation: "config",
        fulfillment_error: `Shiprocket is not configured: ${reason}`,
        fulfillment_error_at: new Date().toISOString(),
        fulfillment_next_retry_at: null,
      })
      .eq("id", orderId)
      .is("shiprocket_order_id", null);
    return { ok: false, status: "failed", message: `Shiprocket is not configured: ${reason}` };
  }

  // ── claim the lease (compare-and-swap on the attempt counter) ──
  const now = new Date();
  const attempts = (order.fulfillment_attempts || 0) + 1;
  if (!opts.force && order.fulfillment_status === "failed" && (order.fulfillment_attempts || 0) >= FULFILLMENT_MAX_AUTO_ATTEMPTS) {
    return { ok: false, status: "failed", message: "Automatic retries exhausted; use Retry in the dashboard", skipped: true };
  }
  const { data: claimed } = await db
    .from("orders")
    .update({
      fulfillment_status: order.fulfillment_status === "failed" || !order.fulfillment_status || order.fulfillment_status === "pending" ? "processing" : order.fulfillment_status,
      fulfillment_locked_until: new Date(now.getTime() + LEASE_MS).toISOString(),
      fulfillment_attempts: attempts,
      fulfillment_next_retry_at: null,
    })
    .eq("id", orderId)
    .eq("fulfillment_attempts", order.fulfillment_attempts || 0)
    .or(`fulfillment_locked_until.is.null,fulfillment_locked_until.lt.${now.toISOString()}`)
    .select("id")
    .maybeSingle();
  if (!claimed) return { ok: false, status: "busy", message: "Fulfillment is already running for this order", skipped: true };

  let state = { ...order };
  let operation = "create_order";
  try {
    // ── step 1: Shiprocket order + shipment ──
    if (!state.shiprocket_order_id) {
      let created = attempts > 1 ? await findOrderByReference(config, order.order_number) : null;
      const adopted = Boolean(created);
      if (!created) {
        try {
          created = await createAdhocOrder(config, buildShiprocketOrderPayload(order, config));
        } catch (err) {
          // Shiprocket may reject a duplicate reference: adopt the existing order instead of failing
          if (err instanceof ShiprocketError && /already exist/i.test(err.message)) {
            created = await findOrderByReference(config, order.order_number);
          }
          if (!created) throw err;
        }
      }
      const update: Record<string, unknown> = {
        shiprocket_order_id: created.orderId,
        shiprocket_shipment_id: created.shipmentId,
        shiprocket_status: created.status || "NEW",
        shipment_status: "created",
        fulfillment_status: "order_created",
        fulfillment_error: null,
        synced_at: new Date().toISOString(),
      };
      if (created.awb) {
        Object.assign(update, {
          shiprocket_awb: created.awb,
          tracking_number: created.awb,
          courier_partner: created.courierName || null,
          shiprocket_courier_id: created.courierId || null,
          tracking_url: shiprocketTrackingUrl(created.awb),
          shipment_status: "awb_assigned",
          fulfillment_status: "awb_assigned",
        });
      }
      const { error } = await db.from("orders").update(update).eq("id", orderId);
      if (error) throw new Error(`Saving Shiprocket ids failed: ${error.message}`);
      state = { ...state, ...update };
      console.info(`[fulfillment] ${order.order_number} -> Shiprocket order ${created.orderId} (${adopted ? "adopted existing" : "created"})`);
      await notifyOrder("shipment_created", orderId);
    }

    if (!state.shiprocket_shipment_id) {
      throw new ShiprocketError("Shiprocket did not return a shipment id for this order", 200, true, "create_order");
    }

    // ── step 2: courier / AWB ──
    operation = "assign_awb";
    if (config.autoAssignAwb && !state.shiprocket_awb) {
      const awb = await assignAwb(config, Number(state.shiprocket_shipment_id), config.courierId);
      const update = {
        shiprocket_awb: awb.awb,
        tracking_number: awb.awb,
        courier_partner: awb.courierName,
        shiprocket_courier_id: awb.courierId,
        tracking_url: shiprocketTrackingUrl(awb.awb),
        shipment_status: "awb_assigned",
        shiprocket_status: "AWB ASSIGNED",
        fulfillment_status: "awb_assigned",
        fulfillment_error: null,
        synced_at: new Date().toISOString(),
      };
      const { error } = await db.from("orders").update(update).eq("id", orderId);
      if (error) throw new Error(`Saving AWB failed: ${error.message}`);
      state = { ...state, ...update };
    }
    if (state.shiprocket_awb) await notifyOrder("tracking_available", orderId);

    // ── step 3: pickup ──
    operation = "schedule_pickup";
    if (config.autoPickup && state.shiprocket_awb && state.pickup_status !== "scheduled" && state.pickup_status !== "picked_up") {
      let scheduledDate: string | null = null;
      try {
        scheduledDate = (await generatePickup(config, Number(state.shiprocket_shipment_id))).scheduledDate;
      } catch (err) {
        if (!(err instanceof ShiprocketError && /already/i.test(err.message))) throw err;
      }
      const when = parseShiprocketTime(scheduledDate);
      const update = {
        pickup_status: "scheduled",
        pickup_scheduled_at: when ? when.toISOString() : null,
        shipment_status: "pickup_scheduled",
        fulfillment_status: "pickup_scheduled",
        fulfillment_error: null,
        synced_at: new Date().toISOString(),
      };
      const { error } = await db.from("orders").update(update).eq("id", orderId);
      if (error) throw new Error(`Saving pickup failed: ${error.message}`);
      state = { ...state, ...update };
    }

    // ── done: release the lease ──
    await db
      .from("orders")
      .update({
        fulfillment_locked_until: null,
        fulfillment_operation: null,
        fulfillment_error: null,
        fulfillment_error_at: null,
        fulfillment_next_retry_at: null,
      })
      .eq("id", orderId);
    return { ok: true, status: state.fulfillment_status, message: `Synced with Shiprocket (${state.fulfillment_status})` };
  } catch (err) {
    const message = await recordFailure(orderId, operation, err, attempts);
    return { ok: false, status: "failed", message };
  }
}

/** Orders whose automatic retry is due, plus confirmed orders that never started (e.g. process died). */
export async function retryDueFulfillments(limit = 10) {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - 5 * 60_000).toISOString();
  const [{ data: due }, { data: crashed }, { data: neverStarted }] = await Promise.all([
    // failed runs whose backoff has elapsed
    db.from("orders").select("id").eq("fulfillment_status", "failed").not("fulfillment_next_retry_at", "is", null).lte("fulfillment_next_retry_at", nowIso).limit(limit),
    // runs that took the lease and never released it (process died mid-way)
    db.from("orders").select("id").in("fulfillment_status", ["processing", "order_created", "awb_assigned"]).not("fulfillment_locked_until", "is", null).lt("fulfillment_locked_until", nowIso).limit(limit),
    // confirmed orders whose background start never happened
    db.from("orders").select("id").eq("fulfillment_status", "pending").is("fulfillment_locked_until", null).lt("created_at", staleIso).limit(limit),
  ]);
  const ids = Array.from(new Set([...(due || []), ...(crashed || []), ...(neverStarted || [])].map((r) => r.id as string)));
  const results: FulfillmentOutcome[] = [];
  for (const id of ids) results.push(await runFulfillment(id, { trigger: "cron" }));
  return { attempted: ids.length, succeeded: results.filter((r) => r.ok).length };
}

/** Cancels the Shiprocket order (if any). Used when the store cancels an order before dispatch. */
export async function cancelShiprocketOrder(orderId: string): Promise<{ ok: boolean; message: string }> {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("id, order_number, shiprocket_order_id, shipment_status").eq("id", orderId).maybeSingle();
  if (!order) return { ok: false, message: "Order not found" };
  if (!order.shiprocket_order_id) return { ok: true, message: "No Shiprocket order to cancel" };
  if (["picked_up", "in_transit", "out_for_delivery", "delivered"].includes(order.shipment_status || "")) {
    return { ok: false, message: "The parcel has already been picked up; cancel it from the Shiprocket panel (RTO)." };
  }
  const { config, reason } = getShiprocketConfig();
  if (!config) return { ok: false, message: `Shiprocket is not configured: ${reason}` };
  try {
    await cancelOrders(config, [Number(order.shiprocket_order_id)]);
    await db
      .from("orders")
      .update({
        fulfillment_status: "cancelled",
        shipment_status: "cancelled",
        shiprocket_status: "CANCELED",
        fulfillment_error: null,
        fulfillment_next_retry_at: null,
        synced_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    return { ok: true, message: "Cancelled in Shiprocket" };
  } catch (err: any) {
    const message = (err?.message || "Shiprocket cancellation failed").slice(0, 1000);
    // Record the error without changing fulfillment_status, so no automatic shipping retry is scheduled
    await db
      .from("orders")
      .update({ fulfillment_operation: "cancel_order", fulfillment_error: message, fulfillment_error_at: new Date().toISOString() })
      .eq("id", orderId);
    console.error(`[fulfillment] ${orderId} cancel_order failed: ${message}`);
    return { ok: false, message };
  }
}
