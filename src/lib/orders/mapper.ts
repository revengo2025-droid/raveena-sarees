import type { Order, OrderStatus, PaymentMethod, SavedAddress } from "@/lib/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Processing",
  packed: "Packed",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  returned: "Returned",
  refund_processing: "Refund processing",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status.replace(/_/g, " ");
}

function mapAddress(raw: any, fallbackName: string, fallbackPhone: string): SavedAddress {
  const a = raw || {};
  const type = a.addressType === "office" ? "Office" : a.addressType === "other" ? "Other" : "Home";
  return {
    id: "shipping",
    name: a.name || fallbackName,
    phone: a.phone || fallbackPhone,
    houseNumber: a.houseNumber || undefined,
    street: a.streetAddress || a.street || "",
    locality: a.locality || undefined,
    landmark: a.landmark || undefined,
    city: a.city || "",
    state: a.state || "",
    pincode: a.pincode || "",
    isDefault: false,
    type,
  };
}

/** Maps an `orders` row (with `order_items`) to the client Order shape. Nothing is invented. */
export function mapOrderRow(row: any): Order {
  const items = (row.order_items || []).map((i: any) => ({
    productId: i.product_id || "",
    productName: i.product_name,
    sku: i.sku,
    selectedColor: i.selected_color || "",
    price: Number(i.price),
    quantity: i.quantity,
    imageUrl: i.image_url || "",
  }));
  const subtotal = Number(row.subtotal);
  const discount = Number(row.discount_amount || 0);
  const shipping = Number(row.shipping_fee || 0);
  const total = Number(row.total_amount);

  return {
    id: row.id,
    orderNumber: row.order_number,
    userId: row.user_id || undefined,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: mapAddress(row.shipping_address, row.customer_name, row.customer_phone),
    items,
    subtotal,
    discountAmount: discount,
    shippingFee: shipping,
    giftWrapFee: row.gift_wrap ? Math.max(0, total - (subtotal - discount + shipping)) : 0,
    totalAmount: total,
    paymentMethod: row.payment_method as PaymentMethod,
    paymentStatus: row.payment_status,
    paymentId: row.payment_id || undefined,
    orderStatus: row.order_status as OrderStatus,
    courierPartner: row.tracking_number ? row.courier_partner || "" : "",
    trackingNumber: row.tracking_number || "",
    trackingUrl: row.tracking_url || undefined,
    giftWrap: Boolean(row.gift_wrap),
    giftMessage: row.gift_message || undefined,
    appliedCoupon: row.applied_coupon || undefined,
    createdAt: row.created_at,
    estimatedDelivery: row.estimated_delivery || "",
  };
}
