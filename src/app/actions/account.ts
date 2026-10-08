"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { requireCustomer } from "@/lib/support/context";
import { DELETE_CONFIRMATION_WORD } from "@/lib/support/constants";
import { deleteCustomerAccount, getDeletionBlocker } from "@/lib/account/delete";
import { rateLimitAll, tooManyMessage } from "@/lib/security/rate-limit";
import { requestIpHash } from "@/lib/support/context";

/** Lets the settings page warn the customer before they type anything (orders still in progress). */
export async function getAccountDeletionStatusAction(): Promise<{ success: boolean; blocked?: boolean; reason?: string; error?: string }> {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false, error: ctx.error };
  const reason = await getDeletionBlocker(ctx.actor.id);
  return { success: true, blocked: Boolean(reason), reason: reason ?? undefined };
}

/** Confirms the password with a throwaway client so the customer's real session cookie is untouched. */
async function passwordIsCorrect(email: string, password: string): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  const verifier = createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { error } = await verifier.auth.signInWithPassword({ email, password });
  return !error;
}

/**
 * Permanently deletes the signed-in customer's account. The account id is read from the session, never from the
 * request. Requires the typed word DELETE and the current password.
 */
export async function deleteAccountAction(values: { confirmation?: string; password?: string }) {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false as const, error: ctx.error };

  // Password guessing through this form is as sensitive as the login form
  const limit = await rateLimitAll([
    ["reauth", ctx.actor.id],
    ["accountDelete", await requestIpHash()],
  ]);
  if (!limit.ok) return { success: false as const, error: tooManyMessage(limit.retryAfter, "attempts") };

  if ((values?.confirmation ?? "").trim() !== DELETE_CONFIRMATION_WORD) {
    return { success: false as const, error: `Please type ${DELETE_CONFIRMATION_WORD} in capital letters to confirm.` };
  }
  const password = typeof values?.password === "string" ? values.password : "";
  if (!password) return { success: false as const, error: "Please enter your password to confirm it is you." };
  if (!(await passwordIsCorrect(ctx.actor.email, password))) {
    return { success: false as const, error: "That password is not correct." };
  }

  const result = await deleteCustomerAccount({ id: ctx.actor.id, email: ctx.actor.email });
  if (!result.success) return result;

  // End this browser's session cookies (the login itself no longer exists, so every other session is dead too).
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* the account is already gone; cookies expire on their own */
  }

  return {
    success: true as const,
    message: "Your account deletion request has been completed. Some transaction records may be retained where required by law or legitimate business obligations.",
  };
}
