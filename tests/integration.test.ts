// Integration tests for the order -> Shiprocket -> tracking -> email pipeline.
// The real service code runs against an in-memory Supabase stand-in and a mocked fetch
// (Shiprocket + Resend), so duplicate prevention, retries and failure handling are exercised end to end.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeDb } from "./helpers/fakeSupabase";

let db: FakeDb;
const background: Promise<unknown>[] = [];

vi.mock("@/lib/supabase", () => ({ createAdminClient: () => db }));
vi.mock("@/lib/server/background", () => ({
  runInBackground: (_label: string, work: () => Promise<unknown>) => {
    const p = work().catch(() => undefined);
    background.push(p);
    return p;
  },
}));
vi.mock("@/lib/server/maintenance", () => ({ runMaintenanceThrottled: () => undefined, runMaintenance: async () => ({}) }));

import { runFulfillment, cancelShiprocketOrder } from "@/lib/services/shipping/fulfillment";
import { __resetShiprocketToken } from "@/lib/services/shipping/shiprocket";
import { processShippingWebhookEvent, webhookDedupeKey, snapshotFromWebhook } from "@/lib/services/shipping/tracking";
import { notifyOrder } from "@/lib/services/email/order-notifications";
import { deliverEmailEvent, retryDueEmails } from "@/lib/services/email";
import { confirmOnlinePayment, recordFailedPayment } from "@/lib/orders/payment";

// ─── fake Shiprocket + Resend ────────────────────────────────────────────────
type Mode = { createNetworkErrorAfterCreate?: boolean; createStatus?: number; awbFail?: boolean; resendFail?: boolean };
let mode: Mode;
let calls: Record<string, number>;
let srOrders: { id: number; channel_order_id: string; shipmentId: number }[];
let resendKeys: string[];

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = String(input);
  const bump = (k: string) => (calls[k] = (calls[k] || 0) + 1);
  if (url.startsWith("https://api.resend.com/emails")) {
    bump("resend");
    resendKeys.push(String((init?.headers as any)?.["Idempotency-Key"] || ""));
    return mode.resendFail ? json({ message: "Internal error" }, 500) : json({ id: `email_${calls.resend}` });
  }
  const path = url.replace("https://sr.test/v1/external/", "");
  if (path === "auth/login") return bump("login"), json({ token: "jwt-token" });
  if (path === "orders/create/adhoc") {
    bump("create");
    if (mode.createStatus) return json({ message: "Invalid data", errors: { billing_pincode: ["The billing pincode is invalid."] } }, mode.createStatus);
    const body = JSON.parse(String(init?.body));
    const o = { id: 5000 + srOrders.length + 1, channel_order_id: body.order_id, shipmentId: 9000 + srOrders.length + 1 };
    srOrders.push(o);
    if (mode.createNetworkErrorAfterCreate) throw new TypeError("fetch failed"); // created on Shiprocket, response lost
    return json({ order_id: o.id, shipment_id: o.shipmentId, status: "NEW", status_code: 1 });
  }
  if (path.startsWith("orders?search=")) {
    bump("search");
    const ref = decodeURIComponent(path.split("search=")[1].split("&")[0]);
    return json({ data: srOrders.filter((o) => o.channel_order_id === ref).map((o) => ({ id: o.id, channel_order_id: o.channel_order_id, status: "NEW", shipments: [{ id: o.shipmentId }] })) });
  }
  if (path === "courier/assign/awb") {
    bump("awb");
    if (mode.awbFail) return json({ awb_assign_status: 0, response: { data: { awb_assign_error: "Wallet balance insufficient" } } });
    return json({ awb_assign_status: 1, response: { data: { awb_code: "AWB777", courier_name: "Delhivery", courier_company_id: 5 } } });
  }
  if (path === "courier/generate/pickup") return bump("pickup"), json({ pickup_status: 1, response: { pickup_scheduled_date: "2026-10-08 10:00:00" } });
  if (path === "orders/cancel") return bump("cancel"), json({ message: "Cancelled" });
  throw new Error(`unexpected fetch ${url}`);
}

const ORDER_ID = "11111111-1111-4111-8111-111111111111";
function seedOrder(over: Record<string, any> = {}) {
  db.table("orders").push({
    id: ORDER_ID,
    order_number: "RVN-2026-482913",
    user_id: "user-1",
    created_at: "2026-10-07T06:30:00.000Z",
    updated_at: "2026-10-07T06:30:00.000Z",
    customer_name: "Lakshmi Devi",
    customer_email: "lakshmi@example.com",
    customer_phone: "9876543210",
    shipping_address: { name: "Lakshmi Devi", phone: "9876543210", houseNumber: "12-3", streetAddress: "MG Road", locality: "Begumpet", city: "Hyderabad", state: "Telangana", pincode: "500016" },
    subtotal: 8499,
    discount_amount: 0,
    shipping_fee: 0,
    total_amount: 8499,
    gift_wrap: false,
    payment_method: "razorpay",
    payment_status: "paid",
    order_status: "confirmed",
    fulfillment_status: "pending",
    fulfillment_attempts: 0,
    fulfillment_locked_until: null,
    tracking_number: null,
    courier_partner: null,
    ...over,
  });
  db.table("order_items").push({ id: "it-1", order_id: ORDER_ID, product_name: "Rani Pink Silk", sku: "RAV-SLK-010", price: 8499, quantity: 1 });
}
const order = () => db.table("orders").find((o) => o.id === ORDER_ID)!;
const emails = (template?: string) => db.table("email_events").filter((e) => !template || e.template === template);
const flush = async () => {
  while (background.length) await background.shift();
};

beforeEach(() => {
  db = new FakeDb();
  mode = {};
  calls = {};
  srOrders = [];
  resendKeys = [];
  background.length = 0;
  __resetShiprocketToken();
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
  Object.assign(process.env, {
    SHIPROCKET_EMAIL: "api@example.com",
    SHIPROCKET_PASSWORD: "pw",
    SHIPROCKET_API_BASE_URL: "https://sr.test/v1/external",
    SHIPROCKET_PICKUP_LOCATION: "Primary",
    SHIPROCKET_AUTO_ASSIGN_AWB: "true",
    SHIPROCKET_AUTO_PICKUP: "true",
    RESEND_API_KEY: "re_test_key_123",
    RESEND_FROM_EMAIL: "orders@raveenasarees.com",
  });
});
afterEach(() => vi.unstubAllGlobals());

describe("Shiprocket fulfillment", () => {
  it("creates order, assigns AWB and schedules pickup using the Raveena order number", async () => {
    seedOrder();
    const r = await runFulfillment(ORDER_ID);
    expect(r.ok).toBe(true);
    expect(calls).toMatchObject({ login: 1, create: 1, awb: 1, pickup: 1 });
    const o = order();
    expect(o.shiprocket_order_id).toBe(5001);
    expect(o.shiprocket_shipment_id).toBe(9001);
    expect(o.shiprocket_awb).toBe("AWB777");
    expect(o.tracking_number).toBe("AWB777");
    expect(o.courier_partner).toBe("Delhivery");
    expect(o.tracking_url).toBe("https://shiprocket.co/tracking/AWB777");
    expect(o.fulfillment_status).toBe("pickup_scheduled");
    expect(o.pickup_status).toBe("scheduled");
    expect(o.fulfillment_locked_until).toBeNull();
    expect(srOrders[0].channel_order_id).toBe("RVN-2026-482913");
    expect(emails("shipment_created")).toHaveLength(1);
    expect(emails("tracking_available")).toHaveLength(1);
  });

  it("never creates a second Shiprocket order when run again or concurrently", async () => {
    seedOrder();
    await Promise.all([runFulfillment(ORDER_ID), runFulfillment(ORDER_ID), runFulfillment(ORDER_ID)]);
    await runFulfillment(ORDER_ID);
    await runFulfillment(ORDER_ID, { force: true });
    expect(calls.create).toBe(1);
    expect(calls.awb).toBe(1);
    expect(calls.pickup).toBe(1);
    expect(srOrders).toHaveLength(1);
    expect(emails("tracking_available")).toHaveLength(1);
  });

  it("adopts the existing Shiprocket order after a lost response instead of duplicating it", async () => {
    seedOrder();
    mode.createNetworkErrorAfterCreate = true;
    const first = await runFulfillment(ORDER_ID);
    expect(first.ok).toBe(false);
    expect(order().fulfillment_status).toBe("failed");
    expect(order().fulfillment_operation).toBe("create_order");
    expect(order().fulfillment_error).toMatch(/Network error/);
    expect(order().fulfillment_next_retry_at).toBeTruthy(); // automatic retry scheduled

    mode.createNetworkErrorAfterCreate = false;
    const retry = await runFulfillment(ORDER_ID, { force: true });
    expect(retry.ok).toBe(true);
    expect(calls.search).toBe(1);
    expect(calls.create).toBe(1); // still exactly one create call
    expect(srOrders).toHaveLength(1);
    expect(order().shiprocket_order_id).toBe(5001);
    expect(order().fulfillment_status).toBe("pickup_scheduled");
  });

  it("records an AWB failure and resumes from that step on retry", async () => {
    seedOrder();
    mode.awbFail = true;
    const r = await runFulfillment(ORDER_ID);
    expect(r.ok).toBe(false);
    expect(order().shiprocket_order_id).toBe(5001);
    expect(order().fulfillment_operation).toBe("assign_awb");
    expect(order().fulfillment_error).toMatch(/Wallet balance insufficient/);

    mode.awbFail = false;
    const retry = await runFulfillment(ORDER_ID, { force: true });
    expect(retry.ok).toBe(true);
    expect(calls.create).toBe(1);
    expect(order().shiprocket_awb).toBe("AWB777");
  });

  it("does not auto-retry validation errors (needs a human fix)", async () => {
    seedOrder();
    mode.createStatus = 422;
    const r = await runFulfillment(ORDER_ID);
    expect(r.ok).toBe(false);
    expect(order().fulfillment_error).toMatch(/billing_pincode/);
    expect(order().fulfillment_next_retry_at).toBeNull();
  });

  it("reports a clear error when Shiprocket is not configured", async () => {
    seedOrder();
    delete process.env.SHIPROCKET_PICKUP_LOCATION;
    const r = await runFulfillment(ORDER_ID);
    expect(r.ok).toBe(false);
    expect(order().fulfillment_status).toBe("failed");
    expect(order().fulfillment_error).toMatch(/SHIPROCKET_PICKUP_LOCATION/);
    expect(calls.create).toBeUndefined();
  });

  it("does not ship unpaid online orders", async () => {
    seedOrder({ payment_status: "pending", order_status: "pending", fulfillment_status: null });
    const r = await runFulfillment(ORDER_ID);
    expect(r.ok).toBe(false);
    expect(calls.create).toBeUndefined();
  });

  it("refuses to cancel in Shiprocket after pickup, cancels before pickup", async () => {
    seedOrder({ shiprocket_order_id: 5001, shipment_status: "in_transit" });
    expect((await cancelShiprocketOrder(ORDER_ID)).ok).toBe(false);
    order().shipment_status = "awb_assigned";
    expect((await cancelShiprocketOrder(ORDER_ID)).ok).toBe(true);
    expect(order().fulfillment_status).toBe("cancelled");
    expect(calls.cancel).toBe(1);
  });
});

describe("Shiprocket webhooks", () => {
  const event = (status: string, extra: Record<string, any> = {}) => ({
    awb: "AWB777",
    courier_name: "Delhivery",
    current_status: status,
    current_timestamp: `07 10 2026 ${String(10 + Object.keys(extra).length).padStart(2, "0")}:00:00`,
    order_id: "RVN-2026-482913",
    sr_order_id: 5001,
    scans: [{ date: "2026-10-07 10:00:00", activity: status, location: "Hyderabad", "sr-status-label": status }],
    ...extra,
  });
  const store = (body: any) => {
    const key = webhookDedupeKey(body);
    if (db.table("shipping_webhook_events").some((e) => e.dedupe_key === key)) return null; // duplicate delivery
    const row = { id: crypto.randomUUID(), dedupe_key: key, payload: body, status: "received", attempts: 0, received_at: new Date().toISOString(), awb: snapshotFromWebhook(body).awb };
    db.table("shipping_webhook_events").push(row);
    return row.id;
  };

  it("updates the order once, ignores duplicates and never moves backwards", async () => {
    seedOrder({ shiprocket_order_id: 5001, shiprocket_awb: "AWB777", tracking_number: "AWB777", fulfillment_status: "pickup_scheduled" });

    const inTransit = event("IN TRANSIT");
    const id1 = store(inTransit)!;
    await processShippingWebhookEvent(id1);
    await processShippingWebhookEvent(id1); // processing the same stored event twice
    expect(store(inTransit)).toBeNull(); // identical redelivery is deduplicated at the door
    expect(order().order_status).toBe("shipped");
    expect(order().shipment_status).toBe("in_transit");
    expect(emails("shipment_shipped")).toHaveLength(1);
    expect(db.table("shipment_tracking_events")).toHaveLength(1);
    expect(db.table("order_status_history").filter((h) => h.new_status === "shipped")).toHaveLength(1);

    await processShippingWebhookEvent(store(event("OUT FOR DELIVERY", { a: 1 }))!);
    await processShippingWebhookEvent(store(event("DELIVERED", { a: 1, b: 2 }))!);
    expect(order().order_status).toBe("delivered");
    expect(emails("out_for_delivery")).toHaveLength(1);
    expect(emails("delivered")).toHaveLength(1);

    // A late, out-of-order scan must not move a delivered order back
    await processShippingWebhookEvent(store(event("IN TRANSIT", { late: true, a: 1, b: 2, c: 3 }))!);
    expect(order().order_status).toBe("delivered");
    expect(emails("shipment_shipped")).toHaveLength(1);
    expect(db.table("shipping_webhook_events").every((e) => e.status === "processed")).toBe(true);
  });

  it("marks COD orders paid on delivery and ignores events for unknown orders", async () => {
    seedOrder({ payment_method: "cod", payment_status: "pending", order_status: "out_for_delivery", shiprocket_awb: "AWB777" });
    await processShippingWebhookEvent(store(event("DELIVERED"))!);
    expect(order().order_status).toBe("delivered");
    expect(order().payment_status).toBe("paid");

    const id = store({ ...event("IN TRANSIT"), awb: "OTHER999", order_id: "RVN-2026-000000", sr_order_id: 1 })!;
    await processShippingWebhookEvent(id);
    expect(db.table("shipping_webhook_events").find((e) => e.id === id)!.status).toBe("ignored");
  });
});

describe("emails", () => {
  it("sends each logical email once, with a Resend idempotency key", async () => {
    seedOrder();
    await notifyOrder("order_confirmation", ORDER_ID);
    await notifyOrder("order_confirmation", ORDER_ID);
    await Promise.all([notifyOrder("delivered", ORDER_ID), notifyOrder("delivered", ORDER_ID)]);
    expect(calls.resend).toBe(2);
    expect(emails()).toHaveLength(2);
    expect(resendKeys[0]).toBe(`rvn-order_confirmation:${ORDER_ID}`);
    expect(emails("order_confirmation")[0].status).toBe("sent");
  });

  it("records failures without touching the order, and an admin retry sends it", async () => {
    seedOrder();
    mode.resendFail = true;
    await notifyOrder("order_confirmation", ORDER_ID);
    const ev = emails("order_confirmation")[0];
    expect(ev.status).toBe("failed");
    expect(ev.last_error).toMatch(/Resend 500/);
    expect(ev.next_retry_at).toBeTruthy();
    expect(order().order_status).toBe("confirmed"); // order unaffected

    mode.resendFail = false;
    const r = await deliverEmailEvent(ev.id, { force: true });
    expect(r.ok).toBe(true);
    expect(emails("order_confirmation")[0].status).toBe("sent");
  });
});

describe("payments", () => {
  it("confirms a payment exactly once even when the browser and webhook race", async () => {
    seedOrder({ payment_status: "pending", order_status: "pending", fulfillment_status: null });
    const args = { orderNumber: "RVN-2026-482913", razorpayOrderId: "order_X", razorpayPaymentId: "pay_X", amountRupees: 8499 };
    const results = await Promise.all([
      confirmOnlinePayment({ ...args, source: "client" }),
      confirmOnlinePayment({ ...args, source: "webhook" }),
      confirmOnlinePayment({ ...args, source: "webhook" }),
    ]);
    await flush();
    expect(results.filter((r) => r.ok && !r.alreadyPaid)).toHaveLength(1);
    expect(order().payment_status).toBe("paid");
    expect(order().order_status).toBe("confirmed");
    expect(db.table("payments")).toHaveLength(1);
    expect(emails("order_confirmation")).toHaveLength(1);
    expect(calls.create).toBe(1); // pushed to Shiprocket once
    expect(order().fulfillment_status).toBe("pickup_scheduled");
  });

  it("delays the payment-failed email and skips it if the customer pays meanwhile", async () => {
    seedOrder({ payment_status: "pending", order_status: "pending", fulfillment_status: null });
    await recordFailedPayment({ orderNumber: "RVN-2026-482913", razorpayPaymentId: "pay_FAIL", razorpayOrderId: "order_X" });
    const ev = emails("payment_failed")[0];
    expect(ev.status).toBe("pending");
    expect(calls.resend).toBeUndefined(); // not sent immediately

    await confirmOnlinePayment({ orderNumber: "RVN-2026-482913", razorpayOrderId: "order_X", razorpayPaymentId: "pay_OK", amountRupees: 8499, source: "client" });
    await flush();
    ev.next_retry_at = new Date(Date.now() - 1000).toISOString(); // time passes
    await retryDueEmails();
    expect(emails("payment_failed")[0].status).toBe("skipped");
    expect(emails("order_confirmation")[0].status).toBe("sent");
  });
});
