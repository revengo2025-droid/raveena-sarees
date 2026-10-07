import type { NextRequest } from "next/server";
import { handleShiprocketWebhook } from "@/lib/services/shipping/webhook-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Alias of /api/webhooks/shipping (same handler, same authentication and deduplication).
export async function POST(req: NextRequest) {
  return handleShiprocketWebhook(req);
}
