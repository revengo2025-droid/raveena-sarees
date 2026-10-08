"use server";

import { createAdminClient } from "@/lib/supabase";
import { cleanLine, isValidEmail } from "@/lib/support/validate";
import { notifyBusiness } from "@/lib/support/service";
import { SITE } from "@/lib/site";

/** Above this many new subscribers per hour the per-signup alert email is skipped (flood protection). */
const ALERTS_PER_HOUR = 20;

/**
 * Subscribes an email to the newsletter. The address is stored in `newsletter_subscribers`; the business inbox
 * (CONTACT_NOTIFY_EMAIL) gets a queued, retried alert for each genuinely new subscriber.
 */
export async function subscribeNewsletterAction(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const address = cleanLine(email).toLowerCase();
    if (!isValidEmail(address)) return { success: false, error: "Please enter a valid email address." };

    const admin = createAdminClient();
    const { data: added, error } = await admin
      .from("newsletter_subscribers")
      .upsert({ email: address, subscribed_at: new Date().toISOString() }, { onConflict: "email", ignoreDuplicates: true })
      .select("email");

    if (error) {
      // Do not claim success when the address was not saved
      console.error("[newsletter] save failed:", error.message);
      return { success: false, error: "We could not subscribe you right now. Please try again in a moment." };
    }

    if (added && added.length > 0) {
      const { count } = await admin
        .from("newsletter_subscribers")
        .select("email", { count: "exact", head: true })
        .gte("subscribed_at", new Date(Date.now() - 3_600_000).toISOString());
      if ((count ?? 0) <= ALERTS_PER_HOUR) {
        await notifyBusiness(`newsletter:${address}`, {
          title: "New newsletter subscriber",
          facts: [
            { label: "Email", value: address },
            { label: "Subscribed", value: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) },
          ],
          url: `${SITE.url}/admin`,
        }).catch(() => false);
      }
    }
    return { success: true };
  } catch (err) {
    console.error("[newsletter] subscribe error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
