import { describe, expect, it } from "vitest";
import { postLoginPath, safeRedirectPath, isStaffRole } from "@/lib/auth/roles";
import { normalizeShipmentStatus, orderStatusForShipment, parseShiprocketTime } from "@/lib/services/shipping/status";
import { EMAIL_TEMPLATES, renderEmail, type OrderEmailData } from "@/lib/services/email/templates";
import { buildShiprocketOrderPayload, isOrderShippable } from "@/lib/services/shipping/fulfillment";
import { snapshotFromWebhook, webhookDedupeKey } from "@/lib/services/shipping/tracking";
import { isValidShiprocketToken } from "@/lib/services/shipping/webhook-handler";
import { offerPopupSchema } from "@/lib/offers/popup";
import { orderItemInputSchema, productSchema, profileUpdateSchema } from "@/lib/validations";
import type { ShiprocketConfig } from "@/lib/services/shipping/shiprocket";

describe("auth redirects and roles", () => {
  it("sends admin and staff to the dashboard regardless of the requested page", () => {
    expect(postLoginPath("admin", "/account/orders")).toBe("/admin");
    expect(postLoginPath("staff", "/checkout")).toBe("/admin");
  });
  it("never sends a customer to /admin", () => {
    expect(postLoginPath("customer", "/admin")).toBe("/account");
    expect(postLoginPath("customer", "/admin/orders")).toBe("/account");
    expect(postLoginPath("customer", "/checkout")).toBe("/checkout");
  });
  it("blocks open redirects", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "", null, 42, "/x\u0000y"]) {
      expect(safeRedirectPath(bad, "/account")).toBe("/account");
    }
    expect(safeRedirectPath("/account/track/RVN-2026-123456", "/account")).toBe("/account/track/RVN-2026-123456");
  });
  it("only admin/staff are staff roles (metadata strings like 'Admin' are not)", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("staff")).toBe(true);
    expect(isStaffRole("customer")).toBe(false);
    expect(isStaffRole("Admin")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });
});

describe("shipment status mapping", () => {
  it("normalises Shiprocket labels", () => {
    expect(normalizeShipmentStatus("IN TRANSIT")).toBe("in_transit");
    expect(normalizeShipmentStatus("Out For Delivery")).toBe("out_for_delivery");
    expect(normalizeShipmentStatus("DELIVERED")).toBe("delivered");
    expect(normalizeShipmentStatus("RTO INITIATED")).toBe("rto");
    expect(normalizeShipmentStatus("RTO DELIVERED")).toBe("returned");
    expect(normalizeShipmentStatus("CANCELED")).toBe("cancelled");
    expect(normalizeShipmentStatus("PICKED UP")).toBe("picked_up");
    expect(normalizeShipmentStatus("UNDELIVERED")).toBe("undelivered");
    expect(normalizeShipmentStatus("SOMETHING NEW")).toBe("unknown");
    expect(normalizeShipmentStatus(null)).toBe("unknown");
  });
  it("moves orders forward only and never touches cancelled/refund states", () => {
    expect(orderStatusForShipment("in_transit", "confirmed")).toBe("shipped");
    expect(orderStatusForShipment("out_for_delivery", "shipped")).toBe("out_for_delivery");
    expect(orderStatusForShipment("delivered", "out_for_delivery")).toBe("delivered");
    expect(orderStatusForShipment("in_transit", "delivered")).toBeNull(); // late scan never moves backwards
    expect(orderStatusForShipment("delivered", "cancelled")).toBeNull();
    expect(orderStatusForShipment("delivered", "refunded")).toBeNull();
    expect(orderStatusForShipment("unknown", "confirmed")).toBeNull();
    expect(orderStatusForShipment("rto", "shipped")).toBeNull();
    expect(orderStatusForShipment("returned", "shipped")).toBe("returned");
    expect(orderStatusForShipment("cancelled", "confirmed")).toBe("cancelled");
    expect(orderStatusForShipment("cancelled", "shipped")).toBeNull();
  });
  it("parses Shiprocket IST timestamps", () => {
    expect(parseShiprocketTime("2026-10-07 14:05:11")?.toISOString()).toBe("2026-10-07T08:35:11.000Z");
    expect(parseShiprocketTime("07 10 2026 14:05:11")?.toISOString()).toBe("2026-10-07T08:35:11.000Z");
    expect(parseShiprocketTime("")).toBeNull();
    expect(parseShiprocketTime("not a date")).toBeNull();
  });
});

const sampleEmailData = (over: Partial<OrderEmailData> = {}): OrderEmailData => ({
  customerName: "Lakshmi Devi",
  orderNumber: "RVN-2026-482913",
  orderDate: "2026-10-07T06:30:00.000Z",
  items: [
    { name: "Rani Pink Kanjivaram Silk", sku: "RAV-SLK-010", color: "Rani Pink", quantity: 2, unitPrice: 8499 },
    { name: "Navy Designer Saree", sku: "RAV-DSG-013", quantity: 1, unitPrice: 3999 },
  ],
  subtotal: 20997,
  shippingFee: 0,
  discount: 1000,
  giftWrapFee: 150,
  total: 20147,
  paymentMethod: "razorpay",
  paymentStatus: "paid",
  addressLines: ["Lakshmi Devi", "12-3, MG Road", "Begumpet", "Hyderabad, Telangana - 500016"],
  courierName: "Delhivery",
  awb: "19041424751540",
  trackingUrl: "https://shiprocket.co/tracking/19041424751540",
  ...over,
});

describe("email templates", () => {
  it("renders every template with real values and no placeholders", () => {
    for (const t of EMAIL_TEMPLATES) {
      const data =
        t === "support_ticket_created" || t === "support_ticket_update"
          ? { customerName: "Asha", ticketRef: "RS-1A2B3C4D", subject: "Blouse size", message: "Can I get a 40 size?" }
          : sampleEmailData();
      const r = renderEmail(t, data as any);
      expect(r.subject.length).toBeGreaterThan(5);
      expect(r.html).toContain("<!doctype html>");
      expect(r.html).not.toMatch(/undefined|NaN|\[object Object\]/);
      expect(r.text).not.toMatch(/undefined|NaN/);
    }
  });
  it("order confirmation contains the actual order details", () => {
    const r = renderEmail("order_confirmation", sampleEmailData());
    expect(r.subject).toContain("RVN-2026-482913");
    for (const s of ["RVN-2026-482913", "Rani Pink Kanjivaram Silk", "× 2", "₹20,147.00", "Begumpet", "Delhivery", "19041424751540", "Paid online"]) {
      expect(r.html.replace(/&times;/g, "×")).toContain(s);
    }
    expect(r.html).toContain("/account/track/RVN-2026-482913");
  });
  it("escapes HTML in customer-supplied values and drops non-http links", () => {
    const r = renderEmail(
      "tracking_available",
      sampleEmailData({ customerName: '<script>alert("x")</script>', courierName: "<img src=x onerror=1>", trackingUrl: "javascript:alert(1)" })
    );
    expect(r.html).not.toContain("<script>alert");
    expect(r.html).not.toContain("<img src=x");
    expect(r.html).not.toContain("javascript:alert");
    expect(r.html).toContain("&lt;img src=x onerror=1&gt;");
  });
  it("order emails describe the Razorpay payment and never mention paying on delivery", () => {
    const r = renderEmail("order_confirmation", sampleEmailData({ paymentMethod: "razorpay", paymentStatus: "paid" }));
    expect(r.html).toContain("Paid online (Razorpay)");
    expect(r.html).not.toMatch(/cash on delivery|pay when/i);
    const out = renderEmail("out_for_delivery", sampleEmailData({ paymentMethod: "razorpay", paymentStatus: "paid" }));
    expect(out.html).not.toMatch(/keep .* ready/i);
  });
});

const cfg: ShiprocketConfig = {
  email: "x",
  password: "y",
  baseUrl: "https://example.test",
  pickupLocation: "Primary",
  channelId: "12462412",
  autoAssignAwb: true,
  autoPickup: true,
  pkg: { weightKgPerItem: 0.5, lengthCm: 30, breadthCm: 25, heightCm: 5 },
};

const sampleOrder = (over: Record<string, any> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  order_number: "RVN-2026-482913",
  created_at: "2026-10-07T06:30:00.000Z",
  customer_name: "Lakshmi Devi",
  customer_email: "lakshmi@example.com",
  customer_phone: "9876543210",
  shipping_address: { name: "Lakshmi Devi", phone: "+91 98765 43210", houseNumber: "12-3", streetAddress: "MG Road", locality: "Begumpet", landmark: "Metro", city: "Hyderabad", state: "Telangana", pincode: "500016" },
  subtotal: 20997,
  discount_amount: 1000,
  shipping_fee: 0,
  total_amount: 20147,
  gift_wrap: true,
  gift_message: "Happy Diwali",
  payment_method: "razorpay",
  payment_status: "paid",
  order_status: "confirmed",
  order_items: [
    { product_name: "Rani Pink Silk", sku: "RAV-SLK-010", selected_color: "Pink", price: 8499, quantity: 2 },
    { product_name: "Rani Pink Silk", sku: "RAV-SLK-010", selected_color: "Red", price: 3999, quantity: 1 },
  ],
  ...over,
});

describe("Shiprocket order payload", () => {
  it("uses the Raveena order number as the merchant order id and matches the order total", () => {
    const p = buildShiprocketOrderPayload(sampleOrder(), cfg);
    expect(p.order_id).toBe("RVN-2026-482913");
    expect(p.payment_method).toBe("Prepaid");
    expect(p.channel_id).toBe("12462412");
    expect(p.pickup_location).toBe("Primary");
    expect(p.order_date).toBe("2026-10-07 12:00"); // IST
    expect(p.sub_total + p.shipping_charges + p.giftwrap_charges - p.total_discount).toBe(20147);
    expect(p.billing_phone).toBe("9876543210");
    expect(p.billing_customer_name).toBe("Lakshmi");
    expect(p.billing_last_name).toBe("Devi");
    expect(p.weight).toBe(1.5); // 3 sarees x 0.5 kg
    expect(p.order_items.map((i) => i.sku)).toEqual(["RAV-SLK-010", "RAV-SLK-010-2"]);
    expect(p.comment).toContain("Happy Diwali");
  });
  it("always sends shipments as prepaid", () => {
    expect(buildShiprocketOrderPayload(sampleOrder({ payment_method: "razorpay", payment_status: "paid" }), cfg).payment_method).toBe("Prepaid");
  });
  it("only ships orders whose Razorpay payment is captured", () => {
    expect(isOrderShippable(sampleOrder())).toBe(true);
    expect(isOrderShippable(sampleOrder({ payment_status: "pending", order_status: "pending" }))).toBe(false);
    expect(isOrderShippable(sampleOrder({ payment_status: "pending", order_status: "confirmed" }))).toBe(false);
    expect(isOrderShippable(sampleOrder({ order_status: "cancelled" }))).toBe(false);
  });
});

describe("Shiprocket webhook parsing and security", () => {
  const body = {
    awb: "19041424751540",
    courier_name: "Delhivery Surface",
    current_status: "IN TRANSIT",
    current_status_id: 20,
    shipment_status: "IN TRANSIT",
    shipment_status_id: 18,
    current_timestamp: "07 10 2026 11:43:52",
    order_id: "RVN-2026-482913",
    sr_order_id: 348456385,
    etd: "2026-10-10 15:40:19",
    scans: [{ date: "2026-10-07 11:59:16", activity: "Shipment picked up", location: "Hyderabad", "sr-status-label": "PICKED UP" }],
    is_return: 0,
  };
  it("parses the payload", () => {
    const s = snapshotFromWebhook(body);
    expect(s.awb).toBe("19041424751540");
    expect(s.reference).toBe("RVN-2026-482913");
    expect(s.statusLabel).toBe("IN TRANSIT");
    expect(s.scans[0].label).toBe("PICKED UP");
    expect(s.isReturn).toBe(false);
  });
  it("gives identical deliveries the same dedupe key and different events different keys", () => {
    expect(webhookDedupeKey(body)).toBe(webhookDedupeKey(JSON.parse(JSON.stringify(body))));
    expect(webhookDedupeKey(body)).not.toBe(webhookDedupeKey({ ...body, current_status: "OUT FOR DELIVERY", current_status_id: 17 }));
  });
  it("validates the x-api-key token", () => {
    expect(isValidShiprocketToken("secret-token", "secret-token")).toBe(true);
    expect(isValidShiprocketToken("wrong", "secret-token")).toBe(false);
    expect(isValidShiprocketToken(null, "secret-token")).toBe(false);
    expect(isValidShiprocketToken("anything", undefined)).toBe(false);
  });
});

describe("input validation", () => {
  it("rejects filter-injection characters in product ids/SKUs", () => {
    const ok = { productId: "saree-10", productName: "x", sku: "RAV-SLK-010", price: 1, quantity: 1 };
    expect(orderItemInputSchema.safeParse(ok).success).toBe(true);
    expect(orderItemInputSchema.safeParse({ ...ok, sku: "x),id.neq.(0" }).success).toBe(false);
    expect(orderItemInputSchema.safeParse({ ...ok, productId: "a,b" }).success).toBe(false);
    expect(orderItemInputSchema.safeParse({ ...ok, quantity: 500 }).success).toBe(false);
  });
  it("offer popup only accepts safe links", () => {
    const base = { enabled: true, title: "Festive offer", message: "10% off silk sarees this week" };
    expect(offerPopupSchema.safeParse({ ...base, ctaUrl: "/shop" }).success).toBe(true);
    expect(offerPopupSchema.safeParse({ ...base, ctaUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(offerPopupSchema.safeParse({ ...base, ctaUrl: "//evil.com" }).success).toBe(false);
    expect(offerPopupSchema.safeParse({ ...base, ctaUrl: "http://insecure.com" }).success).toBe(false);
  });

  it("validates productSchema and allows rating to be 0 for new products", () => {
    const validNewProduct = {
      sku: "RVN-123456",
      name: "Crimson Pure Kanchipuram Silk Saree",
      slug: "crimson-pure-kanchipuram-silk-saree",
      categoryName: "Kanchipuram Silk",
      categoryId: "",
      description: "Handcrafted pure silk saree with opulent golden zari border.",
      price: 24999,
      discountPrice: 0,
      stock: 5,
      fabric: "Pure Mulberry Silk",
      zariType: "Pure Gold Zari",
      weaveType: "Handloom Jacquard",
      sareeLength: "5.5 Meters",
      blouseIncluded: true,
      blouseLength: "0.80 Meters (Unstitched)",
      occasion: "Bridal / Wedding",
      careInstructions: "Dry Clean Only",
      availableColors: ["Crimson Red", "Royal Gold"],
      primaryColor: "Crimson Red",
      images: [],
      rating: 0,
      reviewCount: 0,
      isFeatured: false,
      isBestseller: false,
      isNewArrival: true,
      isActive: false,
    };

    const res = productSchema.safeParse(validNewProduct);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.rating).toBe(0);
      expect(res.data.reviewCount).toBe(0);
      expect(res.data.categoryId).toBeNull();
      expect(res.data.discountPrice).toBeNull();
    }

    // Negative rating or reviewCount should be rejected
    expect(productSchema.safeParse({ ...validNewProduct, rating: -1 }).success).toBe(false);
    expect(productSchema.safeParse({ ...validNewProduct, reviewCount: -1 }).success).toBe(false);
    expect(productSchema.safeParse({ ...validNewProduct, price: 0 }).success).toBe(false);
  });
});

describe("profile details", () => {
  it("requires a valid main mobile number", () => {
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "12345" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "9876543210" }).success).toBe(true);
  });

  it("accepts an optional, different secondary mobile number", () => {
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "9876543210", secondaryPhone: "" }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "9876543210", secondaryPhone: "9123456780" }).success).toBe(true);
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "9876543210", secondaryPhone: "9876543210" }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ fullName: "Lakshmi Devi", phone: "9876543210", secondaryPhone: "555" }).success).toBe(false);
  });
});
