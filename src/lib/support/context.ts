// Server-side request context for support/account actions. Server-only.
import "server-only";
import { headers } from "next/headers";
import { createHmac } from "crypto";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { isStaffRole } from "@/lib/auth/roles";
import type { CustomerActor } from "./service";

/** Keyed hash of the caller's IP, used only to rate-limit abuse. The raw address is never stored. */
export async function requestIpHash(): Promise<string | null> {
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "";
    if (!ip) return null;
    const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "raveena-sarees";
    return createHmac("sha256", salt).update(ip).digest("hex");
  } catch {
    return null;
  }
}

export type CustomerContext =
  | { ok: true; actor: CustomerActor }
  | { ok: false; error: string };

/**
 * The signed-in CUSTOMER, derived from the session cookie. The id, email and name always come from the server,
 * never from the request body. Staff accounts are not customers and are refused.
 */
export async function requireCustomer(): Promise<CustomerContext> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) return { ok: false, error: "Please sign in to continue." };

    const { data: profile } = await createAdminClient().from("profiles").select("role, full_name").eq("id", user.id).maybeSingle();
    if (isStaffRole(profile?.role)) return { ok: false, error: "Admin accounts use the admin dashboard." };

    const name = (profile?.full_name || user.user_metadata?.full_name || user.email.split("@")[0] || "Customer").toString().slice(0, 150);
    return { ok: true, actor: { id: user.id, email: user.email.toLowerCase(), name } };
  } catch {
    return { ok: false, error: "We could not verify your session. Please sign in again." };
  }
}
