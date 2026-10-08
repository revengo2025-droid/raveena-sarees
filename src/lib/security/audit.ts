// Security audit trail (append-only `audit_logs`, see migration 008). Server-only.
// Records WHO did WHAT to WHICH resource and WHEN. Never pass passwords, tokens, payment details or free-text
// customer content: metadata is also scrubbed defensively. Failing to write an audit row never blocks the action.
import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { log } from "./logger";

export type AuditAction =
  | "auth.login"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset_requested"
  | "auth.password_changed"
  | "account.deleted"
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.images_changed"
  | "catalogue.import"
  | "order.status_change"
  | "order.fulfillment_retry"
  | "order.email_retry"
  | "coupon.create"
  | "coupon.delete"
  | "review.moderate"
  | "settings.offer_popup"
  | "settings.festive_drops"
  | "ticket.reply"
  | "ticket.status_change"
  | "ticket.note"
  | "contact.status_change"
  | "contact.notes"
  | "contact.delete"
  | "security.access_denied";

export interface AuditEvent {
  action: AuditAction;
  /** The signed-in actor, when there is one. */
  actorId?: string | null;
  entityType: string;
  entityId?: string | null;
  /** Small, non-sensitive facts (ids, statuses, counts). */
  meta?: Record<string, unknown>;
  /** Keyed IP hash, never the raw address. */
  ipHash?: string | null;
}

const SENSITIVE_KEY = /pass(word)?|token|secret|authorization|cookie|api[-_]?key|card|cvv|otp/i;

export function scrubMeta(meta: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!meta) return null;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta).slice(0, 20)) {
    if (SENSITIVE_KEY.test(k)) continue;
    if (typeof v === "string") out[k] = v.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 200);
    else if (typeof v === "number" || typeof v === "boolean" || v === null) out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 20).map((x) => (typeof x === "string" ? x.slice(0, 80) : typeof x === "number" ? x : null));
  }
  return Object.keys(out).length ? out : null;
}

export async function audit(e: AuditEvent): Promise<void> {
  try {
    const { error } = await createAdminClient()
      .from("audit_logs")
      .insert({
        user_id: e.actorId || null,
        action: e.action,
        entity_type: e.entityType.slice(0, 50),
        entity_id: e.entityId ? String(e.entityId).slice(0, 100) : null,
        new_data: scrubMeta(e.meta),
        ip_address: e.ipHash ? e.ipHash.slice(0, 32) : null,
      });
    if (error) log.warn("audit.write_failed", { action: e.action, error: error.message });
  } catch (err: any) {
    log.warn("audit.write_failed", { action: e.action, error: err?.message });
  }
}
