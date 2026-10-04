"use server";

import { createServerClient } from "@/lib/supabase";
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, profileUpdateSchema } from "@/lib/validations";
import { getEmailService } from "@/lib/services/email";

export interface AuthActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function loginAction(values: unknown): Promise<AuthActionResult> {
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

    if (error) {
      return { success: false, error: error.message };
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    return {
      success: true,
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          fullName: profile?.full_name || data.user.user_metadata?.full_name || email.split("@")[0],
          role: profile?.role || data.user.user_metadata?.role || "customer",
          phone: profile?.phone || "",
        },
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to log in" };
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
          role: "customer",
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Try upserting profile in public.profiles table
    if (data.user?.id) {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        phone: phone || null,
        role: "customer",
      });
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
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/reset-password`,
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0],
          role: profile?.role || user.user_metadata?.role || "customer",
          phone: profile?.phone || "",
          avatarUrl: profile?.avatar_url || null,
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
