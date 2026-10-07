import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { notifyOrder, STATUS_EMAIL } from "@/lib/services/email/order-notifications";

export const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered",
  "cancelled", "return_requested", "returned", "refund_processing", "refunded",
] as const;

/**
 * Moves an order to a new status exactly once (compare-and-swap on the current status), records
 * the history entry and queues the matching customer email (deduplicated per order/status).
 * Returns false when the order had already moved on (concurrent update / duplicate event).
 */
export async function transitionOrderStatus(
  orderId: string,
  from: string,
  to: string,
  opts: { notes?: string; changedBy?: string | null; extraUpdate?: Record<string, unknown>; emailDiscriminator?: string } = {}
): Promise<boolean> {
  if (from === to) return false;
  const db = createAdminClient();
  const { data: updated, error } = await db
    .from("orders")
    .update({ order_status: to, updated_at: new Date().toISOString(), ...(opts.extraUpdate || {}) })
    .eq("id", orderId)
    .eq("order_status", from)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) return false;

  await db.from("order_status_history").insert({
    order_id: orderId,
    previous_status: from,
    new_status: to,
    notes: (opts.notes || `Status changed from ${from} to ${to}`).slice(0, 500),
    changed_by: opts.changedBy || null,
  });

  const template = STATUS_EMAIL[to];
  if (template) {
    await notifyOrder(template, orderId, {
      discriminator: opts.emailDiscriminator ?? (to === "out_for_delivery" ? new Date().toISOString().slice(0, 10) : undefined),
    });
  }
  return true;
}
