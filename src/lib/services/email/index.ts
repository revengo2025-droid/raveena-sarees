// =============================================================================
// Centralised email service (Resend)
// -----------------------------------------------------------------------------
// - Every transactional email goes through `queueEmail()`: one `email_events` row per logical email,
//   keyed by a unique `event_key`, so duplicate webhooks / retries / refreshes never send twice.
// - Delivery claims the row with a short lease, calls Resend with an Idempotency-Key, and records
//   the outcome. Failures are kept with the error and retried with backoff (cron or admin retry).
// - A failed email never affects the order or shipment.
// Server-only: the API key is never sent to the browser.
// =============================================================================
import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { SITE } from "@/lib/site";
import { renderEmail, type EmailData, type EmailTemplate } from "./templates";

export type { EmailTemplate } from "./templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
export const EMAIL_MAX_ATTEMPTS = 6;
const LEASE_MS = 60_000;

export interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo: string;
}

/** Reads Resend settings. Returns null (and the reason) when email is not configured. */
export function getEmailConfig(): { config: EmailConfig | null; reason?: string } {
  const apiKey = (process.env.RESEND_API_KEY || "").trim();
  const fromEmail = (process.env.RESEND_FROM_EMAIL || "").trim();
  const fromName = (process.env.RESEND_FROM_NAME || SITE.name).trim();
  const replyTo = (process.env.RESEND_REPLY_TO || SITE.email).trim();

  if (!apiKey || /placeholder|re_x{4,}/i.test(apiKey)) return { config: null, reason: "RESEND_API_KEY is not set" };
  if (!fromEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromEmail)) return { config: null, reason: "RESEND_FROM_EMAIL is not set" };
  // A sender must be on a domain verified in Resend; free mailbox domains cannot be verified.
  if (/@(gmail|yahoo|outlook|hotmail)\./i.test(fromEmail)) {
    return { config: null, reason: "RESEND_FROM_EMAIL must use your verified domain (e.g. orders@raveenasarees.com), not a Gmail address" };
  }
  return { config: { apiKey, from: `${fromName} <${fromEmail}>`, replyTo } };
}

export interface SendResult {
  ok: boolean;
  id?: string;
  error?: string;
  retryable?: boolean;
}

/** Low-level Resend call. Prefer `queueEmail()` for anything customer-facing. */
export async function sendViaResend(msg: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  idempotencyKey?: string;
}): Promise<SendResult> {
  const { config, reason } = getEmailConfig();
  if (!config) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] not sent (${reason}) -> ${Array.isArray(msg.to) ? msg.to.join(", ") : msg.to}: ${msg.subject}`);
    }
    return { ok: false, error: `Email provider not configured: ${reason}`, retryable: true };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        ...(msg.idempotencyKey ? { "Idempotency-Key": msg.idempotencyKey.slice(0, 256) } : {}),
      },
      body: JSON.stringify({
        from: config.from,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        reply_to: config.replyTo,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let message = body.slice(0, 300);
      try {
        message = JSON.parse(body)?.message || message;
      } catch {}
      // 4xx (except 409/429) are permanent problems such as an unverified domain or invalid address
      const retryable = res.status >= 500 || res.status === 429 || res.status === 409;
      return { ok: false, error: `Resend ${res.status}: ${message}`, retryable };
    }
    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err: any) {
    return { ok: false, error: `Resend request failed: ${err?.message || "network error"}`, retryable: true };
  }
}

async function stillRelevant(ev: { template: string; order_id: string | null }): Promise<string | null> {
  if (ev.template !== "payment_failed" || !ev.order_id) return null;
  const { data } = await createAdminClient().from("orders").select("payment_status").eq("id", ev.order_id).maybeSingle();
  return data?.payment_status === "paid" ? "Skipped: the order was paid after the failed attempt" : null;
}

const backoffMs = (attempt: number) => Math.min(6 * 60 * 60_000, 5 * 60_000 * 2 ** Math.max(0, attempt - 1));

/**
 * Delivers one queued email. Safe to call concurrently: only the caller that wins the lease sends.
 * `force` lets an admin retry an email that already used all automatic attempts.
 */
export async function deliverEmailEvent(id: string, opts: { force?: boolean } = {}): Promise<SendResult & { skipped?: boolean }> {
  const db = createAdminClient();
  const now = new Date();
  const { data: claimed, error: claimError } = await db
    .from("email_events")
    .update({ status: "sending", locked_until: new Date(now.getTime() + LEASE_MS).toISOString(), updated_at: now.toISOString() })
    .eq("id", id)
    .in("status", ["pending", "failed"])
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select("*")
    .maybeSingle();

  if (claimError) return { ok: false, error: claimError.message };
  if (!claimed) return { ok: false, skipped: true, error: "Already sent or being sent" };
  if (!opts.force && claimed.attempts >= EMAIL_MAX_ATTEMPTS) {
    await db.from("email_events").update({ status: "failed", locked_until: null, next_retry_at: null }).eq("id", id);
    return { ok: false, skipped: true, error: "Maximum attempts reached" };
  }

  // Some emails are only relevant while a condition still holds (e.g. "payment failed" but the customer paid since)
  const skipReason = await stillRelevant(claimed);
  if (skipReason) {
    await db
      .from("email_events")
      .update({ status: "skipped", last_error: skipReason, locked_until: null, next_retry_at: null, updated_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: false, skipped: true, error: skipReason };
  }

  let result: SendResult;
  try {
    const rendered = renderEmail(claimed.template as EmailTemplate, claimed.payload as EmailData);
    result = await sendViaResend({
      to: claimed.recipient,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      idempotencyKey: `rvn-${claimed.event_key}`,
    });
  } catch (err: any) {
    result = { ok: false, error: `Render failed: ${err?.message || err}`, retryable: false };
  }

  const attempts = (claimed.attempts || 0) + 1;
  if (result.ok) {
    await db
      .from("email_events")
      .update({
        status: "sent",
        attempts,
        provider_message_id: result.id || null,
        last_error: null,
        locked_until: null,
        next_retry_at: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  } else {
    const canRetry = result.retryable !== false && attempts < EMAIL_MAX_ATTEMPTS;
    await db
      .from("email_events")
      .update({
        status: "failed",
        attempts,
        last_error: (result.error || "Unknown error").slice(0, 1000),
        locked_until: null,
        next_retry_at: canRetry ? new Date(Date.now() + backoffMs(attempts)).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    console.error(`[email] ${claimed.template} for ${claimed.event_key} failed (attempt ${attempts}): ${result.error}`);
  }
  return result;
}

/**
 * Queues (and immediately tries to deliver) a transactional email exactly once per `eventKey`.
 * Returns 'duplicate' when the same logical email was already queued — nothing is sent again.
 */
export async function queueEmail(input: {
  eventKey: string;
  template: EmailTemplate;
  recipient: string;
  data: EmailData;
  orderId?: string | null;
  /** Delay delivery (picked up by the maintenance job). */
  sendAfter?: Date;
}): Promise<{ status: "sent" | "failed" | "queued" | "duplicate" | "error"; id?: string; error?: string }> {
  try {
    if (!input.recipient || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.recipient)) {
      return { status: "error", error: "Invalid recipient" };
    }
    const rendered = renderEmail(input.template, input.data); // validates the data before storing
    const db = createAdminClient();
    const { data: rows, error } = await db
      .from("email_events")
      .upsert(
        {
          event_key: input.eventKey.slice(0, 200),
          template: input.template,
          order_id: input.orderId || null,
          recipient: input.recipient.trim().toLowerCase(),
          subject: rendered.subject.slice(0, 255),
          payload: input.data as any,
          status: "pending",
          next_retry_at: input.sendAfter ? input.sendAfter.toISOString() : null,
        },
        { onConflict: "event_key", ignoreDuplicates: true }
      )
      .select("id");

    if (error) {
      console.error(`[email] could not queue ${input.eventKey}: ${error.message}`);
      return { status: "error", error: error.message };
    }
    const id = rows?.[0]?.id as string | undefined;
    if (!id) return { status: "duplicate" };
    if (input.sendAfter && input.sendAfter.getTime() > Date.now()) return { status: "queued", id };

    const result = await deliverEmailEvent(id);
    return { status: result.ok ? "sent" : "failed", id, error: result.error };
  } catch (err: any) {
    console.error(`[email] queue error for ${input.eventKey}:`, err?.message || err);
    return { status: "error", error: err?.message || "Unknown error" };
  }
}

/** Retries failed emails whose backoff has elapsed (called by the cron endpoint). */
export async function retryDueEmails(limit = 20): Promise<{ attempted: number; sent: number }> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data } = await db
    .from("email_events")
    .select("id")
    .eq("status", "failed")
    .not("next_retry_at", "is", null)
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(limit);
  // Rows stuck in 'sending' after a crash become claimable again once their lease expires
  const { data: stuck } = await db
    .from("email_events")
    .select("id")
    .eq("status", "sending")
    .lt("locked_until", nowIso)
    .limit(limit);
  if (stuck?.length) {
    await db.from("email_events").update({ status: "failed", locked_until: null, next_retry_at: nowIso }).in("id", stuck.map((r) => r.id));
  }

  // Scheduled emails that are due, and queued emails never attempted (the request ended before delivery)
  const { data: orphaned } = await db
    .from("email_events")
    .select("id")
    .eq("status", "pending")
    .or(`next_retry_at.lte.${nowIso},and(next_retry_at.is.null,created_at.lt.${new Date(Date.now() - 2 * 60_000).toISOString()})`)
    .limit(limit);

  let sent = 0;
  const ids = [...(data || []), ...(stuck || []), ...(orphaned || [])].map((r) => r.id as string);
  for (const id of ids) {
    const r = await deliverEmailEvent(id);
    if (r.ok) sent++;
  }
  return { attempted: ids.length, sent };
}

/**
 * Back-compat for internal (non-customer) notifications such as the contact-form alert to the store.
 * Logs failures; never throws.
 */
export async function sendInternalEmail(msg: { to: string | string[]; subject: string; html: string; text?: string }) {
  const r = await sendViaResend(msg);
  if (!r.ok) console.error(`[email] internal notification failed: ${r.error}`);
  return r;
}
