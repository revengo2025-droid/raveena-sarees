import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { queueEmail } from "./index";
import { buildOrderEmailData } from "./order-data";
import type { EmailTemplate, OrderEmailData } from "./templates";

type OrderTemplate = Exclude<EmailTemplate, "support_ticket_created" | "support_ticket_update">;

/**
 * Sends an order lifecycle email at most once per (template, order[, discriminator]).
 * Loads the current order so every value in the email is real. Never throws.
 */
export async function notifyOrder(
  template: OrderTemplate,
  orderId: string,
  opts: { discriminator?: string; extra?: Partial<OrderEmailData> } = {}
) {
  try {
    const { data: order, error } = await createAdminClient()
      .from("orders")
      .select("*, order_items (*)")
      .eq("id", orderId)
      .maybeSingle();
    if (error || !order) {
      console.error(`[email] order ${orderId} not found for ${template}`);
      return { status: "error" as const };
    }
    return await queueEmail({
      eventKey: `${template}:${order.id}${opts.discriminator ? `:${opts.discriminator}` : ""}`,
      template,
      recipient: order.customer_email,
      orderId: order.id,
      data: buildOrderEmailData(order, opts.extra),
    });
  } catch (err: any) {
    console.error(`[email] notifyOrder ${template} failed:`, err?.message || err);
    return { status: "error" as const };
  }
}

/** Which customer email (if any) a new order status should trigger. */
export const STATUS_EMAIL: Partial<Record<string, OrderTemplate>> = {
  processing: "order_processing",
  shipped: "shipment_shipped",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  cancelled: "order_cancelled",
  return_requested: "return_requested",
  refund_processing: "refund_initiated",
  refunded: "refund_completed",
};
