import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { runMaintenance } from "@/lib/server/maintenance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Retries failed/pending emails, Shiprocket syncs and webhook events.
 * Call every 5-15 minutes with header `Authorization: Bearer <CRON_SECRET>`
 * (Vercel Cron sends this header automatically when CRON_SECRET is set; any external scheduler works too).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  const sha = (s: string) => createHash("sha256").update(s).digest();
  if (!secret || secret.length < 16 || !timingSafeEqual(sha(header), sha(`Bearer ${secret}`))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runMaintenance();
  return NextResponse.json({ ok: true, ...result });
}
