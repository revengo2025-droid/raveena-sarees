// =============================================================================
// Rate limiting
// -----------------------------------------------------------------------------
// Counters live in Postgres (rate_limit_hit RPC, migration 008) so every serverless instance shares them.
// Each policy has its own budget. If the database cannot be reached the limiter degrades to a per-instance
// in-memory counter instead of either blocking every customer or letting abuse through unchecked.
// =============================================================================
import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase";

export interface Policy {
  max: number;
  windowSeconds: number;
}

/** Budgets chosen per risk: credential guessing is tight, reading is generous. */
export const POLICIES = {
  // Authentication
  loginIp: { max: 30, windowSeconds: 600 },
  loginAccount: { max: 8, windowSeconds: 600 },
  registerIp: { max: 10, windowSeconds: 3600 },
  passwordResetIp: { max: 10, windowSeconds: 3600 },
  passwordResetAccount: { max: 3, windowSeconds: 3600 },
  reauth: { max: 5, windowSeconds: 900 },
  // Customer writes
  contactIp: { max: 10, windowSeconds: 3600 },
  contactEmail: { max: 5, windowSeconds: 3600 },
  ticketCreate: { max: 5, windowSeconds: 3600 },
  ticketReply: { max: 20, windowSeconds: 3600 },
  review: { max: 5, windowSeconds: 3600 },
  newsletterIp: { max: 10, windowSeconds: 3600 },
  accountDelete: { max: 5, windowSeconds: 3600 },
  profileUpdate: { max: 20, windowSeconds: 3600 },
  address: { max: 60, windowSeconds: 3600 },
  checkout: { max: 20, windowSeconds: 3600 },
  coupon: { max: 20, windowSeconds: 600 },
  // Public reads that hit the database or an upstream API
  catalogueSearch: { max: 120, windowSeconds: 60 },
  geo: { max: 30, windowSeconds: 600 },
  // Staff
  adminWrite: { max: 300, windowSeconds: 600 },
  adminSensitive: { max: 30, windowSeconds: 600 },
  // Machine endpoints (they also verify signatures; this only caps floods)
  webhook: { max: 600, windowSeconds: 60 },
} satisfies Record<string, Policy>;
export type PolicyName = keyof typeof POLICIES;

export type LimitResult = { ok: true; remaining: number } | { ok: false; retryAfter: number };

/** One-way fingerprint so limiter keys and logs never contain raw emails or addresses. */
export const fingerprint = (value: string) => createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 24);

// ─── in-memory fallback (per instance, bounded) ──────────────────────────────
const memory = new Map<string, { count: number; resetAt: number }>();
function memoryHit(key: string, p: Policy): LimitResult {
  const now = Date.now();
  if (memory.size > 5000) memory.forEach((v, k) => v.resetAt <= now && memory.delete(k));
  const cur = memory.get(key);
  if (!cur || cur.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + p.windowSeconds * 1000 });
    return { ok: true, remaining: p.max - 1 };
  }
  cur.count += 1;
  return cur.count <= p.max ? { ok: true, remaining: p.max - cur.count } : { ok: false, retryAfter: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
}
/** Test helper */
export const __resetMemoryLimiter = () => memory.clear();

/**
 * Counts one attempt for `identity` (an ip hash, user id or email fingerprint) under the named policy.
 */
export async function rateLimit(policy: PolicyName, identity: string | null | undefined): Promise<LimitResult> {
  const p: Policy = POLICIES[policy];
  const key = `${policy}:${identity || "unknown"}`.slice(0, 200);
  try {
    const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_window_seconds: p.windowSeconds, p_max: p.max });
    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("empty limiter response");
    return row.allowed ? { ok: true, remaining: Number(row.remaining) } : { ok: false, retryAfter: Number(row.retry_after) || p.windowSeconds };
  } catch (err: any) {
    console.warn(`[rate-limit] database limiter unavailable (${err?.message || "error"}); using in-memory fallback for ${policy}`);
    return memoryHit(key, p);
  }
}

/** Runs several checks (for example by IP and by account); the first one that is exceeded wins. */
export async function rateLimitAll(checks: [PolicyName, string | null | undefined][]): Promise<LimitResult> {
  let worst: LimitResult = { ok: true, remaining: Number.MAX_SAFE_INTEGER };
  for (const [policy, identity] of checks) {
    const r = await rateLimit(policy, identity);
    if (!r.ok) return r;
    if (worst.ok && r.remaining < worst.remaining) worst = r;
  }
  return worst;
}

/** Friendly text for a blocked request. */
export const tooManyMessage = (retryAfter: number, what = "attempts") => {
  const mins = Math.ceil(retryAfter / 60);
  return mins <= 1 ? `Too many ${what}. Please wait a minute and try again.` : `Too many ${what}. Please try again in about ${mins} minutes.`;
};

/** Housekeeping for the maintenance cron. */
export async function cleanupRateLimits(): Promise<number> {
  try {
    const { data } = await createAdminClient().rpc("rate_limit_cleanup");
    return Number(data) || 0;
  } catch {
    return 0;
  }
}
