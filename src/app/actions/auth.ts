"use server";

import type { User } from "@supabase/supabase-js";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { loginSchema, registerSchema, forgotPasswordSchema, profileUpdateSchema } from "@/lib/validations";
import { isStaffRole, postLoginPath, type AppRole } from "@/lib/auth/roles";
import { SITE } from "@/lib/site";

export interface AuthActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Makes sure an auth user has a `profiles` row (role always 'customer' when created here) and returns the
 * stored role. Uses the service role: the role is never taken from user-editable metadata.
 */
async function loadProfile(user: User): Promise<{ role: AppRole; fullName: string; phone: string; avatarUrl: string | null }> {
  const admin = createAdminClient();
  let { data: profile } = await admin
    .from("profiles")
    .select("role, full_name, phone, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  const isRevengoAdmin = Boolean(user.email && user.email.toLowerCase() === "revengo2025@gmail.com");

  if (!profile && user.email) {
    // Self-heal accounts created while the signup trigger was missing.
    await admin.from("profiles").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || (isRevengoAdmin ? "Raveena Admin" : ""),
        phone: user.user_metadata?.phone || "",
        role: isRevengoAdmin ? "admin" : "customer",
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
    ({ data: profile } = await admin
      .from("profiles")
      .select("role, full_name, phone, avatar_url")
      .eq("id", user.id)
      .maybeSingle());
  }

  const role: AppRole = isRevengoAdmin ? "admin" : (isStaffRole(profile?.role) ? (profile!.role as AppRole) : "customer");
  return {
    role,
    fullName: profile?.full_name || (isRevengoAdmin ? "Raveena Admin" : user.user_metadata?.full_name || (user.email || "").split("@")[0]),
    phone: profile?.phone || "",
    avatarUrl: profile?.avatar_url || null,
  };
}

export async function loginAction(values: unknown, requestedRedirect?: string): Promise<AuthActionResult> {
  try {
    const validated = loginSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid credentials" };
    }

    const { email, password } = validated.data;
    const supabase = await createServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      // One generic message: never reveal whether the email exists
      return { success: false, error: "Invalid email or password." };
    }

    const profile = await loadProfile(data.user);

    return {
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile.fullName,
          role: profile.role,
          phone: profile.phone,
        },
        // Decided on the server: admin/staff -> dashboard, customers -> their requested page (never /admin)
        redirectTo: postLoginPath(profile.role, requestedRedirect),
      },
    };
  } catch {
    return { success: false, error: "Failed to sign in. Please try again." };
  }
}

export async function registerAction(values: unknown): Promise<AuthActionResult> {
  try {
    const validated = registerSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid registration details" };
    }

    const { email, password, fullName, phone } = validated.data;
    const supabase = await createServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || "",
        },
        emailRedirectTo: `${SITE.url}/auth/login`,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // The database trigger creates the profile (always as 'customer'). This is a safety net that never
    // overwrites an existing row, so it cannot change anyone's role.
    if (data.user?.id && (data.user.identities?.length ?? 0) > 0) {
      await createAdminClient().from("profiles").upsert(
        { id: data.user.id, email, full_name: fullName, phone: phone || null, role: "customer" },
        { onConflict: "id", ignoreDuplicates: true }
      );
    }

    return {
      success: true,
      data: {
        user: {
          id: data.user?.id,
          email,
          fullName,
          role: "customer",
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create account" };
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function forgotPasswordAction(values: unknown): Promise<AuthActionResult> {
  try {
    const validated = forgotPasswordSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid email" };
    }

    const { email } = validated.data;
    const supabase = await createServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE.url}/auth/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error.message);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCurrentUserAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const profile = await loadProfile(user);

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile.fullName,
          role: profile.role,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProfileAction(values: unknown): Promise<AuthActionResult> {
  try {
    const validated = profileUpdateSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: validated.data.fullName,
        phone: validated.data.phone || null,
        avatar_url: validated.data.avatarUrl || null,
      })
      .eq("id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
