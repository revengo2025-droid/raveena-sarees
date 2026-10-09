"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";

const PAGE_SIZE = 50;

export interface AdminCustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  secondaryPhone: string | null;
  city: string | null;
  state: string | null;
  ordersCount: number;
  paidSpend: number;
  joinedAt: string;
}

/** Strips characters that carry meaning inside a PostgREST or()/ilike filter. */
const safeSearch = (s: unknown) =>
  String(s ?? "")
    .trim()
    .replace(/[,()%*_\\"'`:;<>[\]{}|&=]/g, "")
    .slice(0, 60);

/**
 * Registered customer accounts for the admin Customers page (staff only, re-checked on the server).
 * Includes both mobile numbers so the team can reach a customer about a delivery or a support query.
 */
export async function listCustomersAction(opts: { search?: string; page?: number } = {}) {
  const a = await requireAdmin();
  if (!a.ok) return { success: false as const, error: a.error };
  const limit = await rateLimit("adminWrite", a.userId);
  if (!limit.ok) return { success: false as const, error: tooManyMessage(limit.retryAfter, "requests") };

  try {
    const db = createAdminClient();
    const page = Math.max(1, Math.floor(Number(opts.page) || 1));
    let q = db
      .from("profiles")
      .select("id, full_name, email, phone, secondary_phone, created_at", { count: "exact" })
      .or("role.is.null,role.eq.customer");
    const term = safeSearch(opts.search);
    if (term) q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,secondary_phone.ilike.%${term}%`);
    const { data: profiles, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    if (error) return { success: false as const, error: "Could not load customers." };

    const ids = (profiles || []).map((p: any) => p.id as string);
    const stats: Record<string, { orders: number; spend: number }> = {};
    const places: Record<string, { city: string; state: string }> = {};
    if (ids.length) {
      const [{ data: orders }, { data: addresses }] = await Promise.all([
        db.from("orders").select("user_id, total_amount, payment_status").in("user_id", ids),
        db.from("user_addresses").select("user_id, city, state, is_default, created_at").in("user_id", ids).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      for (const o of orders || []) {
        const s = (stats[o.user_id] ||= { orders: 0, spend: 0 });
        s.orders += 1;
        if (o.payment_status === "paid") s.spend += Number(o.total_amount) || 0;
      }
      // The default address (or the newest one) gives the customer's city
      for (const ad of addresses || []) if (!places[ad.user_id]) places[ad.user_id] = { city: ad.city, state: ad.state };
    }

    const rows: AdminCustomerRow[] = (profiles || []).map((p: any) => ({
      id: p.id,
      name: p.full_name || (p.email || "").split("@")[0],
      email: p.email,
      phone: p.phone || null,
      secondaryPhone: p.secondary_phone || null,
      city: places[p.id]?.city || null,
      state: places[p.id]?.state || null,
      ordersCount: stats[p.id]?.orders || 0,
      paidSpend: stats[p.id]?.spend || 0,
      joinedAt: p.created_at,
    }));
    return { success: true as const, rows, total: count ?? rows.length, page, pageSize: PAGE_SIZE };
  } catch {
    return { success: false as const, error: "Could not load customers." };
  }
}
