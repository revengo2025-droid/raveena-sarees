import type { OrderEmailData } from "./templates";

/** Builds the email snapshot from a real `orders` row (with `order_items`). Nothing is invented. */
export function buildOrderEmailData(order: any, extra: Partial<OrderEmailData> = {}): OrderEmailData {
  const a = (order.shipping_address || {}) as Record<string, string | undefined>;
  const subtotal = Number(order.subtotal || 0);
  const discount = Number(order.discount_amount || 0);
  const shippingFee = Number(order.shipping_fee || 0);
  const total = Number(order.total_amount || 0);
  const giftWrapFee = order.gift_wrap ? Math.max(0, Math.round((total - (subtotal - discount + shippingFee)) * 100) / 100) : 0;

  const addressLines = [
    a.name || order.customer_name,
    [a.houseNumber, a.streetAddress || a.street].filter(Boolean).join(", "),
    [a.locality, a.landmark ? `Near ${a.landmark}` : ""].filter(Boolean).join(", "),
    [a.city, a.state].filter(Boolean).join(", ") + (a.pincode ? ` - ${a.pincode}` : ""),
    a.phone || order.customer_phone ? `Phone: ${a.phone || order.customer_phone}` : "",
  ].filter((l) => l && l.trim());

  return {
    customerName: order.customer_name || "",
    orderNumber: order.order_number,
    orderDate: order.created_at,
    items: (order.order_items || []).map((i: any) => ({
      name: i.product_name,
      sku: i.sku || undefined,
      color: i.selected_color || undefined,
      quantity: Number(i.quantity || 1),
      unitPrice: Number(i.price || 0),
    })),
    subtotal,
    shippingFee,
    discount,
    giftWrapFee,
    total,
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    addressLines,
    courierName: order.tracking_number ? order.courier_partner || null : null,
    awb: order.tracking_number || null,
    trackingUrl: order.tracking_url || null,
    estimatedDelivery: order.estimated_delivery || null,
    ...extra,
  };
}
