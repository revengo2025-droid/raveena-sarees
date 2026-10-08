// Server-only business settings that must never reach the browser bundle.
import "server-only";
import { SITE } from "@/lib/site";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * Inbox(es) that receive internal alerts: new contact messages, support tickets, customer replies.
 * Set CONTACT_NOTIFY_EMAIL (comma separated for several). Falls back to the support address, then the
 * contact address, so alerts always go to a configured mailbox and never to a made-up one.
 */
export function getNotifyRecipients(): string[] {
  const configured = (process.env.CONTACT_NOTIFY_EMAIL || "")
    .split(",")
    .map((e) => e.trim())
    .filter((e) => EMAIL_RE.test(e));
  if (configured.length) return Array.from(new Set(configured.map((e) => e.toLowerCase())));
  return [SITE.supportEmail.toLowerCase()];
}
