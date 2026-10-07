import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { notifyOrder } from "@/lib/services/email/order-notifications";
import { queueEmail } from "@/lib/services/email";
import { buildOrderEmailData } from "@/lib/services/email/order-data";
import { runFulfillment } from "@/lib/services/shipping/fulfillment";
import { runInBackground } from "@/lib/server/background";

/**
 * After an order is confirmed (online payment captured, or COD placed): confirmation email and
 * Shiprocket fulfillment, after the response. Both are idempotent and persisted, so a crash is
 * picked up by the maintenance job.
 */
export function startPostConfirmation(orderId: string) {
  runInBackground(`post-confirm:${orderId}`, async () => {
    await notifyOrder("order_confirmation", orderId);
    await runFulfillment(orderId, { trigger: "confirmation" });
  });
}

/**
 * Marks an order paid exactly once. The client verification and the Razorpay webhook can both call
 * this (in any order, even concurrently): only the first caller wins the compare-and-swap and runs
 * the follow-up work; the others return `alreadyPaid`.
 * Callers MUST have verified the Razorpay signature and the amount/receipt before calling.
 */
export async function confirmOnlinePayment(input: {
  orderNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature?: string | null;
  amountRupees: number;
  source: "client" | "webhook";
  payload?: unknown;
}): Promise<{ ok: boolean; alreadyPaid?: boolean; orderId?: string; error?: string }> {
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_status, payment_status, total_amount")
    .eq("order_number", input.orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found" };
  if (order.payment_status === "paid") return { ok: true, alreadyPaid: true, orderId: order.id };

  const confirmNow = order.order_status === "pending";
  const { data: won } = await db
    .from("orders")
    .update({
      payment_status: "paid",
      payment_id: input.razorpayPaymentId,
      ...(confirmNow ? { order_status: "confirmed", fulfillment_status: "pending" } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("payment_status", order.payment_status) // compare-and-swap: losers update 0 rows
    .select("id")
    .maybeSingle();
  if (!won) return { ok: true, alreadyPaid: true, orderId: order.id };

  // Payment record: one row per Razorpay payment (unique index), so a repeat is ignored
  await db.from("payments").upsert(
    {
      order_id: order.id,
      payment_provider: "razorpay",
      transaction_id: input.razorpayPaymentId,
      razorpay_order_id: input.razorpayOrderId,
      razorpay_payment_id: input.razorpayPaymentId,
      razorpay_signature: input.razorpaySignature || null,
      amount: input.amountRupees,
      currency: "INR",
      status: "captured",
      response_payload: (input.payload as any) ?? null,
    },
    { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
  );

  await db.from("order_status_history").insert({
    order_id: order.id,
    previous_status: order.order_status,
    new_status: confirmNow ? "confirmed" : order.order_status,
    notes: `Razorpay payment captured (${input.source}): ${input.razorpayPaymentId}`,
  });

  if (confirmNow) {
    startPostConfirmation(order.id);
  } else {
    // Paid after the order was cancelled/changed: never auto-ship; the store must review and refund if needed
    console.warn(`[payment] ${input.orderNumber} paid while order_status=${order.order_status}; not auto-fulfilled`);
  }
  return { ok: true, orderId: order.id };
}

/**
 * Records a failed online payment attempt. The order stays open (the customer can retry in the same
 * checkout), and the "payment failed" email is delayed and skipped if the order gets paid meanwhile.
 */
export async function recordFailedPayment(input: { orderNumber: string; razorpayOrderId?: string; razorpayPaymentId?: string; reason?: string; payload?: unknown }) {
  const db = createAdminClient();
  const { data: order } = await db.from("orders").select("*, order_items (*)").eq("order_number", input.orderNumber).maybeSingle();
  if (!order || order.payment_status === "paid") return;

  if (input.razorpayPaymentId) {
    await db.from("payments").upsert(
      {
        order_id: order.id,
        payment_provider: "razorpay",
        transaction_id: input.razorpayPaymentId,
        razorpay_order_id: input.razorpayOrderId || null,
        razorpay_payment_id: input.razorpayPaymentId,
        amount: Number(order.total_amount),
        currency: "INR",
        status: "failed",
        response_payload: (input.payload as any) ?? null,
      },
      { onConflict: "razorpay_payment_id", ignoreDuplicates: true }
    );
  }
  await db.from("orders").update({ payment_status: "failed", updated_at: new Date().toISOString() }).eq("id", order.id).eq("payment_status", "pending");

  await queueEmail({
    eventKey: `payment_failed:${order.id}`,
    template: "payment_failed",
    recipient: order.customer_email,
    orderId: order.id,
    data: buildOrderEmailData({ ...order, payment_status: "failed" }),
    sendAfter: new Date(Date.now() + 20 * 60_000), // give the customer time to retry first
  });
}
