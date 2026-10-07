// =============================================================================
// Shiprocket API client (server-only)
// -----------------------------------------------------------------------------
// Endpoints (base https://apiv2.shiprocket.in/v1/external):
//   POST auth/login                 -> { token }  (JWT, valid ~10 days)
//   POST orders/create/adhoc        -> { order_id, shipment_id, status, awb_code?, ... }
//   GET  orders?search=<ref>        -> { data: [...] }   (used to reconcile before re-creating)
//   POST courier/assign/awb         -> { awb_assign_status, response: { data: { awb_code, courier_name, ... } } }
//   POST courier/generate/pickup    -> { pickup_status, response: { pickup_scheduled_date, ... } }
//   GET  courier/track/awb/<awb>    -> { tracking_data: { ... } }
//   POST orders/cancel              -> { ids: [shiprocket order ids] }
// Credentials come from env vars and never reach the browser.
// =============================================================================
import "server-only";

export interface ShiprocketConfig {
  email: string;
  password: string;
  baseUrl: string;
  pickupLocation: string;
  channelId?: string;
  courierId?: number;
  autoAssignAwb: boolean;
  autoPickup: boolean;
  pkg: { weightKgPerItem: number; lengthCm: number; breadthCm: number; heightCm: number };
}

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const flag = (v: string | undefined, fallback: boolean) => (v === undefined || v === "" ? fallback : /^(1|true|yes|on)$/i.test(v));

export function getShiprocketConfig(): { config: ShiprocketConfig | null; reason?: string } {
  const email = (process.env.SHIPROCKET_EMAIL || "").trim();
  const password = process.env.SHIPROCKET_PASSWORD || "";
  const pickupLocation = (process.env.SHIPROCKET_PICKUP_LOCATION || "").trim();
  if (!email || !password) return { config: null, reason: "SHIPROCKET_EMAIL / SHIPROCKET_PASSWORD are not set" };
  if (!pickupLocation) return { config: null, reason: "SHIPROCKET_PICKUP_LOCATION is not set (must match the pickup address nickname in Shiprocket)" };
  const courierId = Number(process.env.SHIPROCKET_COURIER_ID);
  return {
    config: {
      email,
      password,
      baseUrl: (process.env.SHIPROCKET_API_BASE_URL || "https://apiv2.shiprocket.in/v1/external").replace(/\/+$/, ""),
      pickupLocation,
      channelId: (process.env.SHIPROCKET_CHANNEL_ID || "").trim() || undefined,
      courierId: Number.isInteger(courierId) && courierId > 0 ? courierId : undefined,
      autoAssignAwb: flag(process.env.SHIPROCKET_AUTO_ASSIGN_AWB, true),
      autoPickup: flag(process.env.SHIPROCKET_AUTO_PICKUP, true),
      pkg: {
        weightKgPerItem: num(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG, 0.5),
        lengthCm: num(process.env.SHIPROCKET_DEFAULT_LENGTH_CM, 30),
        breadthCm: num(process.env.SHIPROCKET_DEFAULT_BREADTH_CM, 25),
        heightCm: num(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM, 5),
      },
    },
  };
}

export class ShiprocketError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly retryable: boolean,
    readonly operation: string
  ) {
    super(message);
    this.name = "ShiprocketError";
  }
}

/** Turns Shiprocket's error bodies ({ message, errors: { field: [..] } }) into one readable line. Never includes credentials. */
export function describeShiprocketError(body: any, status: number): string {
  if (!body || typeof body !== "object") return `HTTP ${status}`;
  const parts: string[] = [];
  if (typeof body.message === "string" && body.message) parts.push(body.message);
  if (body.errors && typeof body.errors === "object") {
    for (const [field, msgs] of Object.entries(body.errors)) {
      parts.push(`${field}: ${Array.isArray(msgs) ? msgs.join(", ") : String(msgs)}`);
    }
  }
  return (parts.join(" | ") || `HTTP ${status}`).slice(0, 500);
}

// ─── token cache (per server instance; never persisted or logged) ─────────────
let cachedToken: { token: string; expiresAt: number } | null = null;
let loginInFlight: Promise<string> | null = null;
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // Shiprocket tokens last ~10 days; refresh a day early

async function login(cfg: ShiprocketConfig): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: cfg.email, password: cfg.password }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.token) {
    throw new ShiprocketError(
      `Shiprocket login failed: ${describeShiprocketError(body, res.status)}`,
      res.status,
      res.status >= 500 || res.status === 429,
      "auth"
    );
  }
  cachedToken = { token: body.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  return body.token as string;
}

async function getToken(cfg: ShiprocketConfig, forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.token;
  if (!loginInFlight) loginInFlight = login(cfg).finally(() => (loginInFlight = null));
  return loginInFlight;
}

/** Test hook: clears the cached token. */
export function __resetShiprocketToken() {
  cachedToken = null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Authenticated request. Re-authenticates once on 401. Network/5xx/429 errors are retried only for
 * `safeToRetry` calls (GETs and idempotent POSTs) so an order is never created twice by the client itself.
 */
async function request<T = any>(
  cfg: ShiprocketConfig,
  operation: string,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  opts: { safeToRetry?: boolean } = {}
): Promise<T> {
  const maxAttempts = opts.safeToRetry ? 3 : 1;
  let reauthed = false;
  let lastError: ShiprocketError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const token = await getToken(cfg);
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/${path.replace(/^\//, "")}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
        cache: "no-store",
      });
    } catch (err: any) {
      lastError = new ShiprocketError(`Network error calling Shiprocket: ${err?.message || "request failed"}`, 0, true, operation);
      if (attempt < maxAttempts) await sleep(400 * attempt);
      continue;
    }

    if (res.status === 401 && !reauthed) {
      reauthed = true;
      cachedToken = null;
      await getToken(cfg, true);
      attempt--; // the re-auth retry does not count as an attempt
      continue;
    }

    const json = await res.json().catch(() => null);
    if (res.ok) return json as T;

    const retryable = res.status >= 500 || res.status === 429;
    lastError = new ShiprocketError(describeShiprocketError(json, res.status), res.status, retryable, operation);
    if (!retryable || attempt >= maxAttempts) break;
    await sleep(res.status === 429 ? 1500 * attempt : 400 * attempt);
  }
  throw lastError ?? new ShiprocketError("Unknown Shiprocket error", 0, true, operation);
}

// ─── API operations ───────────────────────────────────────────────────────────
export interface AdhocOrderPayload {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  order_items: { name: string; sku: string; units: number; selling_price: number; discount?: number; tax?: number; hsn?: string }[];
  payment_method: "Prepaid" | "COD";
  shipping_charges: number;
  giftwrap_charges: number;
  transaction_charges: number;
  total_discount: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface CreatedShiprocketOrder {
  orderId: number;
  shipmentId: number | null;
  status?: string;
  awb?: string | null;
  courierName?: string | null;
  courierId?: number | null;
}

const toInt = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : null;
};

export async function createAdhocOrder(cfg: ShiprocketConfig, payload: AdhocOrderPayload): Promise<CreatedShiprocketOrder> {
  const r = await request<any>(cfg, "create_order", "POST", "orders/create/adhoc", payload);
  const orderId = toInt(r?.order_id);
  if (!orderId) {
    throw new ShiprocketError(`Unexpected create-order response: ${describeShiprocketError(r, 200)}`, 200, false, "create_order");
  }
  return {
    orderId,
    shipmentId: toInt(r?.shipment_id),
    status: r?.status,
    awb: r?.awb_code ? String(r.awb_code) : null,
    courierName: r?.courier_name || null,
    courierId: toInt(r?.courier_company_id),
  };
}

/** Looks up an existing Shiprocket order by our reference (channel order id). Used before any re-create. */
export async function findOrderByReference(cfg: ShiprocketConfig, reference: string): Promise<CreatedShiprocketOrder | null> {
  const r = await request<any>(cfg, "find_order", "GET", `orders?search=${encodeURIComponent(reference)}&per_page=10`, undefined, {
    safeToRetry: true,
  });
  const rows: any[] = Array.isArray(r?.data) ? r.data : [];
  const match = rows.find((o) => String(o?.channel_order_id ?? "").trim() === reference);
  if (!match) return null;
  const shipments = Array.isArray(match.shipments) ? match.shipments : match.shipments ? [match.shipments] : [];
  const s = shipments[0] || {};
  return {
    orderId: toInt(match.id)!,
    shipmentId: toInt(s.id ?? match.shipment_id),
    status: match.status,
    awb: s.awb || s.awb_code || null,
    courierName: s.courier || s.courier_name || null,
    courierId: toInt(s.courier_id ?? s.courier_company_id),
  };
}

export async function assignAwb(cfg: ShiprocketConfig, shipmentId: number, courierId?: number) {
  const r = await request<any>(cfg, "assign_awb", "POST", "courier/assign/awb", {
    shipment_id: shipmentId,
    ...(courierId ? { courier_id: courierId } : {}),
  });
  const d = r?.response?.data || {};
  const awb = d.awb_code ? String(d.awb_code) : null;
  if (Number(r?.awb_assign_status) !== 1 || !awb) {
    const msg = d.awb_assign_error || r?.message || describeShiprocketError(r, 200);
    throw new ShiprocketError(`AWB not assigned: ${msg}`, 200, true, "assign_awb");
  }
  return { awb, courierName: (d.courier_name as string) || null, courierId: toInt(d.courier_company_id) };
}

export async function generatePickup(cfg: ShiprocketConfig, shipmentId: number) {
  const r = await request<any>(cfg, "schedule_pickup", "POST", "courier/generate/pickup", { shipment_id: [shipmentId] });
  if (Number(r?.pickup_status) !== 1) {
    throw new ShiprocketError(`Pickup not scheduled: ${describeShiprocketError(r?.response ?? r, 200)}`, 200, true, "schedule_pickup");
  }
  const when = r?.response?.pickup_scheduled_date;
  return { scheduledDate: typeof when === "string" ? when : null, token: r?.response?.pickup_token_number ?? null };
}

export async function trackByAwb(cfg: ShiprocketConfig, awb: string) {
  return request<any>(cfg, "track", "GET", `courier/track/awb/${encodeURIComponent(awb)}`, undefined, { safeToRetry: true });
}

export async function cancelOrders(cfg: ShiprocketConfig, shiprocketOrderIds: number[]) {
  // Cancelling an already-cancelled order is harmless, so this is safe to retry
  return request<any>(cfg, "cancel_order", "POST", "orders/cancel", { ids: shiprocketOrderIds }, { safeToRetry: true });
}

/** Shiprocket's public tracking page for an AWB (shown to customers when the API does not return one). */
export const shiprocketTrackingUrl = (awb: string) => `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
