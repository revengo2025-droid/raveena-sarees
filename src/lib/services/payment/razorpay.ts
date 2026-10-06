import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const isRazorpayLive = Boolean(
  keyId && keySecret && !keyId.includes("xxxxxxxxx") && !keySecret.includes("your-razorpay")
);

let razorpayClient: Razorpay | null = null;
if (isRazorpayLive) {
  razorpayClient = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

export interface CreateOrderParams {
  amountInRupees: number;
  orderNumber: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
  isMock?: boolean;
}

export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const amountInPaise = Math.round(params.amountInRupees * 100);

  if (razorpayClient) {
    try {
      const order = await razorpayClient.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: params.receipt || params.orderNumber,
        notes: params.notes || { orderNumber: params.orderNumber },
      });
      return {
        id: order.id,
        amount: order.amount as number,
        currency: order.currency,
        receipt: order.receipt as string,
        status: order.status,
      };
    } catch (err: any) {
      console.error("Razorpay order creation error:", err);
      throw new Error(`Razorpay Error: ${err.message || "Could not create order"}`);
    }
  }

  // Graceful fallback for development / testing without live keys
  const mockOrderId = `order_${Date.now()}_mock`;
  return {
    id: mockOrderId,
    amount: amountInPaise,
    currency: "INR",
    receipt: params.receipt || params.orderNumber,
    status: "created",
    isMock: true,
  };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!isRazorpayLive && process.env.NODE_ENV !== "production") {
    // Development-only simulation mode: never accepted in production
    if (signature.startsWith("mock_sig_") || orderId.includes("mock")) {
      return true;
    }
  }

  if (!keySecret) return false;

  const generatedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const a = Buffer.from(generatedSignature);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function verifyWebhookSignature(payloadString: string, signature: string): boolean {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return process.env.NODE_ENV !== "production"; // dev-only fallback

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadString)
    .digest("hex");

  const a = Buffer.from(expectedSignature);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Fetches a Razorpay order so callers can confirm it belongs to the expected receipt/amount. */
export async function fetchRazorpayOrder(
  razorpayOrderId: string
): Promise<{ receipt: string; amount: number } | null> {
  if (!razorpayClient) return null;
  try {
    const order = await razorpayClient.orders.fetch(razorpayOrderId);
    return { receipt: String(order.receipt ?? ""), amount: Number(order.amount) };
  } catch (err) {
    console.error("Razorpay order fetch error:", err);
    return null;
  }
}
