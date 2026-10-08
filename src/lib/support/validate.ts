// Dependency-free validation shared by the browser (inline errors) and the server (the real check).
// The server NEVER trusts that the client ran this: every action calls it again.
import { INDIAN_MOBILE_RE, normaliseIndianMobile } from "@/lib/geo/india";
import { TICKET_CATEGORY_VALUES, type TicketCategory } from "./constants";

export type FieldErrors<K extends string> = Partial<Record<K, string>>;
export type Validated<T, K extends string> = { ok: true; value: T } | { ok: false; errors: FieldErrors<K> };

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Single-line text: strips control characters, collapses whitespace. */
export const cleanLine = (v: unknown): string =>
  typeof v === "string" ? v.replace(CONTROL_CHARS, "").replace(/\s+/g, " ").trim() : "";

/** Multi-line text: strips control characters, normalises newlines, limits blank lines. */
export const cleanText = (v: unknown): string =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(CONTROL_CHARS, "").replace(/\n{3,}/g, "\n\n").trim() : "";

export const isValidEmail = (v: string) => v.length <= 255 && EMAIL_RE.test(v);

// ─── Contact form ────────────────────────────────────────────────────────────
export interface ContactInput {
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
}
export type ContactField = "name" | "email" | "phone" | "subject" | "message";

export const CONTACT_LIMITS = { name: 100, subject: 150, messageMin: 10, message: 3000 } as const;

export function validateContact(raw: unknown): Validated<ContactInput, ContactField> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors<ContactField> = {};

  const name = cleanLine(r.name);
  if (name.length < 2) errors.name = "Please enter your name.";
  else if (name.length > CONTACT_LIMITS.name) errors.name = `Name must be ${CONTACT_LIMITS.name} characters or fewer.`;

  const email = cleanLine(r.email).toLowerCase();
  if (!email) errors.email = "Please enter your email address.";
  else if (!isValidEmail(email)) errors.email = "Please enter a valid email address.";

  let phone: string | null = null;
  const rawPhone = cleanLine(r.phone);
  if (rawPhone) {
    const digits = normaliseIndianMobile(rawPhone);
    if (!INDIAN_MOBILE_RE.test(digits)) errors.phone = "Enter a valid 10-digit mobile number, or leave this blank.";
    else phone = digits;
  }

  const subject = cleanLine(r.subject);
  if (subject.length < 3) errors.subject = "Please add a short subject.";
  else if (subject.length > CONTACT_LIMITS.subject) errors.subject = `Subject must be ${CONTACT_LIMITS.subject} characters or fewer.`;

  const message = cleanText(r.message);
  if (message.length < CONTACT_LIMITS.messageMin) errors.message = `Please write at least ${CONTACT_LIMITS.messageMin} characters so we can help.`;
  else if (message.length > CONTACT_LIMITS.message) errors.message = `Message must be ${CONTACT_LIMITS.message} characters or fewer.`;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, email, phone, subject, message } };
}

// ─── Support tickets ─────────────────────────────────────────────────────────
export interface TicketInput {
  category: TicketCategory;
  subject: string;
  description: string;
  orderNumber: string | null;
}
export type TicketField = "category" | "subject" | "description" | "orderNumber";

export const TICKET_LIMITS = { subjectMin: 5, subject: 150, descriptionMin: 15, description: 5000, reply: 5000 } as const;
export const ORDER_NUMBER_RE = /^[A-Za-z0-9-]{6,40}$/;

export function validateTicket(raw: unknown): Validated<TicketInput, TicketField> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: FieldErrors<TicketField> = {};

  const category = cleanLine(r.category) as TicketCategory;
  if (!TICKET_CATEGORY_VALUES.includes(category)) errors.category = "Please choose what your query is about.";

  const subject = cleanLine(r.subject);
  if (subject.length < TICKET_LIMITS.subjectMin) errors.subject = `Please add a subject (at least ${TICKET_LIMITS.subjectMin} characters).`;
  else if (subject.length > TICKET_LIMITS.subject) errors.subject = `Subject must be ${TICKET_LIMITS.subject} characters or fewer.`;

  const description = cleanText(r.description);
  if (description.length < TICKET_LIMITS.descriptionMin) errors.description = `Please describe the issue in at least ${TICKET_LIMITS.descriptionMin} characters.`;
  else if (description.length > TICKET_LIMITS.description) errors.description = `Description must be ${TICKET_LIMITS.description} characters or fewer.`;

  let orderNumber: string | null = null;
  const rawOrder = cleanLine(r.orderNumber);
  if (rawOrder) {
    if (!ORDER_NUMBER_RE.test(rawOrder)) errors.orderNumber = "That does not look like an order number (for example RVN-2026-123456).";
    else orderNumber = rawOrder.toUpperCase();
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { category, subject, description, orderNumber } };
}

export function validateReply(raw: unknown): Validated<{ body: string }, "body"> {
  const body = cleanText(raw);
  if (!body) return { ok: false, errors: { body: "Please write a message." } };
  if (body.length > TICKET_LIMITS.reply) return { ok: false, errors: { body: `Message must be ${TICKET_LIMITS.reply} characters or fewer.` } };
  return { ok: true, value: { body } };
}

/** Client-generated idempotency token: letters, digits, dashes only. */
export const SUBMISSION_TOKEN_RE = /^[A-Za-z0-9-]{16,64}$/;
export const cleanToken = (v: unknown): string | null => (typeof v === "string" && SUBMISSION_TOKEN_RE.test(v) ? v : null);
