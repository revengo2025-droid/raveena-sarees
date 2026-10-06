import { createServerClient, createAdminClient } from "@/lib/supabase";

export type AdminCheck =
  | { ok: true; userId: string; role: "admin" | "staff" }
  | { ok: false; error: string };

/**
 * Server-side authorization for every sensitive action.
 * The role is read from the `profiles` table (never from user-editable metadata).
 * Pass `{ adminOnly: true }` for operations staff must not perform.
 */
export async function requireAdmin(opts: { adminOnly?: boolean } = {}): Promise<AdminCheck> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in to continue." };

    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profile?.role;
    if (role !== "admin" && role !== "staff") {
      console.warn(`[security] Non-admin attempted admin action: ${user.id}`);
      return { ok: false, error: "You do not have permission to perform this action." };
    }
    if (opts.adminOnly && role !== "admin") {
      return { ok: false, error: "Only an administrator can perform this action." };
    }
    return { ok: true, userId: user.id, role };
  } catch {
    return { ok: false, error: "Authorization could not be verified." };
  }
}
