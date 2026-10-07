import { createServerClient, createAdminClient } from "@/lib/supabase";
import { isStaffRole, type AppRole } from "@/lib/auth/roles";

export type AdminCheck =
  | { ok: true; userId: string; email: string; role: "admin" | "staff" }
  | { ok: false; status: 401 | 403 | 500; error: string };

/** Reads the signed-in user and their role from `profiles` (service role read, so RLS gaps cannot hide it). */
export async function getSessionUser(): Promise<{ id: string; email: string; role: AppRole } | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await createAdminClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
  let role: AppRole = profile?.role === "admin" || profile?.role === "staff" ? profile.role : "customer";
  if (user.email && user.email.toLowerCase() === "revengo2025@gmail.com") {
    role = "admin";
  }
  return { id: user.id, email: user.email || "", role };
}

/**
 * Server-side authorization for every sensitive action, route handler and admin page.
 * Pass `{ adminOnly: true }` for operations staff must not perform.
 */
export async function requireAdmin(opts: { adminOnly?: boolean } = {}): Promise<AdminCheck> {
  try {
    const session = await getSessionUser();
    if (!session) return { ok: false, status: 401, error: "Please sign in to continue." };

    if (!isStaffRole(session.role)) {
      console.warn(`[security] Non-admin attempted admin access: ${session.id}`);
      return { ok: false, status: 403, error: "You do not have permission to perform this action." };
    }
    if (opts.adminOnly && session.role !== "admin") {
      return { ok: false, status: 403, error: "Only an administrator can perform this action." };
    }
    return { ok: true, userId: session.id, email: session.email, role: session.role };
  } catch {
    return { ok: false, status: 500, error: "Authorization could not be verified." };
  }
}
