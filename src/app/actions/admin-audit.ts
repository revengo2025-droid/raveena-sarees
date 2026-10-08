"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { safeFilterTerm } from "@/lib/security/sanitize";
import { log } from "@/lib/security/logger";

const PAGE_SIZE = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface AuditRow {
  id: string;
  at: string;
  action: string;
  actor: string | null;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
}

/** Security audit log viewer. Administrators only (staff cannot read it). Read-only: the table is append-only. */
export async function listAuditLogsAction(filters: { action?: string; from?: string; to?: string; page?: number }) {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false as const, error: auth.error };
  const limit = await rateLimit("adminWrite", auth.userId);
  if (!limit.ok) return { success: false as const, error: tooManyMessage(limit.retryAfter, "requests") };

  try {
    const page = Math.max(1, Math.floor(Number(filters?.page) || 1));
    let q = createAdminClient()
      .from("audit_logs")
      .select("id, created_at, action, user_id, entity_type, entity_id, new_data", { count: "exact" });

    const action = safeFilterTerm(filters?.action, 40).replace(/\s/g, "");
    if (action) q = q.ilike("action", `${action}%`);
    if (filters?.from && DATE_RE.test(filters.from)) q = q.gte("created_at", new Date(`${filters.from}T00:00:00+05:30`).toISOString());
    if (filters?.to && DATE_RE.test(filters.to)) q = q.lte("created_at", new Date(`${filters.to}T23:59:59.999+05:30`).toISOString());

    const { data, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) {
      log.warn("audit.list_failed", { error: error.message });
      return { success: false as const, error: "Could not load the audit log. Has migration 008 been run?" };
    }

    const ids = Array.from(new Set((data || []).map((r: any) => r.user_id).filter(Boolean))) as string[];
    const emails: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await createAdminClient().from("profiles").select("id, email").in("id", ids);
      for (const p of profs || []) emails[p.id] = p.email;
    }
    const rows: AuditRow[] = (data || []).map((r: any) => ({
      id: r.id,
      at: r.created_at,
      action: r.action,
      actor: r.user_id ? emails[r.user_id] || "(deleted account)" : null,
      entityType: r.entity_type,
      entityId: r.entity_id,
      details: r.new_data ?? null,
    }));
    return { success: true as const, rows, total: count ?? rows.length, page, pageSize: PAGE_SIZE };
  } catch (err: any) {
    log.error("audit.list_error", { error: err?.message });
    return { success: false as const, error: "Could not load the audit log." };
  }
}
