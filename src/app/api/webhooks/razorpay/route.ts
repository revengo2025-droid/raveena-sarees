import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/services/payment/razorpay";
import { createAdminClient } from "@/lib/supabase";
import { getEmailService } from "@/lib/services/email";
import { getShippingService } from "@/lib/services/shipping";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    const isValid = verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const adminClient = createAdminClient();

    if (event.event === "order.paid" || event.event === "payment.captured") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;
      const orderNumber = paymentEntity?.notes?.orderNumber;

      if (orderNumber) {
        // Find order
        const { data: order } = await adminClient
          .from("orders")
          .select("*")
          .eq("order_number", orderNumber)
          .single();

        const amountMatches =
          order && Number(paymentEntity?.amount) === Math.round(Number(order.total_amount) * 100);
        if (order && !amountMatches) {
          console.warn(`[security] Webhook amount mismatch for ${orderNumber}`);
        }
        if (order && amountMatches && order.payment_status !== "paid") {
          await adminClient
            .from("orders")
            .update({
              payment_status: "paid",
              order_status: "confirmed",
              payment_id: paymentId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", order.id);

          // Record payment
          await adminClient.from("payments").insert({
            order_id: order.id,
            payment_provider: "razorpay",
            transaction_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_payment_id: paymentId,
            amount: Number(paymentEntity.amount) / 100,
            currency: paymentEntity.currency || "INR",
            status: "captured",
            response_payload: event,
          });

          // Send confirmation email
          const emailService = getEmailService();
          await emailService.sendOrderConfirmation(order);

          // Create shipment
          const shippingService = getShippingService();
          const addr = order.shipping_address as any;
          const shipment = await shippingService.createShipment({
            orderNumber: order.order_number,
            recipientName: order.customer_name,
            recipientPhone: order.customer_phone,
            streetAddress: addr?.streetAddress || "",
            city: addr?.city || "Hyderabad",
            state: addr?.state || "Telangana",
            pincode: addr?.pincode || "500001",
            itemCount: 1,
          });

          if (shipment.success) {
            await adminClient
              .from("orders")
              .update({
                courier_partner: shipment.courierPartner,
                tracking_number: shipment.trackingNumber,
                tracking_url: shipment.trackingUrl,
                estimated_delivery: shipment.estimatedDeliveryDate,
              })
              .eq("id", order.id);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
