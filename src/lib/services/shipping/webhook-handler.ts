import "server-only";
import { timingSafeEqual, createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { runInBackground } from "@/lib/server/background";
import { runMaintenanceThrottled } from "@/lib/server/maintenance";
import { processShippingWebhookEvent, snapshotFromWebhook, webhookDedupeKey } from "./tracking";

/** Constant-time comparison of the token Shiprocket sends in the `x-api-key` header. */
export function isValidShiprocketToken(received: string | null, expected: string | undefined): boolean {
  if (!expected || !received) return false;
  // Hash both sides so lengths always match for timingSafeEqual
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Shiprocket tracking webhook.
 * 1. Authenticate (x-api-key == SHIPROCKET_WEBHOOK_TOKEN, set as the "Token" in Shiprocket > Settings > API > Webhooks).
 * 2. Store the event under a dedupe key (duplicate deliveries are acknowledged and ignored).
 * 3. Return 200 immediately; process after the response (stored events are retried by maintenance).
 */
export async function handleShiprocketWebhook(req: NextRequest) {
  const expected = process.env.SHIPROCKET_WEBHOOK_TOKEN;
  if (!expected) {
    console.error("[shiprocket-webhook] SHIPROCKET_WEBHOOK_TOKEN is not configured; rejecting");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!isValidShiprocketToken(req.headers.get("x-api-key"), expected)) {
    console.warn("[shiprocket-webhook] rejected request with invalid token");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.text();
  if (raw.length > 256 * 1024) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  let body: any = null;
  try {
    body = raw ? JSON.parse(raw) : null;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Shiprocket sends a test call when the URL is saved: acknowledge it
  if (!body || typeof body !== "object" || (!body.awb && !body.order_id && !body.sr_order_id)) {
    return NextResponse.json({ ok: true });
  }

  const snap = snapshotFromWebhook(body);
  const { data: rows, error } = await createAdminClient()
    .from("shipping_webhook_events")
    .upsert(
      {
        provider: "shiprocket",
        dedupe_key: webhookDedupeKey(body),
        order_number: snap.reference?.slice(0, 50) || null,
        awb: snap.awb?.slice(0, 100) || null,
        status_label: snap.statusLabel?.slice(0, 150) || null,
        status_code: snap.statusCode,
        payload: body,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    )
    .select("id");

  if (error) {
    // Could not persist: ask Shiprocket to retry rather than lose the update
    console.error("[shiprocket-webhook] could not store event:", error.message);
    return NextResponse.json({ error: "Temporarily unavailable" }, { status: 500 });
  }

  const eventId = rows?.[0]?.id as string | undefined;
  if (eventId) runInBackground(`shiprocket-event:${eventId}`, () => processShippingWebhookEvent(eventId));
  runMaintenanceThrottled();
  return NextResponse.json({ ok: true, duplicate: !eventId });
}
