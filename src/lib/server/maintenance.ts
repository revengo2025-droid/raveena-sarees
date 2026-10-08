import "server-only";
import { retryDueEmails } from "@/lib/services/email";
import { retryDueFulfillments } from "@/lib/services/shipping/fulfillment";
import { retryPendingWebhookEvents } from "@/lib/services/shipping/tracking";
import { runInBackground } from "./background";
import { cleanupRateLimits } from "@/lib/security/rate-limit";

/** Finishes anything left behind: due email retries, Shiprocket retries, unprocessed webhook events. */
export async function runMaintenance() {
  const [webhooks, fulfillment, emails, rateLimitsPurged] = await Promise.all([
    retryPendingWebhookEvents().catch((e) => ({ error: String(e?.message || e) })),
    retryDueFulfillments().catch((e) => ({ error: String(e?.message || e) })),
    retryDueEmails().catch((e) => ({ error: String(e?.message || e) })),
    cleanupRateLimits(),
  ]);
  return { webhooks, fulfillment, emails, rateLimitsPurged };
}

let lastRun = 0;
const MIN_INTERVAL_MS = 5 * 60_000;

/**
 * Opportunistic maintenance after webhook traffic (at most every 5 minutes per server instance), so
 * retries keep happening even before a scheduler is configured. The cron endpoint is the reliable path.
 */
export function runMaintenanceThrottled() {
  if (Date.now() - lastRun < MIN_INTERVAL_MS) return;
  lastRun = Date.now();
  runInBackground("maintenance", runMaintenance);
}
