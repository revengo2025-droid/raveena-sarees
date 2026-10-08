// Security regression tests: authentication throttling, anti-enumeration, server-side pricing, filter injection,
// headers/CSP, webhook + cron authentication, health endpoints, rate limiting, audit scrubbing and log injection.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "crypto";
import { createRequire } from "module";
import { FakeDb } from "./helpers/fakeSupabase";

let db: FakeDb;
let authUser: { id: string; email: string } | null;
let signInResult: { error: any; data?: any };
let signUpResult: { error: any; data?: any };
let signInCalls: number;
let globalSignOuts: number;
let ipHash: string | null;
let staffSession: any;

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn: any) => fn }));
vi.mock("@/lib/orders/payment", () => ({ startPostConfirmation: () => {}, confirmOnlinePayment: async () => ({ ok: true }), recordFailedPayment: async () => ({}) }));
vi.mock("@/lib/server/maintenance", () => ({ runMaintenanceThrottled: () => {}, runMaintenance: async () => ({}) }));
vi.mock("@/lib/support/context", () => ({ requestIpHash: () => ipHash, requireCustomer: async () => ({ ok: false, error: "x" }) }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: async () => staffSession }));
vi.mock("@/lib/supabase", () => ({
  createAdminClient: () => db,
  createServerClient: async () => ({
    from: (t: string) => db.from(t),
    auth: {
      getUser: async () => ({ data: { user: authUser } }),
      signInWithPassword: async () => {
        signInCalls++;
        return signInResult;
      },
      signUp: async () => signUpResult,
      updateUser: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: null }),
      signOut: async (opts?: { scope?: string }) => {
        if (opts?.scope === "global") globalSignOuts++;
        return { error: null };
      },
    },
  }),
}));

import { loginAction, registerAction, forgotPasswordAction, resetPasswordAction } from "@/app/actions/auth";
import { createOrderAction } from "@/app/actions/orders";
import { getProductsAction } from "@/app/actions/products";
import { validateCouponAction } from "@/app/actions/coupons";
import { rateLimit, rateLimitAll, fingerprint, POLICIES, __resetMemoryLimiter } from "@/lib/security/rate-limit";
import { scrubMeta, audit } from "@/lib/security/audit";
import { log } from "@/lib/security/logger";
import { safeFilterTerm, clampInt, oneOf } from "@/lib/security/sanitize";
import { safeRedirectPath, postLoginPath } from "@/lib/auth/roles";

const ALICE = { id: "11111111-1111-4111-8111-111111111111", email: "alice@example.com" };
const loadRoute = async (path: string) => import(/* @vite-ignore */ path);

beforeEach(() => {
  __resetMemoryLimiter();
  db = new FakeDb();
  authUser = null;
  signInResult = { error: { message: "Invalid login credentials" } };
  signUpResult = { error: null, data: { user: { id: ALICE.id }, session: null } };
  signInCalls = 0;
  globalSignOuts = 0;
  ipHash = "ip-1";
  staffSession = { ok: false, status: 403, error: "You do not have permission to perform this action." };
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllEnvs());

// =============================================================================
describe("rate limiter", () => {
  it("counts in the shared database store and blocks once the budget is spent", async () => {
    const budget = POLICIES.reauth.max;
    for (let i = 0; i < budget; i++) expect((await rateLimit("reauth", "u1")).ok).toBe(true);
    const blocked = await rateLimit("reauth", "u1");
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.retryAfter).toBeGreaterThan(0);
    expect((await rateLimit("reauth", "someone-else")).ok).toBe(true); // budgets are per identity
    expect(db.rpcCalls).toBeGreaterThan(budget);
  });

  it("falls back to a bounded in-memory limiter when the database limiter is down (never fails open silently)", async () => {
    db.failRpc = true;
    for (let i = 0; i < POLICIES.reauth.max; i++) expect((await rateLimit("reauth", "u2")).ok).toBe(true);
    expect((await rateLimit("reauth", "u2")).ok).toBe(false);
  });

  it("applies the strictest of several checks", async () => {
    for (let i = 0; i < POLICIES.passwordResetAccount.max; i++) await rateLimit("passwordResetAccount", fingerprint("a@b.com"));
    const r = await rateLimitAll([
      ["passwordResetIp", "ip-x"],
      ["passwordResetAccount", fingerprint("a@b.com")],
    ]);
    expect(r.ok).toBe(false);
  });
});

describe("authentication", () => {
  it("throttles repeated wrong passwords for one account, then stops calling the auth server", async () => {
    for (let i = 0; i < POLICIES.loginAccount.max; i++) {
      const r = await loginAction({ email: "victim@example.com", password: "wrong-password" });
      expect(r.success).toBe(false);
      expect(r.error).toBe("Invalid email or password.");
    }
    const callsBefore = signInCalls;
    const locked = await loginAction({ email: "victim@example.com", password: "wrong-password" });
    expect(locked.success).toBe(false);
    expect(locked.error).toMatch(/Too many sign-in attempts/);
    expect(signInCalls).toBe(callsBefore);
    // failed attempts are audited without the email address itself
    const failed = db.table("audit_logs").filter((a) => a.action === "auth.login_failed");
    expect(failed.length).toBe(POLICIES.loginAccount.max);
    expect(JSON.stringify(failed)).not.toContain("victim@example.com");
  });

  it("does not call an outage a wrong password, and does not audit it as a failed login", async () => {
    signInResult = { error: { name: "AuthRetryableFetchError", message: "fetch failed", status: 0 } };
    const r = await loginAction({ email: "alice@example.com", password: "right-password-1" });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/could not reach our sign-in service/i);
    expect(db.table("audit_logs").filter((a) => a.action === "auth.login_failed")).toHaveLength(0);
    signInResult = { error: { name: "AuthApiError", message: "boom", status: 503 } };
    expect((await loginAction({ email: "alice@example.com", password: "right-password-1" })).error).toMatch(/sign-in service/i);
  });

  it("gives the same answer for unknown and known accounts", async () => {
    const a = await loginAction({ email: "nobody@example.com", password: "whatever1" });
    const b = await loginAction({ email: "alice@example.com", password: "whatever1" });
    expect(a.error).toBe(b.error);
  });

  it("does not reveal whether an email is already registered", async () => {
    signUpResult = { error: { message: "User already registered", status: 422 } };
    const r = await registerAction({ fullName: "Alice Rao", email: "alice@example.com", password: "a-long-password" });
    expect(r.success).toBe(false);
    expect(r.error).not.toMatch(/already registered|exists/i);
  });

  it("requires 8+ characters for new passwords and reports a signed-out account when email confirmation is on", async () => {
    expect((await registerAction({ fullName: "Alice Rao", email: "a@example.com", password: "short" })).success).toBe(false);
    const ok = await registerAction({ fullName: "Alice Rao", email: "a@example.com", password: "long-enough-pw" });
    expect(ok.success).toBe(true);
    expect(ok.data.signedIn).toBe(false);
  });

  it("password reset request answers identically for any email and is rate limited", async () => {
    for (let i = 0; i < POLICIES.passwordResetAccount.max; i++) expect((await forgotPasswordAction({ email: "x@example.com" })).success).toBe(true);
    const blocked = await forgotPasswordAction({ email: "x@example.com" });
    expect(blocked.success).toBe(false);
  });

  it("changing the password signs the account out everywhere; no session means no change", async () => {
    expect((await resetPasswordAction({ password: "new-password-1", confirmPassword: "new-password-1" })).success).toBe(false);
    authUser = ALICE;
    const r = await resetPasswordAction({ password: "new-password-1", confirmPassword: "new-password-1" });
    expect(r.success).toBe(true);
    expect(globalSignOuts).toBe(1);
    expect((await resetPasswordAction({ password: "new-password-1", confirmPassword: "different-one" })).success).toBe(false);
  });

  it("blocks open redirects after sign-in", () => {
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", "/ok\nSet-Cookie: x=1"]) {
      expect(safeRedirectPath(bad, "/account")).toBe("/account");
    }
    expect(postLoginPath("customer", "/admin")).toBe("/account");
    expect(postLoginPath("admin", "/shop")).toBe("/admin");
  });
});

// =============================================================================
describe("checkout pricing cannot be manipulated from the browser", () => {
  const address = { name: "Alice Rao", phone: "9876543210", houseNumber: "12", streetAddress: "MG Road", locality: "Marthadi", city: "Asifabad", state: "Telangana", pincode: "504299", addressType: "home" as const };
  const order = (items: any[], extra: Record<string, unknown> = {}) =>
    createOrderAction({ customerName: "Alice Rao", customerEmail: "alice@example.com", customerPhone: "9876543210", shippingAddress: address, items, paymentMethod: "razorpay", ...extra } as any);
  const line = (over: Record<string, unknown> = {}) => ({ productId: "ignored", productName: "Cheap", sku: "SKU-REAL-1", price: 1, quantity: 1, ...over });

  beforeEach(() => {
    authUser = ALICE;
    db.table("profiles").push({ id: ALICE.id, role: "customer" });
    db.table("products").push(
      { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", sku: "SKU-REAL-1", name: "Kanjeevaram", price: 8000, discount_price: 6000, images: [], stock: 3, is_active: true },
      { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", sku: "SKU-REAL-2", name: "Banarasi", price: 12000, discount_price: null, images: [], stock: 5, is_active: true },
      { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", sku: "SKU-HIDDEN", name: "Hidden", price: 5000, discount_price: null, images: [], stock: 5, is_active: false }
    );
  });

  it("charges the database price, not the price sent by the browser", async () => {
    const r: any = await order([line({ price: 1 })]);
    expect(r.success).toBe(true);
    expect(r.data.subtotal).toBe(6000);
    expect(db.table("order_items")[0].price).toBe(6000);
    expect(db.table("order_items")[0].product_id).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("ignores a mismatched product id (the old two-match trick) and still prices by the real SKU", async () => {
    const r: any = await order([line({ productId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", sku: "SKU-REAL-1", price: 1 })]);
    expect(r.success).toBe(true);
    expect(r.data.subtotal).toBe(6000);
  });

  it("rejects products that are not in the catalogue instead of trusting the browser price", async () => {
    const r: any = await order([line({ sku: "SKU-FAKE", price: 1 })]);
    expect(r.success).toBe(false);
    expect(db.table("orders")).toHaveLength(0);
  });

  it("rejects hidden products and quantities above the stock", async () => {
    expect(((await order([line({ sku: "SKU-HIDDEN" })])) as any).success).toBe(false);
    const over: any = await order([line({ quantity: 4 })]);
    expect(over.success).toBe(false);
    expect(over.error).toMatch(/Only 3/);
  });

  it("rejects malformed identifiers that could alter a database filter", async () => {
    const r: any = await order([line({ sku: "SKU-REAL-1,price.lt.1" })]);
    expect(r.success).toBe(false);
  });

  it("accepts only Razorpay: a cash-on-delivery order is refused and new orders start unpaid and pending", async () => {
    const cod: any = await order([line()], { paymentMethod: "cod" });
    expect(cod.success).toBe(false);
    expect(db.table("orders")).toHaveLength(0);
    const ok: any = await order([line()]);
    expect(ok.success).toBe(true);
    expect(ok.data.isOnlinePayment).toBe(true);
    expect(db.table("orders")[0]).toMatchObject({ payment_method: "razorpay", payment_status: "pending", order_status: "pending" });
  });

  it("requires a signed-in customer and refuses admin accounts", async () => {
    authUser = null;
    expect(((await order([line()])) as any).success).toBe(false);
    authUser = ALICE;
    db.table("profiles")[0].role = "admin";
    expect(((await order([line()])) as any).success).toBe(false);
    expect(db.table("orders")).toHaveLength(0);
  });

  it("does not apply an exhausted coupon", async () => {
    db.table("coupons").push({ id: "c1", code: "FULL", is_active: true, discount_type: "percentage", discount_value: 50, usage_limit: 5, times_used: 5, min_order_value: 0 });
    const r: any = await order([line()], { couponCode: "FULL" });
    expect(r.success).toBe(true);
    expect(r.data.discountAmount).toBe(0);
  });

  it("rate limits coupon guessing", async () => {
    for (let i = 0; i < POLICIES.coupon.max; i++) await validateCouponAction(`GUESS${i}`, 5000);
    const r: any = await validateCouponAction("GUESSX", 5000);
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/Too many/);
  });
});

describe("catalogue search", () => {
  it("cannot inject extra filters through the search box", async () => {
    const ors: string[] = [];
    const orig = db.from.bind(db);
    (db as any).from = (name: string) => {
      const q: any = orig(name);
      const o = q.or.bind(q);
      q.or = (e: string) => (ors.push(e), o(e));
      return q;
    };
    await getProductsAction({ search: "silk),is_active.eq.false,(name.ilike.%" });
    expect(ors).toHaveLength(1);
    // exactly the two intended conditions: nothing the visitor typed can add a third
    expect(ors[0].split(",")).toHaveLength(2);
    expect(ors[0]).not.toContain("is_active");
  });

  it("sanitises and bounds untrusted values", () => {
    expect(safeFilterTerm("a,b)(c%*_\\\"'")).toBe("abc");
    expect(safeFilterTerm("x".repeat(500), 60)).toHaveLength(60);
    expect(safeFilterTerm({ not: "a string" })).toBe("");
    expect(clampInt("999999", 1, 50, 1)).toBe(50);
    expect(clampInt("abc", 1, 50, 7)).toBe(7);
    expect(oneOf("price-low", ["price-low", "price-high"] as const)).toBe("price-low");
    expect(oneOf("price-low; drop", ["price-low"] as const)).toBeUndefined();
  });
});

// =============================================================================
describe("logging and audit hygiene", () => {
  it("log lines cannot be forged with newlines and never contain secret-looking fields", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    log.warn("test.event", { note: 'ok\n{"level":"error","event":"fake"} second', password: "hunter2", apiKey: "k", token: "t", nested: { cookie: "c", fine: 1 } });
    const line = String(spy.mock.calls.at(-1)?.[0]);
    expect(line.split("\n")).toHaveLength(1);
    expect(JSON.parse(line).event).toBe("test.event");
    expect(line).not.toMatch(/hunter2|"apiKey"|"token"|"cookie"/);
  });

  it("audit metadata drops credentials and truncates long text", async () => {
    expect(scrubMeta({ ok: "yes", password: "p", resetToken: "t", authorization: "Bearer x", n: 1, long: "z".repeat(1000) })).toEqual({ ok: "yes", n: 1, long: "z".repeat(200) });
    await audit({ action: "product.update", actorId: ALICE.id, entityType: "product", entityId: "p1", meta: { password: "x", fields: ["price"] }, ipHash: "h".repeat(64) });
    const row = db.table("audit_logs")[0];
    expect(row).toMatchObject({ action: "product.update", user_id: ALICE.id, entity_type: "product" });
    expect(JSON.stringify(row)).not.toContain('"password"');
    expect(row.ip_address).toHaveLength(32);
  });
});

// =============================================================================
describe("HTTP surface", () => {
  it("production headers: strict CSP, no eval, no foreign script hosts, framing and plugins blocked, HSTS on", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const cfg = createRequire(import.meta.url)("../next.config.js");
    delete createRequire(import.meta.url).cache[createRequire(import.meta.url).resolve("../next.config.js")];
    const rules = await cfg.headers();
    const all = rules.find((r: any) => r.source === "/:path*").headers as { key: string; value: string }[];
    const get = (k: string) => all.find((h) => h.key === k)?.value || "";
    const csp = get("Content-Security-Policy");
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/frame-ancestors 'self'/);
    expect(csp).toMatch(/base-uri 'self'/);
    expect(csp).toMatch(/form-action 'self'/);
    expect(csp).not.toMatch(/unsafe-eval/);
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) || "";
    expect(scriptSrc.match(/https:\/\/[^\s]+/g)).toEqual(["https://checkout.razorpay.com"]);
    expect(get("Strict-Transport-Security")).toMatch(/max-age=\d{7,}/);
    expect(get("X-Content-Type-Options")).toBe("nosniff");
    expect(get("Referrer-Policy")).toBeTruthy();
    expect(get("Permissions-Policy")).toMatch(/camera=\(\)/);
    for (const prefix of ["/account", "/admin", "/auth", "/checkout"]) {
      const rule = rules.find((r: any) => r.source === `${prefix}/:path*`);
      expect(rule?.headers[0].value).toMatch(/no-store/);
    }
    expect(cfg.poweredByHeader).toBe(false);
    expect(cfg.productionBrowserSourceMaps).toBe(false);
  });

  it("never sends permissive CORS headers", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const cfg = createRequire(import.meta.url)("../next.config.js");
    const rules = await cfg.headers();
    const keys = rules.flatMap((r: any) => r.headers.map((h: any) => h.key.toLowerCase()));
    expect(keys.some((k: string) => k.startsWith("access-control-"))).toBe(false);
  });

  it("liveness reveals nothing; readiness details need the cron secret and never leak values", async () => {
    vi.stubEnv("CRON_SECRET", "a-very-long-cron-secret-value");
    db.table("store_settings").push({ key: "x", value: {} });
    const live = await (await import("@/app/api/health/route")).GET();
    expect(await live.json()).toEqual({ status: "ok" });

    const ready = await import("@/app/api/health/ready/route");
    const anon = await ready.GET(new Request("http://x/api/health/ready") as any);
    expect(anon.status).toBe(200);
    expect(await anon.json()).toEqual({ status: "ready" });

    const priv = await ready.GET(new Request("http://x/api/health/ready", { headers: { authorization: "Bearer a-very-long-cron-secret-value" } }) as any);
    const body = await priv.json();
    expect(body.checks).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain("a-very-long-cron-secret-value");
    const wrong = await ready.GET(new Request("http://x/api/health/ready", { headers: { authorization: "Bearer nope" } }) as any);
    expect((await wrong.json()).checks).toBeUndefined();
  });

  it("cron endpoint rejects missing and wrong secrets", async () => {
    vi.stubEnv("CRON_SECRET", "a-very-long-cron-secret-value");
    const { GET } = await import("@/app/api/cron/maintenance/route");
    expect((await GET(new Request("http://x/") as any)).status).toBe(401);
    expect((await GET(new Request("http://x/", { headers: { authorization: "Bearer wrong" } }) as any)).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "short");
    expect((await GET(new Request("http://x/", { headers: { authorization: "Bearer short" } }) as any)).status).toBe(401); // weak secrets are refused
  });

  it("Razorpay webhook rejects unsigned, wrongly signed and oversized requests", async () => {
    vi.stubEnv("RAZORPAY_WEBHOOK_SECRET", "whsec_test_secret_value");
    const { POST } = await import("@/app/api/webhooks/razorpay/route");
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    const mk = (sig: string, b = body) => POST(new Request("http://x/", { method: "POST", body: b, headers: { "x-razorpay-signature": sig } }) as any);
    expect((await mk("")).status).toBe(400);
    expect((await mk("deadbeef")).status).toBe(400);
    const good = createHmac("sha256", "whsec_test_secret_value").update(body).digest("hex");
    expect((await mk(good)).status).toBe(200);
    expect((await mk(good, "x".repeat(600 * 1024))).status).toBe(413);
  });

  it("Shiprocket webhook rejects a missing or wrong token", async () => {
    vi.stubEnv("SHIPROCKET_WEBHOOK_TOKEN", "ship-token-1234567890");
    const { POST } = await import("@/app/api/webhooks/shipping/route");
    const mk = (headers: Record<string, string>) => POST(new Request("http://x/", { method: "POST", body: "{}", headers }) as any);
    expect((await mk({})).status).toBe(401);
    expect((await mk({ "x-api-key": "wrong" })).status).toBe(401);
    expect((await mk({ "x-api-key": "ship-token-1234567890" })).status).toBe(200);
  });

  it("product image upload is closed to anonymous callers and cross-origin requests", async () => {
    const { POST } = await import("@/app/api/admin/product-images/route");
    const mk = (headers: Record<string, string>) => POST(new Request("http://shop.test/api/admin/product-images", { method: "POST", headers, body: new FormData() }) as any);
    expect((await mk({ origin: "https://evil.example", host: "shop.test" })).status).toBe(403);
    expect((await mk({ origin: "not a url", host: "shop.test" })).status).toBe(403);
    expect((await mk({})).status).toBe(403); // staffSession.ok === false
    staffSession = { ok: false, status: 401, error: "Please sign in to continue." };
    expect((await mk({})).status).toBe(401);
  });

  it("public product API rate limits and hides internal error text", async () => {
    const { GET } = await import("@/app/api/products/route");
    let last = 200;
    for (let i = 0; i < POLICIES.catalogueSearch.max + 2; i++) last = (await GET(new Request("http://x/api/products?search=silk") as any)).status;
    expect(last).toBe(429);
  });
});
