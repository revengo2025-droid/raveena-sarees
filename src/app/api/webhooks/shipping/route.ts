import type { NextRequest } from "next/server";
import { handleShiprocketWebhook } from "@/lib/services/shipping/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shiprocket tracking webhook. Register https://www.raveenasarees.com/api/webhooks/shipping in
// Shiprocket > Settings > API > Webhooks, with SHIPROCKET_WEBHOOK_TOKEN as the token.
// (A neutral path is used because Shiprocket may refuse URLs that contain its own brand name.)
export async function POST(req: NextRequest) {
  return handleShiprocketWebhook(req);
}
