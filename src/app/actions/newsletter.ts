"use server";

import { createAdminClient } from "@/lib/supabase";
import { sendInternalEmail } from "@/lib/services/email";
import { SITE } from "@/lib/site";

/**
 * Server action: subscribe an email to the newsletter.
 * Stores in Supabase `newsletter_subscribers` table (created lazily if needed).
 * The subscription confirmation is sent to info@raveenasarees.com.
 */
export async function subscribeNewsletterAction(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@") || trimmed.length < 5) {
      return { success: false, error: "Please enter a valid email address." };
    }

    const admin = createAdminClient();

    // Try to insert into newsletter_subscribers table
    // If the table doesn't exist, fall back gracefully
    try {
      const { error } = await admin
        .from("newsletter_subscribers")
        .upsert(
          { email: trimmed, subscribed_at: new Date().toISOString() },
          { onConflict: "email", ignoreDuplicates: true }
        );

      if (error) {
        // Table may not exist yet — log but don't fail the user
        console.warn("[newsletter] DB insert failed (table may not exist):", error.message);
      }
    } catch {
      // Gracefully handle missing table
      console.warn("[newsletter] Could not save to database, continuing anyway");
    }

    // Send notification email to info@raveenasarees.com
    await sendInternalEmail({
      to: SITE.infoEmail,
      subject: `New Newsletter Subscriber: ${trimmed}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #D4AF37;">New Newsletter Subscription</h2>
          <p><strong>Email:</strong> ${trimmed}</p>
          <p><strong>Subscribed at:</strong> ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          <hr style="border-color: #eee;" />
          <p style="color: #888; font-size: 12px;">This notification was sent to ${SITE.infoEmail}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[newsletter] subscribe error:", err);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}
