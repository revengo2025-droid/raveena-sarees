"use server";

import { validateContact, cleanToken, cleanLine } from "@/lib/support/validate";
import { submitContact } from "@/lib/support/service";
import { requestIpHash } from "@/lib/support/context";
import { rateLimitAll, fingerprint, tooManyMessage } from "@/lib/security/rate-limit";

export type ContactActionResult =
  | { success: true; ref: string; confirmationEmailed: boolean }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Public contact form. Validation is repeated here (the browser check is only for convenience), the message is
 * stored first, and the emails are queued with retries. The returned flags reflect what really happened.
 */
export async function submitContactMessageAction(values: unknown): Promise<ContactActionResult> {
  const raw = (values && typeof values === "object" ? values : {}) as Record<string, unknown>;

  // Honeypot: people never see this field. Bots get a plain success and nothing is stored.
  if (cleanLine(raw.website)) return { success: true, ref: "RS-00000000", confirmationEmailed: false };

  const v = validateContact(raw);
  if (!v.ok) {
    const first = Object.values(v.errors)[0] || "Please check your details.";
    return { success: false, error: first, fieldErrors: v.errors as Record<string, string> };
  }

  const ipHash = await requestIpHash();
  const limit = await rateLimitAll([
    ["contactIp", ipHash],
    ["contactEmail", fingerprint(v.value.email)],
  ]);
  if (!limit.ok) return { success: false, error: tooManyMessage(limit.retryAfter, "messages") };

  const result = await submitContact(v.value, { token: cleanToken(raw.token), ipHash });
  if (!result.success) return result;
  return { success: true, ref: result.ref, confirmationEmailed: result.confirmationEmailed };
}
