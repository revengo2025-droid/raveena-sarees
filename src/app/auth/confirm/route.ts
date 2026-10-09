import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@/lib/supabase";
import { safeRedirectPath } from "@/lib/auth/roles";
import { SITE } from "@/lib/site";
import { log } from "@/lib/security/logger";

const TYPES: EmailOtpType[] = ["signup", "email", "recovery", "invite", "magiclink", "email_change"];

// Landing point for email links built as {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...
// Unlike the `code` flow, a token hash does not need a cookie from the browser that asked for the email, so the
// link works when it is opened on another phone, in the Gmail app, or in a different browser.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const isRecovery = type === "recovery";
  const next = safeRedirectPath(searchParams.get("next"), isRecovery ? "/auth/reset-password" : "/account");
  const base = SITE.url;
  const failure = isRecovery ? `${base}/auth/forgot-password?error=link` : `${base}/auth/login?error=link`;

  if (!tokenHash || tokenHash.length > 512 || !type || !TYPES.includes(type)) return NextResponse.redirect(failure);

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${base}${isRecovery ? "/auth/reset-password" : next}`);
    log.warn("auth.confirm_verify_failed", { status: error.status, type });
  } catch (err: any) {
    log.error("auth.confirm_error", { error: err?.message });
  }
  return NextResponse.redirect(failure);
}
