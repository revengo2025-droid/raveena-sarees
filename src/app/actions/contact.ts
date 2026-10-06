"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase";
import { getEmailService } from "@/lib/services/email";
import { INDIAN_MOBILE_RE, normaliseIndianMobile } from "@/lib/geo/india";
import { SITE } from "@/lib/site";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  subject: z.string().trim().min(2).max(150),
  message: z.string().trim().min(10, "Please write a few more words so we can help").max(3000),
  website: z.string().max(0).optional(), // honeypot: real people leave this empty
});

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));

const MAX_PER_HOUR = 5;

export async function submitContactMessageAction(values: unknown) {
  try {
    const parsed = schema.safeParse(values);
    if (!parsed.success) {
      // A filled honeypot gets a silent "success" so bots learn nothing
      if (parsed.error.issues.some((i) => i.path[0] === "website")) return { success: true as const };
      return { success: false as const, error: parsed.error.issues[0]?.message || "Please check your details." };
    }
    const m = parsed.data;

    let phone: string | null = null;
    if (m.phone) {
      phone = normaliseIndianMobile(m.phone);
      if (!INDIAN_MOBILE_RE.test(phone)) return { success: false as const, error: "Please enter a valid 10-digit mobile number, or leave it blank." };
    }

    const admin = createAdminClient();

    // Light abuse protection: limit messages per email address per hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", m.email.toLowerCase())
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) {
      return { success: false as const, error: "You have sent several messages recently. Please wait a while, or contact us on WhatsApp." };
    }

    const { error } = await admin.from("contact_messages").insert({
      name: m.name,
      email: m.email.toLowerCase(),
      phone,
      subject: m.subject,
      message: m.message,
    });
    if (error) {
      console.error("[contact] save failed:", error.message);
      return {
        success: false as const,
        error: `We could not send your message right now. Please email ${SITE.email} or WhatsApp ${SITE.phoneDisplay}.`,
      };
    }

    // Notify the store by email when an email provider is configured (failure never blocks the customer)
    try {
      await getEmailService().sendEmail({
        to: SITE.email,
        subject: `New contact message: ${m.subject}`,
        html: `<p><strong>${escapeHtml(m.name)}</strong> (${escapeHtml(m.email)}${phone ? `, ${phone}` : ""})</p><p>${escapeHtml(m.message).replace(/\n/g, "<br>")}</p>`,
      });
    } catch (err) {
      console.error("[contact] notification email failed:", err);
    }

    return { success: true as const };
  } catch (err) {
    console.error("[contact] error:", err);
    return { success: false as const, error: `Something went wrong. Please email ${SITE.email}.` };
  }
}
