import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { getEmailConfig } from "@/lib/services/email";
import { isRazorpayLive } from "@/lib/services/payment/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sha = (s: string) => createHash("sha256").update(s).digest();

/**
 * Readiness: can this instance reach its database?
 * - Anyone gets a minimal answer (`ready` / `degraded`) suitable for uptime monitors.
 * - Only a caller holding CRON_SECRET (Authorization: Bearer ...) also sees which integrations are configured.
 *   Values, URLs and error texts are never returned.
 */
export async function GET(req: NextRequest) {
  let database = false;
  try {
    const { error } = await createAdminClient().from("store_settings").select("key", { head: true, count: "exact" }).limit(1);
    database = !error;
  } catch {
    database = false;
  }

  const secret = process.env.CRON_SECRET || "";
  const header = req.headers.get("authorization") || "";
  const privileged = secret.length >= 16 && timingSafeEqual(sha(header), sha(`Bearer ${secret}`));

  const body: Record<string, unknown> = { status: database ? "ready" : "degraded" };
  if (privileged) {
    body.checks = {
      database,
      email: Boolean(getEmailConfig().config),
      payments: Boolean(isRazorpayLive),
      shiprocketWebhookToken: Boolean(process.env.SHIPROCKET_WEBHOOK_TOKEN),
      cronSecret: true,
    };
  }
  return NextResponse.json(body, { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
