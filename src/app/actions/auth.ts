"use server";

import type { User } from "@supabase/supabase-js";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { loginSchema, registerSchema, forgotPasswordSchema, profileUpdateSchema, resetPasswordSchema } from "@/lib/validations";
import { isStaffRole, postLoginPath, type AppRole } from "@/lib/auth/roles";
import { SITE } from "@/lib/site";
import { rateLimit, rateLimitAll, fingerprint, tooManyMessage } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { log } from "@/lib/security/logger";
import { requestIpHash } from "@/lib/support/context";

export interface AuthActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
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

  // Optional first-admin bootstrap from the server environment (ADMIN_BOOTSTRAP_EMAILS, comma separated).
  // Only a CONFIRMED email can be promoted, and only when no profile exists yet. Normal role changes are made in the database.
  const bootstrapEmails = (process.env.ADMIN_BOOTSTRAP_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isRevengoAdmin = Boolean(user.email && user.email_confirmed_at && bootstrapEmails.includes(user.email.toLowerCase()));

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

  // The profiles table is the only source of truth for the role
  const role: AppRole = isStaffRole(profile?.role) ? (profile!.role as AppRole) : "customer";
  return {
    role,
    fullName: profile?.full_name || user.user_metadata?.full_name || (user.email || "").split("@")[0],
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

    // Throttle guessing per network and per account, before touching the auth server
    const ipHash = await requestIpHash();
    const limit = await rateLimitAll([
      ["loginIp", ipHash],
      ["loginAccount", fingerprint(email)],
    ]);
    if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter, "sign-in attempts") };

    const supabase = await createServerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // The auth service being unreachable or erroring is not a wrong password: say so, and do not count it as a failed login
    if (error && (error.name === "AuthRetryableFetchError" || error.status === 0 || (typeof error.status === "number" && error.status >= 500))) {
      log.error("auth.login_service_error", { status: error.status });
      return { success: false, error: "We could not reach our sign-in service. Please try again in a moment." };
    }

    // Supabase only says "email not confirmed" after the password has been checked, so this reveals nothing to a
    // guesser. Send a fresh confirmation link (throttled) instead of the misleading "wrong password" message.
    if (error?.code === "email_not_confirmed") {
      const resend = await rateLimit("confirmResendAccount", fingerprint(email));
      if (resend.ok) {
        const { error: resendError } = await supabase.auth.resend({
          type: "signup",
          email,
          options: { emailRedirectTo: `${SITE.url}/auth/callback?next=/account` },
        });
        if (resendError) log.warn("auth.confirm_resend_failed", { status: resendError.status });
      }
      return {
        success: false,
        code: "EMAIL_NOT_CONFIRMED",
        error: "Please confirm your email address first. We have sent you a new confirmation link: open it, then sign in. If it is not in your inbox, check the Spam and Promotions folders.",
      };
    }

    if (error || !data.user) {
      await audit({ action: "auth.login_failed", entityType: "auth", meta: { account: fingerprint(email) }, ipHash });
      // One generic message: never reveal whether the email exists
      return { success: false, error: "Invalid email or password." };
    }

    const profile = await loadProfile(data.user);
    await audit({ action: "auth.login", actorId: data.user.id, entityType: "auth", meta: { role: profile.role }, ipHash });

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
  } catch (err: any) {
    log.error("auth.login_error", { error: err?.message });
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
    const ipHash = await requestIpHash();
    const limit = await rateLimit("registerIp", ipHash);
    if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter, "sign-up attempts") };
    const supabase = await createServerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          phone: phone || "",
        },
        emailRedirectTo: `${SITE.url}/auth/callback?next=/account`,
      },
    });

    if (error) {
      // Weak-password style problems are safe and useful to show; anything else (including "already registered")
      // gets one neutral message so the form cannot be used to discover which emails have accounts.
      if (/password/i.test(error.message) && !/registered|exists/i.test(error.message)) return { success: false, error: error.message };
      log.warn("auth.register_failed", { status: error.status });
      return { success: false, error: "We could not create your account with those details. If you already have an account, please sign in or reset your password." };
    }
    await audit({ action: "auth.register", actorId: data.user?.id, entityType: "auth", ipHash });

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
        // False when the project requires the customer to confirm their email before they can sign in
        signedIn: Boolean(data.session),
      },
    };
  } catch (err: any) {
    log.error("auth.register_error", { error: err?.message });
    return { success: false, error: "We could not create your account right now. Please try again." };
  }
}

export async function logoutAction(): Promise<AuthActionResult> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.auth.signOut();
    if (user) await audit({ action: "auth.logout", actorId: user.id, entityType: "auth" });
    return { success: true };
  } catch (err: any) {
    log.warn("auth.logout_error", { error: err?.message });
    return { success: false, error: "Could not sign out cleanly. Please close the browser tab." };
  }
}

export async function forgotPasswordAction(values: unknown): Promise<AuthActionResult> {
  try {
    const validated = forgotPasswordSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid email" };
    }

    const { email } = validated.data;
    const limit = await rateLimitAll([
      ["passwordResetIp", await requestIpHash()],
      ["passwordResetAccount", fingerprint(email)],
    ]);
    if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter, "reset requests") };

    const supabase = await createServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE.url}/auth/callback?next=/auth/reset-password`,
    });

    if (error) {
      log.warn("auth.password_reset_request_failed", { status: error.status });
    }
    await audit({ action: "auth.password_reset_requested", entityType: "auth", meta: { account: fingerprint(email) } });

    // Same answer whether or not the account exists
    return { success: true };
  } catch (err: any) {
    log.error("auth.password_reset_error", { error: err?.message });
    return { success: false, error: "We could not send the reset email right now. Please try again." };
  }
}

/**
 * Sets a new password for the person who just opened a valid recovery link (the callback route already
 * turned the link into a session). Every other session is signed out afterwards.
 */
export async function resetPasswordAction(values: unknown): Promise<AuthActionResult> {
  try {
    const validated = resetPasswordSchema.safeParse(values);
    if (!validated.success) return { success: false, error: validated.error.issues[0]?.message || "Invalid password" };

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "This reset link has expired. Please request a new one." };

    const limit = await rateLimit("reauth", user.id);
    if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter) };

    const { error } = await supabase.auth.updateUser({ password: validated.data.password });
    if (error) return { success: false, error: /password/i.test(error.message) ? error.message : "We could not update your password. Please request a new link." };

    // Sign out everywhere so a stolen session cannot survive the password change
    await supabase.auth.signOut({ scope: "global" });
    await audit({ action: "auth.password_changed", actorId: user.id, entityType: "auth" });
    return { success: true };
  } catch (err: any) {
    log.error("auth.reset_error", { error: err?.message });
    return { success: false, error: "We could not update your password right now. Please try again." };
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
          joinedAt: user.created_at,
        },
      },
    };
  } catch (err: any) {
    log.warn("auth.current_user_error", { error: err?.message });
    return { success: false, error: "Not authenticated" };
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

    const limit = await rateLimit("profileUpdate", user.id);
    if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter, "changes") };

    const changes: { full_name: string; phone: string | null; avatar_url?: string | null } = {
      full_name: validated.data.fullName,
      phone: validated.data.phone || null,
    };
    // Only touch the photo when the form actually sends one, so saving the name never wipes it
    if (validated.data.avatarUrl !== undefined) changes.avatar_url = validated.data.avatarUrl || null;

    const { data: saved, error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", user.id)
      .select("full_name, phone")
      .maybeSingle();

    if (error || !saved) {
      log.warn("auth.profile_update_failed", { error: error?.message || "no row updated" });
      return { success: false, error: "We could not save your profile. Please try again." };
    }

    return { success: true, data: { fullName: saved.full_name || validated.data.fullName, phone: saved.phone || "" } };
  } catch (err: any) {
    log.error("auth.profile_update_error", { error: err?.message });
    return { success: false, error: "We could not save your profile. Please try again." };
  }
}
