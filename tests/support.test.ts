// Tests for the contact inbox, customer support tickets, admin authorization and account deletion.
// The real service code runs against an in-memory Supabase stand-in and a mocked fetch (Resend).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";
import { FakeDb } from "./helpers/fakeSupabase";

let db: FakeDb;
let session: { ok: boolean; actor?: { id: string; email: string; name: string }; error?: string };
let staffSession: { ok: boolean; userId?: string; email?: string; role?: "admin" | "staff"; status?: number; error?: string };
let ipHash: string | null;
let passwordOk: boolean;

vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => db,
  createServerClient: async () => ({ auth: { signOut: async () => ({ error: null }) } }),
}));
vi.mock("@/lib/support/context", () => ({
  requireCustomer: async () => session,
  requestIpHash: () => ipHash,
}));
// Mirrors the real requireAdmin contract: staff pass, but `adminOnly` operations also need the admin role
vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: async (opts: { adminOnly?: boolean } = {}) =>
    staffSession.ok && opts.adminOnly && staffSession.role !== "admin"
      ? { ok: false, status: 403, error: "Only an administrator can perform this action." }
      : staffSession,
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { signInWithPassword: async () => ({ error: passwordOk ? null : { message: "Invalid login credentials" } }) } }),
}));

import { submitContactMessageAction } from "@/app/actions/contact";
import { createTicketAction, getMyTicketAction, listMyTicketsAction, replyToTicketAction } from "@/app/actions/support";
import {
  deleteContactMessageAction,
  getTicketAction,
  listContactMessagesAction,
  listTicketsAction,
  replyToTicketAsStaffAction,
  setContactStatusAction,
  setTicketStatusAction,
  addTicketNoteAction,
} from "@/app/actions/admin-support";
import { deleteAccountAction } from "@/app/actions/account";
import { RATE_LIMITS } from "@/lib/support/service";
import { __resetMemoryLimiter } from "@/lib/security/rate-limit";
import { validateContact, validateTicket } from "@/lib/support/validate";

// ─── fake Resend ─────────────────────────────────────────────────────────────
let resendCalls: { to: string[]; subject: string; reply_to?: string; key: string }[];
let resendFails: boolean;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
async function fakeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (String(input).startsWith("https://api.resend.com/emails")) {
    const body = JSON.parse(String(init?.body));
    resendCalls.push({ to: body.to, subject: body.subject, reply_to: body.reply_to, key: String((init?.headers as any)?.["Idempotency-Key"]) });
    return resendFails ? json({ message: "Internal error" }, 500) : json({ id: `email_${resendCalls.length}` });
  }
  throw new Error(`unexpected fetch ${input}`);
}

const ALICE = { id: "11111111-1111-4111-8111-111111111111", email: "alice@example.com", name: "Alice Rao" };
const BOB = { id: "22222222-2222-4222-8222-222222222222", email: "bob@example.com", name: "Bob Shah" };
const ADMIN_ID = "99999999-9999-4999-8999-999999999999";
const validContact = { name: "Alice Rao", email: "Alice@Example.com", phone: "98765 43210", subject: "Saree colour", message: "Is the maroon saree available in a darker shade?", website: "", token: "tok-contact-0000000001" };

beforeEach(() => {
  __resetMemoryLimiter();
  db = new FakeDb();
  resendCalls = [];
  resendFails = false;
  ipHash = "iphash-1";
  passwordOk = true;
  session = { ok: true, actor: ALICE };
  staffSession = { ok: true, userId: ADMIN_ID, email: "admin@example.com", role: "admin" };
  process.env.RESEND_API_KEY = "re_test_key_123456";
  process.env.RESEND_FROM_EMAIL = "orders@shop.test";
  process.env.CONTACT_NOTIFY_EMAIL = "owner@shop.test";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon-test-key";
  vi.stubGlobal("fetch", fakeFetch);
  vi.spyOn(console, "error").mockImplementation((...a) => {
    if (process.env.DEBUG_TESTS) process.stderr.write(`${a.join(" ")}\n`);
  });
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

const customerOrder = (userId: string, orderNumber: string, status = "delivered") =>
  db.table("orders").push({ id: `order-${orderNumber}`, order_number: orderNumber, user_id: userId, order_status: status, payment_status: "paid", payment_method: "razorpay", total_amount: 4999, created_at: new Date().toISOString(), tracking_number: null });

// =============================================================================
describe("validation (shared by browser and server)", () => {
  it("returns an error for every bad contact field and nothing for a good form", () => {
    const bad = validateContact({ name: "A", email: "nope", phone: "123", subject: "", message: "short" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["email", "message", "name", "phone", "subject"]);
    const good = validateContact({ ...validContact });
    expect(good.ok && good.value.email).toBe("alice@example.com");
    expect(good.ok && good.value.phone).toBe("9876543210");
  });

  it("strips control characters and rejects unknown ticket categories", () => {
    const v = validateTicket({ category: "hacking", subject: "Hi\u0000 there!!", description: "x".repeat(20), orderNumber: "bad order!" });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(Object.keys(v.errors).sort()).toEqual(["category", "orderNumber"]);
  });
});

describe("contact form", () => {
  it("stores the message, emails the customer and the configured inbox, and reports what happened", async () => {
    const res = await submitContactMessageAction(validContact);
    expect(res.success).toBe(true);
    expect(db.table("contact_messages")).toHaveLength(1);
    const row = db.table("contact_messages")[0];
    expect(row).toMatchObject({ email: "alice@example.com", phone: "9876543210", status: "new", ip_hash: "iphash-1" });

    expect(resendCalls).toHaveLength(2);
    const alert = resendCalls.find((c) => c.to.includes("owner@shop.test"))!;
    expect(alert.subject).toMatch(/New contact message/);
    expect(alert.reply_to).toBe("alice@example.com"); // replying to the alert reaches the customer
    expect(resendCalls.some((c) => c.to.includes("alice@example.com"))).toBe(true);
    expect(res.success && res.confirmationEmailed).toBe(true);
  });

  it("rejects invalid input with field errors and stores nothing", async () => {
    const res = await submitContactMessageAction({ ...validContact, email: "bad", message: "hi" });
    expect(res.success).toBe(false);
    expect(!res.success && res.fieldErrors).toMatchObject({ email: expect.any(String), message: expect.any(String) });
    expect(db.table("contact_messages")).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
  });

  it("creates only one record when the same submission is sent twice (double click)", async () => {
    const [a, b] = await Promise.all([submitContactMessageAction(validContact), submitContactMessageAction(validContact)]);
    expect(a.success && b.success).toBe(true);
    expect(db.table("contact_messages")).toHaveLength(1);
    // emails are idempotent per message too
    expect(resendCalls.length).toBeLessThanOrEqual(2);
  });

  it("silently ignores bots that fill the hidden honeypot field", async () => {
    const res = await submitContactMessageAction({ ...validContact, website: "http://spam.example" });
    expect(res.success).toBe(true);
    expect(db.table("contact_messages")).toHaveLength(0);
    expect(resendCalls).toHaveLength(0);
  });

  it("keeps the message and tells the truth when email cannot be sent", async () => {
    resendFails = true;
    const res = await submitContactMessageAction(validContact);
    expect(res.success).toBe(true);
    expect(res.success && res.confirmationEmailed).toBe(false);
    expect(db.table("contact_messages")).toHaveLength(1);
    // the alert stays in the outbox for retry rather than being dropped
    const pending = db.table("email_events").filter((e) => e.template === "admin_notice");
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("failed");
    expect(pending[0].next_retry_at).toBeTruthy();
  });

  it("rate-limits repeated messages from one email address and one network", async () => {
    for (let i = 0; i < RATE_LIMITS.contactPerEmailPerHour; i++) {
      const r = await submitContactMessageAction({ ...validContact, token: `tok-contact-rate-${i}0000000` });
      expect(r.success).toBe(true);
    }
    const blocked = await submitContactMessageAction({ ...validContact, token: "tok-contact-rate-over00000" });
    expect(blocked.success).toBe(false);

    // different email, same network: limited by the IP hash
    db.table("contact_messages").forEach((m) => (m.email = `x${Math.random()}@example.com`));
    for (let i = RATE_LIMITS.contactPerEmailPerHour; i < RATE_LIMITS.contactPerIpPerHour; i++) {
      db.table("contact_messages").push({ id: `fill-${i}`, email: `fill${i}@e.com`, ip_hash: "iphash-1", created_at: new Date().toISOString() });
    }
    const ipBlocked = await submitContactMessageAction({ ...validContact, email: "fresh@example.com", token: "tok-contact-ip-000000000" });
    expect(ipBlocked.success).toBe(false);
  });
});

describe("customer support tickets", () => {
  const input = { category: "delivery", subject: "Parcel not arrived", description: "My parcel has not arrived after ten days.", orderNumber: "", token: "tok-ticket-00000000001" };

  it("creates a ticket with a ticket id, status, first message, audit event and emails", async () => {
    customerOrder(ALICE.id, "RVN-2026-000111");
    const res = await createTicketAction({ ...input, orderNumber: "rvn-2026-000111" });
    expect(res.success).toBe(true);
    const t = db.table("support_tickets")[0];
    expect(t).toMatchObject({ user_id: ALICE.id, customer_email: "alice@example.com", status: "open", category: "delivery", order_number: "RVN-2026-000111" });
    expect(t.ticket_number).toMatch(/^TKT-\d{6}$/);
    expect(db.table("support_ticket_messages")).toHaveLength(1);
    expect(db.table("support_ticket_events")[0]).toMatchObject({ action: "created", to_status: "open" });
    expect(resendCalls.map((c) => c.to[0]).sort()).toEqual(["alice@example.com", "owner@shop.test"]);
  });

  it("ignores a user id sent by the client and requires a signed-in customer", async () => {
    await createTicketAction({ ...input, userId: BOB.id, user_id: BOB.id, customer_email: "bob@example.com" });
    expect(db.table("support_tickets")[0].user_id).toBe(ALICE.id);
    expect(db.table("support_tickets")[0].customer_email).toBe("alice@example.com");

    session = { ok: false, error: "Please sign in to continue." };
    const anon = await createTicketAction({ ...input, token: "tok-ticket-00000000002" });
    expect(anon.success).toBe(false);
    expect(db.table("support_tickets")).toHaveLength(1);
  });

  it("refuses an order that belongs to someone else", async () => {
    customerOrder(BOB.id, "RVN-2026-000222");
    const res = await createTicketAction({ ...input, orderNumber: "RVN-2026-000222" });
    expect(res.success).toBe(false);
    expect(db.table("support_tickets")).toHaveLength(0);
  });

  it("does not create a duplicate on double submit", async () => {
    await Promise.all([createTicketAction(input), createTicketAction(input)]);
    expect(db.table("support_tickets")).toHaveLength(1);
  });

  it("IDOR: another customer cannot read, list or reply to the ticket", async () => {
    await createTicketAction(input);
    const id = db.table("support_tickets")[0].id;

    session = { ok: true, actor: BOB };
    expect((await getMyTicketAction(id)).success).toBe(false);
    expect((await replyToTicketAction(id, "I am Bob and I should not be here")).success).toBe(false);
    const list = await listMyTicketsAction();
    expect(list.success && list.tickets).toHaveLength(0);
    expect(db.table("support_ticket_messages")).toHaveLength(1);

    // malformed ids never reach the database
    expect((await getMyTicketAction("1 or 1=1")).success).toBe(false);
  });

  it("shows the customer only the conversation: never internal notes, audit events or admin identities", async () => {
    await createTicketAction(input);
    const id = db.table("support_tickets")[0].id;
    await addTicketNoteAction(id, "INTERNAL: customer has complained before");
    await replyToTicketAsStaffAction(id, "We are checking with the courier.", "in_progress");

    const view = await getMyTicketAction(id);
    expect(view.success).toBe(true);
    const serialized = JSON.stringify(view);
    expect(serialized).toContain("We are checking with the courier.");
    expect(serialized).not.toContain("INTERNAL");
    expect(serialized).not.toContain(ADMIN_ID);
    expect(serialized).not.toContain("admin@example.com");
    expect(view.success && view.messages.map((m) => m.from)).toEqual(["you", "support"]);
  });

  it("re-opens a resolved ticket when the customer replies, and blocks replies on a closed ticket", async () => {
    await createTicketAction(input);
    const id = db.table("support_tickets")[0].id;
    await setTicketStatusAction(id, "resolved");
    expect((await replyToTicketAction(id, "Still not fixed, sorry.")).success).toBe(true);
    expect(db.table("support_tickets")[0].status).toBe("open");

    await setTicketStatusAction(id, "closed");
    const blocked = await replyToTicketAction(id, "One more thing");
    expect(blocked.success).toBe(false);
  });

  it("rate-limits ticket creation", async () => {
    for (let i = 0; i < RATE_LIMITS.ticketsPerUserPerHour; i++) {
      expect((await createTicketAction({ ...input, token: `tok-ticket-rate-${i}00000000` })).success).toBe(true);
    }
    expect((await createTicketAction({ ...input, token: "tok-ticket-rate-over0000000" })).success).toBe(false);
  });
});

describe("admin query management", () => {
  const input = { category: "payment", subject: "Charged twice", description: "I was charged twice for the same order.", orderNumber: "", token: "tok-admin-ticket-000001" };

  it("lets staff reply, change status, add notes, and records an audit trail", async () => {
    customerOrder(ALICE.id, "RVN-2026-000333");
    await createTicketAction({ ...input, orderNumber: "RVN-2026-000333" });
    const id = db.table("support_tickets")[0].id;
    resendCalls.length = 0;

    const reply = await replyToTicketAsStaffAction(id, "Sorry about that. We have started a refund.", "waiting_for_customer");
    expect(reply.success && reply.status).toBe("waiting_for_customer");
    expect(resendCalls).toHaveLength(1);
    expect(resendCalls[0].to).toEqual(["alice@example.com"]);
    expect(resendCalls[0].subject).toMatch(/Re: Charged twice/);

    await addTicketNoteAction(id, "Refund ref 123");
    const done = await setTicketStatusAction(id, "resolved");
    expect(done.success).toBe(true);
    expect(resendCalls).toHaveLength(2); // the customer is told it is resolved

    const detail = await getTicketAction(id);
    expect(detail.success).toBe(true);
    if (detail.success) {
      expect(detail.order).toMatchObject({ orderNumber: "RVN-2026-000333", total: 4999 });
      expect(detail.order).not.toHaveProperty("address");
      expect(detail.notes.map((n) => n.body)).toEqual(["Refund ref 123"]);
      expect(detail.events.map((e) => e.action)).toEqual(["created", "replied", "note_added", "status_changed"]);
      expect(detail.events.at(-1)).toMatchObject({ from: "waiting_for_customer", to: "resolved", by: null });
    }
  });

  it("filters the query list by status and category and paginates", async () => {
    await createTicketAction(input);
    await createTicketAction({ ...input, category: "other", subject: "Something else", token: "tok-admin-ticket-000002" });
    const id = db.table("support_tickets")[1].id;
    await setTicketStatusAction(id, "closed");

    const all = await listTicketsAction({});
    expect(all.success && all.total).toBe(2);
    const closed = await listTicketsAction({ status: "closed" });
    expect(closed.success && closed.rows.map((r) => r.subject)).toEqual(["Something else"]);
    const cat = await listTicketsAction({ category: "payment" });
    expect(cat.success && cat.rows).toHaveLength(1);
    const junk = await listTicketsAction({ status: "'; drop table support_tickets;--" });
    expect(junk.success && junk.total).toBe(2); // unknown values are ignored, not passed to the database
  });

  it("denies every admin action to a customer or a signed-out visitor (server-side)", async () => {
    await createTicketAction(input);
    const id = db.table("support_tickets")[0].id;
    await submitContactMessageAction(validContact);
    const msgId = db.table("contact_messages")[0].id;

    for (const denied of [
      { ok: false, status: 403, error: "You do not have permission to perform this action." },
      { ok: false, status: 401, error: "Please sign in to continue." },
    ] as const) {
      staffSession = { ...denied };
      const results = await Promise.all([
        listTicketsAction({}),
        getTicketAction(id),
        replyToTicketAsStaffAction(id, "hello", "closed"),
        setTicketStatusAction(id, "closed"),
        addTicketNoteAction(id, "note"),
        listContactMessagesAction({}),
        setContactStatusAction(msgId, "closed"),
        deleteContactMessageAction(msgId),
      ]);
      for (const r of results) expect(r.success).toBe(false);
    }
    expect(db.table("support_tickets")[0].status).toBe("open");
    expect(db.table("contact_messages")[0].status).toBe("new");
    expect(db.table("contact_messages")).toHaveLength(1);
  });

  it("lets staff manage contact messages, but only admins delete them", async () => {
    await submitContactMessageAction(validContact);
    const id = db.table("contact_messages")[0].id;

    const list = await listContactMessagesAction({});
    expect(list.success && list.rows[0]).toMatchObject({ status: "new", email: "alice@example.com", alertState: "sent" });

    expect((await setContactStatusAction(id, "read")).success).toBe(true);
    expect(db.table("contact_messages")[0].read_at).toBeTruthy();
    expect((await setContactStatusAction(id, "replied")).success).toBe(true);
    expect(db.table("contact_messages")[0].replied_at).toBeTruthy();
    expect((await setContactStatusAction(id, "bogus")).success).toBe(false);

    staffSession = { ok: true, userId: ADMIN_ID, email: "staff@example.com", role: "staff" };
    expect((await deleteContactMessageAction(id)).success).toBe(false);
    expect(db.table("contact_messages")).toHaveLength(1);
    staffSession = { ok: true, userId: ADMIN_ID, email: "admin@example.com", role: "admin" };
    expect((await deleteContactMessageAction(id)).success).toBe(true);
    expect(db.table("contact_messages")).toHaveLength(0);
  });
});

describe("account deletion", () => {
  const seedAlice = () => {
    db.table("profiles").push({ id: ALICE.id, email: ALICE.email, role: "customer" });
    db.table("user_addresses").push({ id: "a1", user_id: ALICE.id });
    db.table("wishlists").push({ id: "w1", user_id: ALICE.id });
    db.table("carts").push({ id: "c1", user_id: ALICE.id });
    db.table("reviews").push({ id: "r1", user_id: ALICE.id });
    db.table("newsletter_subscribers").push({ id: "n1", email: ALICE.email });
    db.table("contact_messages").push({ id: "m1", email: ALICE.email, subject: "hi" });
    db.table("email_events").push({ id: "e1", event_key: "k1", recipient: ALICE.email, template: "order_confirmation", status: "sent", payload: { addressLines: ["secret"] } });
    customerOrder(ALICE.id, "RVN-2026-000444", "delivered");
    db.table("support_tickets").push({ id: "t-with-order", user_id: ALICE.id, order_id: "order-RVN-2026-000444", customer_name: "Alice Rao", customer_email: ALICE.email });
    db.table("support_tickets").push({ id: "t-no-order", user_id: ALICE.id, order_id: null, customer_name: "Alice Rao", customer_email: ALICE.email });
    // another customer's data must be untouched
    db.table("user_addresses").push({ id: "b1", user_id: BOB.id });
    customerOrder(BOB.id, "RVN-2026-000555", "delivered");
  };
  let deleted: string[];
  beforeEach(() => {
    deleted = [];
    (db as any).auth = { admin: { deleteUser: async (id: string) => (deleted.push(id), { error: null }) } };
  });

  it("requires the typed word DELETE and the correct password, and deletes nothing otherwise", async () => {
    seedAlice();
    expect((await deleteAccountAction({ confirmation: "delete", password: "pw" })).success).toBe(false);
    expect((await deleteAccountAction({ confirmation: "DELETE", password: "" })).success).toBe(false);
    passwordOk = false;
    const wrong = await deleteAccountAction({ confirmation: "DELETE", password: "wrong" });
    expect(wrong.success).toBe(false);
    expect(deleted).toHaveLength(0);
    expect(db.table("user_addresses")).toHaveLength(2);
  });

  it("removes personal data, keeps order records unlinked from the person, and deletes the login", async () => {
    seedAlice();
    const res = await deleteAccountAction({ confirmation: "DELETE", password: "correct" });
    expect(res).toMatchObject({ success: true });
    expect(res.success && res.message).toMatch(/Some transaction records may be retained/);

    expect(deleted).toEqual([ALICE.id]);
    expect(db.table("user_addresses").map((a) => a.id)).toEqual(["b1"]);
    expect(db.table("wishlists")).toHaveLength(0);
    expect(db.table("carts")).toHaveLength(0);
    expect(db.table("reviews")).toHaveLength(0);
    expect(db.table("newsletter_subscribers")).toHaveLength(0);
    expect(db.table("contact_messages")).toHaveLength(0);
    expect(db.table("email_events")).toHaveLength(0);

    const order = db.table("orders").find((o) => o.order_number === "RVN-2026-000444")!;
    expect(order).toBeTruthy(); // the financial record is retained
    expect(order.user_id).toBeNull(); // ...but no longer linked to the person
    expect(db.table("orders").find((o) => o.order_number === "RVN-2026-000555")!.user_id).toBe(BOB.id);

    expect(db.table("support_tickets").map((t) => t.id)).toEqual(["t-with-order"]);
    expect(db.table("support_tickets")[0]).toMatchObject({ user_id: null, customer_name: "Deleted customer" });
    expect(db.table("support_tickets")[0].customer_email).not.toContain("alice");

    expect(db.table("audit_logs")[0]).toMatchObject({ action: "account.deleted", user_id: null });
    expect(JSON.stringify(db.table("audit_logs"))).not.toContain(ALICE.id);
  });

  it("refuses while an order is still in progress and changes nothing", async () => {
    seedAlice();
    customerOrder(ALICE.id, "RVN-2026-000666", "shipped");
    const res = await deleteAccountAction({ confirmation: "DELETE", password: "correct" });
    expect(res.success).toBe(false);
    expect(deleted).toHaveLength(0);
    expect(db.table("user_addresses")).toHaveLength(2);
  });

  it("deletes the login last, so a failure leaves a retryable account", async () => {
    seedAlice();
    (db as any).auth = { admin: { deleteUser: async () => ({ error: { message: "boom" } }) } };
    const res = await deleteAccountAction({ confirmation: "DELETE", password: "correct" });
    expect(res.success).toBe(false);
    expect(db.table("profiles")).toHaveLength(1);
    // running it again after the outage succeeds (every step is repeatable)
    (db as any).auth = { admin: { deleteUser: async (id: string) => (deleted.push(id), { error: null }) } };
    expect((await deleteAccountAction({ confirmation: "DELETE", password: "correct" })).success).toBe(true);
  });

  it("refuses when not signed in", async () => {
    session = { ok: false, error: "Please sign in to continue." };
    expect((await deleteAccountAction({ confirmation: "DELETE", password: "x" })).success).toBe(false);
  });
});

describe("repository hygiene", () => {
  it("contains no reference to the retired info@ address", () => {
    const retired = ["info", "@raveena", "sarees.com"].join("");
    const roots = ["src", "supabase_migrations", "supabase_schema.sql", "supabase_seed.sql", "README.md", "README_BACKEND.md", ".env.example", "scripts", "tests"];
    const hits: string[] = [];
    const walk = (p: string) => {
      const full = path.resolve(__dirname, "..", p);
      let st;
      try { st = statSync(full); } catch { return; }
      if (st.isDirectory()) return readdirSync(full).forEach((f) => walk(path.join(p, f)));
      if (/\.(png|jpe?g|webp|ico|svg|woff2?)$/i.test(full)) return;
      if (readFileSync(full, "utf8").toLowerCase().includes(retired)) hits.push(p);
    };
    roots.forEach(walk);
    expect(hits).toEqual([]);
  });
});
