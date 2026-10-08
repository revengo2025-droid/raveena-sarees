import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/payment/razorpay";
import { createAdminClient } from "@/lib/supabase";
import { confirmOnlinePayment, recordFailedPayment } from "@/lib/orders/payment";
import { transitionOrderStatus } from "@/lib/orders/transitions";
import { runMaintenanceThrottled } from "@/lib/server/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ORDER_NUMBER_RE = /^[A-Za-z0-9-]{4,50}$/;

/**
 * Razorpay webhook (configure in Razorpay Dashboard -> Webhooks with RAZORPAY_WEBHOOK_SECRET).
 * Events: payment.captured / order.paid -> confirm; payment.failed -> record + delayed email;
 * refund.processed -> mark refunded. Every handler is idempotent, so Razorpay retries are safe.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (rawBody.length > 512 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const signature = req.headers.get("x-razorpay-signature") || "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[razorpay-webhook] invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const payment = event?.payload?.payment?.entity;
    const orderNumber: string | undefined = payment?.notes?.orderNumber;
    const validRef = typeof orderNumber === "string" && ORDER_NUMBER_RE.test(orderNumber);

    if ((event.event === "order.paid" || event.event === "payment.captured") && payment && validRef) {
      const db = createAdminClient();
      const { data: order } = await db.from("orders").select("total_amount").eq("order_number", orderNumber).maybeSingle();
      if (!order) {
        console.warn(`[razorpay-webhook] unknown order ${orderNumber}`);
      } else if (Number(payment.amount) !== Math.round(Number(order.total_amount) * 100) || (payment.currency && payment.currency !== "INR")) {
        console.warn(`[security] Razorpay webhook amount/currency mismatch for ${orderNumber}`);
      } else {
        await confirmOnlinePayment({
          orderNumber: orderNumber!,
          razorpayOrderId: String(payment.order_id || ""),
          razorpayPaymentId: String(payment.id || ""),
          amountRupees: Number(payment.amount) / 100,
          source: "webhook",
          payload: { event: event.event, payment_id: payment.id, method: payment.method, status: payment.status },
        });
      }
    } else if (event.event === "payment.failed" && payment && validRef) {
      await recordFailedPayment({
        orderNumber: orderNumber!,
        razorpayOrderId: payment.order_id,
        razorpayPaymentId: payment.id,
        reason: payment.error_description,
        payload: { event: event.event, payment_id: payment.id, error_code: payment.error_code, error_reason: payment.error_reason },
      });
    } else if (event.event === "refund.processed") {
      const refund = event?.payload?.refund?.entity;
      const paymentId = refund?.payment_id;
      if (typeof paymentId === "string" && /^[A-Za-z0-9_]{1,64}$/.test(paymentId)) {
        const db = createAdminClient();
        const { data: order } = await db.from("orders").select("id, order_status").eq("payment_id", paymentId).maybeSingle();
        if (order) {
          await db.from("orders").update({ payment_status: "refunded" }).eq("id", order.id);
          if (order.order_status === "refund_processing") {
            await transitionOrderStatus(order.id, "refund_processing", "refunded", {
              notes: `Razorpay refund processed: ${refund.id}`,
              extraUpdate: {},
            });
          }
        }
      }
    }

    runMaintenanceThrottled();
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[razorpay-webhook] processing error:", err?.message || err);
    // 500 lets Razorpay retry; all handlers above are idempotent. No internal details are returned.
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
