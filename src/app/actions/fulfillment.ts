"use server";

// Admin-only operations for shipping (Shiprocket) and transactional email.
// Every action independently verifies the caller's admin role on the server.
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { runFulfillment } from "@/lib/services/shipping/fulfillment";
import { refreshTrackingFromApi } from "@/lib/services/shipping/tracking";
import { getShiprocketConfig } from "@/lib/services/shipping/shiprocket";
import { deliverEmailEvent, getEmailConfig } from "@/lib/services/email";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface OperationsOverview {
  integrations: { shiprocket: { configured: boolean; reason?: string; autoAssignAwb?: boolean; autoPickup?: boolean }; email: { configured: boolean; reason?: string }; webhookToken: boolean; cronSecret: boolean };
  failedFulfillments: { id: string; orderNumber: string; customerName: string; operation: string | null; error: string | null; errorAt: string | null; attempts: number; nextRetryAt: string | null }[];
  pendingShipments: number;
  failedEmails: { id: string; template: string; recipient: string; orderNumber: string | null; error: string | null; attempts: number; updatedAt: string }[];
  failedWebhooks: number;
  shipmentAlerts: { id: string; orderNumber: string; shipmentStatus: string; shiprocketStatus: string | null; awb: string | null }[];
}

/** Integration health + everything that needs the admin's attention. */
export async function getOperationsOverviewAction(): Promise<{ success: true; data: OperationsOverview } | { success: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const db = createAdminClient();
    const sr = getShiprocketConfig();
    const em = getEmailConfig();
    const [failedF, pending, failedE, failedW, alerts] = await Promise.all([
      db
        .from("orders")
        .select("id, order_number, customer_name, fulfillment_operation, fulfillment_error, fulfillment_error_at, fulfillment_attempts, fulfillment_next_retry_at")
        .eq("fulfillment_status", "failed")
        .order("fulfillment_error_at", { ascending: false })
        .limit(50),
      db.from("orders").select("id", { count: "exact", head: true }).in("fulfillment_status", ["pending", "processing", "order_created", "awb_assigned"]),
      db
        .from("email_events")
        .select("id, template, recipient, last_error, attempts, updated_at, orders(order_number)")
        .eq("status", "failed")
        .order("updated_at", { ascending: false })
        .limit(50),
      db.from("shipping_webhook_events").select("id", { count: "exact", head: true }).eq("status", "failed"),
      db
        .from("orders")
        .select("id, order_number, shipment_status, shiprocket_status, shiprocket_awb")
        .in("shipment_status", ["undelivered", "rto", "returned", "lost", "exception"])
        .not("order_status", "in", "(cancelled,refunded,returned)")
        .order("updated_at", { ascending: false })
        .limit(50),
    ]);

    return {
      success: true,
      data: {
        integrations: {
          shiprocket: { configured: !!sr.config, reason: sr.reason, autoAssignAwb: sr.config?.autoAssignAwb, autoPickup: sr.config?.autoPickup },
          email: { configured: !!em.config, reason: em.reason },
          webhookToken: Boolean(process.env.SHIPROCKET_WEBHOOK_TOKEN),
          cronSecret: Boolean(process.env.CRON_SECRET && process.env.CRON_SECRET.length >= 16),
        },
        failedFulfillments: (failedF.data || []).map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerName: o.customer_name,
          operation: o.fulfillment_operation,
          error: o.fulfillment_error,
          errorAt: o.fulfillment_error_at,
          attempts: o.fulfillment_attempts || 0,
          nextRetryAt: o.fulfillment_next_retry_at,
        })),
        pendingShipments: pending.count || 0,
        failedEmails: (failedE.data || []).map((e: any) => ({
          id: e.id,
          template: e.template,
          recipient: e.recipient,
          orderNumber: e.orders?.order_number ?? null,
          error: e.last_error,
          attempts: e.attempts || 0,
          updatedAt: e.updated_at,
        })),
        failedWebhooks: failedW.count || 0,
        shipmentAlerts: (alerts.data || []).map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          shipmentStatus: o.shipment_status,
          shiprocketStatus: o.shiprocket_status,
          awb: o.shiprocket_awb,
        })),
      },
    };
  } catch {
    return { success: false, error: "Could not load operations data." };
  }
}

/** Safe manual retry: resumes from the last completed step; never creates a second Shiprocket order. */
export async function retryFulfillmentAction(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!UUID_RE.test(orderId)) return { success: false, error: "Invalid order." };
  const r = await runFulfillment(orderId, { force: true, trigger: `admin:${auth.userId}` });
  console.info(`[fulfillment] manual retry ${orderId} by=${auth.userId}: ${r.status}`);
  revalidatePath("/admin/orders");
  return r.ok ? { success: true, message: r.message } : { success: false, error: r.message };
}

export async function retryEmailAction(emailEventId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!UUID_RE.test(emailEventId)) return { success: false, error: "Invalid email." };
  const r = await deliverEmailEvent(emailEventId, { force: true });
  return r.ok ? { success: true } : { success: false, error: r.error || "Email could not be sent." };
}

export async function refreshTrackingAction(orderId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!UUID_RE.test(orderId)) return { success: false, error: "Invalid order." };
  const r = await refreshTrackingFromApi(orderId, 0);
  return r.ok ? { success: true, message: r.message } : { success: false, error: r.message };
}

export interface ShipmentDetails {
  order: {
    id: string;
    orderNumber: string;
    shiprocketOrderId: number | null;
    shipmentId: number | null;
    awb: string | null;
    courier: string | null;
    trackingUrl: string | null;
    shiprocketStatus: string | null;
    shipmentStatus: string | null;
    pickupStatus: string | null;
    pickupScheduledAt: string | null;
    fulfillmentStatus: string | null;
    fulfillmentError: string | null;
    fulfillmentOperation: string | null;
    attempts: number;
    syncedAt: string | null;
    lastTrackingUpdate: string | null;
  };
  scans: { label: string | null; activity: string | null; location: string | null; at: string | null }[];
  emails: { id: string; template: string; status: string; attempts: number; error: string | null; sentAt: string | null; createdAt: string }[];
  webhooks: { status: string; label: string | null; receivedAt: string; error: string | null }[];
}

/** Everything about one order's shipment and emails, for the admin detail drawer. */
export async function getShipmentDetailsAction(orderId: string): Promise<{ success: true; data: ShipmentDetails } | { success: false; error: string }> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!UUID_RE.test(orderId)) return { success: false, error: "Invalid order." };
  const db = createAdminClient();
  const [{ data: o }, { data: scans }, { data: emails }, { data: hooks }] = await Promise.all([
    db.from("orders").select("*").eq("id", orderId).maybeSingle(),
    db.from("shipment_tracking_events").select("status_label, activity, location, event_time, raw_time").eq("order_id", orderId).order("event_time", { ascending: false, nullsFirst: false }).limit(100),
    db.from("email_events").select("id, template, status, attempts, last_error, sent_at, created_at").eq("order_id", orderId).order("created_at", { ascending: true }),
    db.from("shipping_webhook_events").select("status, status_label, received_at, error").eq("order_id", orderId).order("received_at", { ascending: false }).limit(50),
  ]);
  if (!o) return { success: false, error: "Order not found." };
  return {
    success: true,
    data: {
      order: {
        id: o.id,
        orderNumber: o.order_number,
        shiprocketOrderId: o.shiprocket_order_id,
        shipmentId: o.shiprocket_shipment_id,
        awb: o.shiprocket_awb || o.tracking_number || null,
        courier: o.courier_partner || null,
        trackingUrl: o.tracking_url || null,
        shiprocketStatus: o.shiprocket_status,
        shipmentStatus: o.shipment_status,
        pickupStatus: o.pickup_status,
        pickupScheduledAt: o.pickup_scheduled_at,
        fulfillmentStatus: o.fulfillment_status,
        fulfillmentError: o.fulfillment_error,
        fulfillmentOperation: o.fulfillment_operation,
        attempts: o.fulfillment_attempts || 0,
        syncedAt: o.synced_at,
        lastTrackingUpdate: o.last_tracking_update,
      },
      scans: (scans || []).map((s: any) => ({ label: s.status_label, activity: s.activity, location: s.location, at: s.event_time || s.raw_time })),
      emails: (emails || []).map((e: any) => ({ id: e.id, template: e.template, status: e.status, attempts: e.attempts, error: e.last_error, sentAt: e.sent_at, createdAt: e.created_at })),
      webhooks: (hooks || []).map((h: any) => ({ status: h.status, label: h.status_label, receivedAt: h.received_at, error: h.error })),
    },
  };
}
