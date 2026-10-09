import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { safeRedirectPath } from "@/lib/auth/roles";
import { SITE } from "@/lib/site";
import { log } from "@/lib/security/logger";

// Landing point for the links in confirmation and password-reset emails. Turns the one-time `code` into a
// session cookie, then sends the person on. `next` can only be a same-site path (no open redirect).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"), "/account");
  const base = SITE.url;

  // Email templates that send a token hash belong to /auth/confirm (works across devices); forward them there
  if (searchParams.get("token_hash")) {
    const target = new URL(`${base}/auth/confirm`);
    searchParams.forEach((v, k) => target.searchParams.set(k, v));
    return NextResponse.redirect(target);
  }

  if (code && code.length < 512) {
    try {
      const supabase = await createServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(`${base}${next}`);
      log.warn("auth.callback_exchange_failed", { status: error.status });
    } catch (err: any) {
      log.error("auth.callback_error", { error: err?.message });
    }
  }
  // A failed password-reset link goes back to the reset request page, where a fresh link is one click away
  if (next === "/auth/reset-password") return NextResponse.redirect(`${base}/auth/forgot-password?error=link`);
  return NextResponse.redirect(`${base}/auth/login?error=link`);
}
