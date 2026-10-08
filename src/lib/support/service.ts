// =============================================================================
// Support tickets + contact inbox: all business rules and authorization in one place.
// -----------------------------------------------------------------------------
// - Every function takes an explicit, server-derived actor. Nothing here reads a user id, role,
//   ticket id or order from client input without re-checking it against the database.
// - Writes use the service role only after the ownership / staff check in the same function.
// - Customers can only ever see their own ticket and the customer-visible conversation. Internal notes,
//   audit events, other customers and admin identities never leave the staff functions.
// - A failed email never loses a message: it is stored first, the email is queued with retries.
// =============================================================================
import "server-only";
import { createAdminClient } from "@/lib/supabase";
import { queueEmail } from "@/lib/services/email";
import type { AdminNoticeData } from "@/lib/services/email/templates";
import { SITE } from "@/lib/site";
import { getNotifyRecipients } from "@/lib/site.server";
import {
  TICKET_CLOSED_MESSAGE,
  TICKET_STATUS_VALUES,
  CONTACT_STATUS_VALUES,
  ticketCategoryLabel,
  ticketStatusLabel,
  type ContactStatus,
  type TicketStatus,
} from "./constants";
import { cleanLine, cleanText, type ContactInput, type TicketInput, TICKET_LIMITS, validateReply } from "./validate";

export type Fail = { success: false; error: string; fieldErrors?: Record<string, string> };
const fail = (error: string, fieldErrors?: Record<string, string>): Fail => ({ success: false, error, ...(fieldErrors ? { fieldErrors } : {}) });

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERIC = "Something went wrong on our side. Please try again in a moment.";
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const isUnique = (e: { code?: string } | null | undefined) => e?.code === "23505";
const nowIso = () => new Date().toISOString();

export interface CustomerActor {
  id: string;
  email: string;
  name: string;
}
export interface StaffActor {
  id: string;
  email: string;
  role: "admin" | "staff";
}

export const RATE_LIMITS = {
  contactPerEmailPerHour: 5,
  contactPerIpPerHour: 10,
  ticketsPerUserPerHour: 5,
  openTicketsPerUser: 10,
  repliesPerUserPerHour: 20,
} as const;

/** Customer-facing reference for a contact message, e.g. RS-3F9A21BC */
export const contactRef = (id: string) => `RS-${String(id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;

// ─── email helpers ───────────────────────────────────────────────────────────
/** Queues one alert per configured business inbox. Returns true when at least one was delivered. */
export async function notifyBusiness(keyBase: string, data: AdminNoticeData): Promise<boolean> {
  const recipients = getNotifyRecipients();
  const results = await Promise.all(
    recipients.map((to, i) => queueEmail({ eventKey: `${keyBase}:${i}`, template: "admin_notice", recipient: to, data }))
  );
  return results.some((r) => r.status === "sent" || r.status === "duplicate");
}

export type NotificationState = "sent" | "pending" | "failed" | "none";

/** Delivery state of the alert emails for the given contact messages / tickets, keyed by record id. */
export async function getAlertStates(prefix: "contact_admin" | "ticket_admin", ids: string[]): Promise<Record<string, NotificationState>> {
  const out: Record<string, NotificationState> = {};
  if (!ids.length) return out;
  const recipients = getNotifyRecipients();
  const keys = ids.flatMap((id) => recipients.map((_, i) => `${prefix}:${id}:${i}`));
  const { data } = await createAdminClient().from("email_events").select("event_key, status").in("event_key", keys);
  for (const id of ids) {
    const rows = (data || []).filter((r: any) => String(r.event_key).startsWith(`${prefix}:${id}:`));
    if (!rows.length) out[id] = "none";
    else if (rows.some((r: any) => r.status === "sent")) out[id] = "sent";
    else if (rows.every((r: any) => r.status === "failed" || r.status === "skipped")) out[id] = "failed";
    else out[id] = "pending";
  }
  return out;
}

// =============================================================================
// CONTACT FORM (public)
// =============================================================================
export async function submitContact(
  input: ContactInput,
  ctx: { token: string | null; ipHash: string | null }
): Promise<Fail | { success: true; ref: string; confirmationEmailed: boolean; duplicate: boolean }> {
  const db = createAdminClient();
  try {
    // Idempotency: the same form submission (double click, retry, second tab) never creates a second row.
    if (ctx.token) {
      const { data: existing } = await db.from("contact_messages").select("id").eq("submission_token", ctx.token).maybeSingle();
      if (existing) return { success: true, ref: contactRef(existing.id), confirmationEmailed: false, duplicate: true };
    }

    const since = hoursAgo(1);
    const { count: byEmail } = await db
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("email", input.email)
      .gte("created_at", since);
    if ((byEmail ?? 0) >= RATE_LIMITS.contactPerEmailPerHour) {
      return fail(`You have sent several messages recently. Please wait a little while, or WhatsApp us on ${SITE.phoneDisplay}.`);
    }
    if (ctx.ipHash) {
      const { count: byIp } = await db
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ctx.ipHash)
        .gte("created_at", since);
      if ((byIp ?? 0) >= RATE_LIMITS.contactPerIpPerHour) {
        return fail(`Too many messages from your network just now. Please wait a little while, or WhatsApp us on ${SITE.phoneDisplay}.`);
      }
    }

    const { data: saved, error } = await db
      .from("contact_messages")
      .insert({
        name: input.name,
        email: input.email,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        status: "new",
        ip_hash: ctx.ipHash,
        submission_token: ctx.token,
      })
      .select("id")
      .single();

    if (isUnique(error) && ctx.token) {
      const { data: again } = await db.from("contact_messages").select("id").eq("submission_token", ctx.token).maybeSingle();
      if (again) return { success: true, ref: contactRef(again.id), confirmationEmailed: false, duplicate: true };
    }
    if (error || !saved) {
      console.error("[contact] save failed:", error?.message);
      return fail(`We could not send your message right now. Please try again, or email ${SITE.email} / WhatsApp ${SITE.phoneDisplay}.`);
    }

    const ref = contactRef(saved.id);
    // Stored first; the emails are best-effort and retried by the outbox. The result is reported honestly.
    const [ack] = await Promise.allSettled([
      queueEmail({
        eventKey: `support_ticket_created:${saved.id}`,
        template: "support_ticket_created",
        recipient: input.email,
        data: { customerName: input.name, ticketRef: ref, subject: input.subject, message: input.message },
      }),
      notifyBusiness(`contact_admin:${saved.id}`, {
        title: `New contact message [${ref}]: ${input.subject}`.slice(0, 190),
        facts: [
          { label: "Reference", value: ref },
          { label: "From", value: input.name },
          { label: "Email", value: input.email },
          ...(input.phone ? [{ label: "Mobile", value: input.phone }] : []),
          { label: "Subject", value: input.subject },
        ],
        body: input.message,
        url: `${SITE.url}/admin/messages?open=${saved.id}`,
        replyTo: input.email,
      }),
    ]);
    const confirmationEmailed = ack.status === "fulfilled" && ack.value.status === "sent";
    return { success: true, ref, confirmationEmailed, duplicate: false };
  } catch (err) {
    console.error("[contact] error:", err);
    return fail(GENERIC);
  }
}

// =============================================================================
// CUSTOMER TICKETS
// =============================================================================
export interface TicketMessageView {
  id: string;
  from: "you" | "support";
  body: string;
  at: string;
}
export interface TicketSummary {
  id: string;
  ticketNumber: string;
  category: string;
  subject: string;
  orderNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const toSummary = (t: any): TicketSummary => ({
  id: t.id,
  ticketNumber: t.ticket_number,
  category: t.category,
  subject: t.subject,
  orderNumber: t.order_number ?? null,
  status: t.status,
  createdAt: t.created_at,
  updatedAt: t.last_message_at || t.updated_at || t.created_at,
});

export async function createTicket(
  actor: CustomerActor,
  input: TicketInput,
  token: string | null
): Promise<Fail | { success: true; id: string; ticketNumber: string; confirmationEmailed: boolean; duplicate: boolean }> {
  const db = createAdminClient();
  try {
    if (token) {
      const { data: dup } = await db.from("support_tickets").select("id, ticket_number").eq("user_id", actor.id).eq("submission_token", token).maybeSingle();
      if (dup) return { success: true, id: dup.id, ticketNumber: dup.ticket_number, confirmationEmailed: false, duplicate: true };
    }

    const { count: recent } = await db
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .gte("created_at", hoursAgo(1));
    if ((recent ?? 0) >= RATE_LIMITS.ticketsPerUserPerHour) return fail("You have raised several queries recently. Please wait a little before raising another.");

    const { count: open } = await db
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("user_id", actor.id)
      .in("status", ["open", "in_progress", "waiting_for_customer"]);
    if ((open ?? 0) >= RATE_LIMITS.openTicketsPerUser) return fail("You already have several open queries. Please wait for a reply or add to an existing query.");

    // The order must belong to THIS customer; otherwise it is treated as not found (no information leak).
    let orderId: string | null = null;
    let orderNumber: string | null = null;
    if (input.orderNumber) {
      const { data: order } = await db.from("orders").select("id, order_number").eq("order_number", input.orderNumber).eq("user_id", actor.id).maybeSingle();
      if (!order) return fail("We could not find that order on your account.", { orderNumber: "We could not find that order on your account." });
      orderId = order.id;
      orderNumber = order.order_number;
    }

    const { data: ticket, error } = await db
      .from("support_tickets")
      .insert({
        user_id: actor.id,
        customer_name: actor.name,
        customer_email: actor.email,
        category: input.category,
        subject: input.subject,
        order_id: orderId,
        order_number: orderNumber,
        status: "open",
        submission_token: token,
      })
      .select("id, ticket_number")
      .single();

    if (isUnique(error) && token) {
      const { data: dup } = await db.from("support_tickets").select("id, ticket_number").eq("user_id", actor.id).eq("submission_token", token).maybeSingle();
      if (dup) return { success: true, id: dup.id, ticketNumber: dup.ticket_number, confirmationEmailed: false, duplicate: true };
    }
    if (error || !ticket) {
      console.error("[support] ticket insert failed:", error?.message);
      return fail("We could not create your query right now. Please try again.");
    }

    const { error: msgError } = await db
      .from("support_ticket_messages")
      .insert({ ticket_id: ticket.id, author_role: "customer", author_id: actor.id, body: input.description });
    if (msgError) {
      console.error("[support] first message insert failed:", msgError.message);
      await db.from("support_tickets").delete().eq("id", ticket.id); // never leave an empty ticket behind
      return fail("We could not create your query right now. Please try again.");
    }
    await db.from("support_ticket_events").insert({ ticket_id: ticket.id, actor_id: actor.id, actor_role: "customer", action: "created", to_status: "open" });

    const [ack] = await Promise.allSettled([
      queueEmail({
        eventKey: `ticket_created:${ticket.id}`,
        template: "support_ticket_created",
        recipient: actor.email,
        data: {
          customerName: actor.name,
          ticketRef: ticket.ticket_number,
          subject: input.subject,
          message: input.description,
          url: `${SITE.url}/account/support/${ticket.id}`,
        },
      }),
      notifyBusiness(`ticket_admin:${ticket.id}`, {
        title: `New support query ${ticket.ticket_number}: ${input.subject}`.slice(0, 190),
        facts: [
          { label: "Ticket", value: ticket.ticket_number },
          { label: "Category", value: ticketCategoryLabel(input.category) },
          { label: "Customer", value: `${actor.name} <${actor.email}>` },
          ...(orderNumber ? [{ label: "Order", value: orderNumber }] : []),
        ],
        body: input.description,
        url: `${SITE.url}/admin/queries/${ticket.id}`,
        replyTo: actor.email,
      }),
    ]);
    return {
      success: true,
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      confirmationEmailed: ack.status === "fulfilled" && ack.value.status === "sent",
      duplicate: false,
    };
  } catch (err) {
    console.error("[support] createTicket error:", err);
    return fail(GENERIC);
  }
}

export async function listMyTickets(actor: CustomerActor): Promise<Fail | { success: true; tickets: TicketSummary[] }> {
  try {
    const { data, error } = await createAdminClient()
      .from("support_tickets")
      .select("id, ticket_number, category, subject, order_number, status, created_at, updated_at, last_message_at")
      .eq("user_id", actor.id)
      .order("last_message_at", { ascending: false })
      .limit(100);
    if (error) return fail("We could not load your queries. Please try again.");
    return { success: true, tickets: (data || []).map(toSummary) };
  } catch {
    return fail("We could not load your queries. Please try again.");
  }
}

/** Loads a ticket only if it belongs to the actor. A missing ticket and someone else's ticket look identical. */
async function loadOwnedTicket(actor: CustomerActor, ticketId: unknown) {
  if (typeof ticketId !== "string" || !UUID_RE.test(ticketId)) return null;
  const { data } = await createAdminClient().from("support_tickets").select("*").eq("id", ticketId).eq("user_id", actor.id).maybeSingle();
  return data ?? null;
}

export async function getMyTicket(
  actor: CustomerActor,
  ticketId: unknown
): Promise<Fail | { success: true; ticket: TicketSummary; messages: TicketMessageView[] }> {
  try {
    const t = await loadOwnedTicket(actor, ticketId);
    if (!t) return fail("We could not find that query.");
    const { data: msgs } = await createAdminClient()
      .from("support_ticket_messages")
      .select("id, author_role, body, created_at")
      .eq("ticket_id", t.id)
      .order("created_at", { ascending: true });
    return {
      success: true,
      ticket: toSummary(t),
      // Only role + text + time: admin identities and internal notes are never included.
      messages: (msgs || []).map((m: any) => ({ id: m.id, from: m.author_role === "customer" ? "you" : "support", body: m.body, at: m.created_at })),
    };
  } catch {
    return fail("We could not load this query. Please try again.");
  }
}

export async function replyToMyTicket(actor: CustomerActor, ticketId: unknown, bodyRaw: unknown, token: string | null): Promise<Fail | { success: true; duplicate: boolean }> {
  const db = createAdminClient();
  try {
    const v = validateReply(bodyRaw);
    if (!v.ok) return fail(v.errors.body || "Please write a message.", v.errors);
    const t = await loadOwnedTicket(actor, ticketId);
    if (!t) return fail("We could not find that query.");
    if (t.status === "closed") return fail(TICKET_CLOSED_MESSAGE);

    if (token) {
      const { data: dup } = await db.from("support_ticket_messages").select("id").eq("ticket_id", t.id).eq("submission_token", token).maybeSingle();
      if (dup) return { success: true, duplicate: true };
    }
    const { count } = await db
      .from("support_ticket_messages")
      .select("id", { count: "exact", head: true })
      .eq("author_id", actor.id)
      .eq("author_role", "customer")
      .gte("created_at", hoursAgo(1));
    if ((count ?? 0) >= RATE_LIMITS.repliesPerUserPerHour) return fail("You are sending messages very quickly. Please wait a little and try again.");

    const { data: msg, error } = await db
      .from("support_ticket_messages")
      .insert({ ticket_id: t.id, author_role: "customer", author_id: actor.id, body: v.value.body, submission_token: token })
      .select("id")
      .single();
    if (isUnique(error)) return { success: true, duplicate: true };
    if (error || !msg) return fail("We could not send your message. Please try again.");

    // A customer reply re-opens a resolved ticket and takes it out of "waiting for customer".
    const next: TicketStatus = t.status === "resolved" || t.status === "waiting_for_customer" ? "open" : t.status;
    const now = nowIso();
    await db
      .from("support_tickets")
      .update({ status: next, last_message_at: now, updated_at: now, ...(next !== t.status ? { resolved_at: null } : {}) })
      .eq("id", t.id);
    await db.from("support_ticket_events").insert({ ticket_id: t.id, actor_id: actor.id, actor_role: "customer", action: "customer_replied", from_status: t.status, to_status: next });

    await notifyBusiness(`ticket_reply_admin:${msg.id}`, {
      title: `Customer replied on ${t.ticket_number}: ${t.subject}`.slice(0, 190),
      facts: [
        { label: "Ticket", value: t.ticket_number },
        { label: "Customer", value: `${t.customer_name} <${t.customer_email}>` },
        { label: "Status", value: ticketStatusLabel(next) },
      ],
      body: v.value.body,
      url: `${SITE.url}/admin/queries/${t.id}`,
      replyTo: t.customer_email,
    }).catch(() => false);

    return { success: true, duplicate: false };
  } catch (err) {
    console.error("[support] reply error:", err);
    return fail(GENERIC);
  }
}

// =============================================================================
// STAFF: TICKETS (callers must have passed requireAdmin())
// =============================================================================
export interface TicketFilters {
  search?: string;
  status?: string;
  category?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
  page?: number;
}
export const STAFF_PAGE_SIZE = 25;

/** Strips the characters that carry meaning inside a PostgREST or()/ilike filter (separators, quotes, wildcards). */
const safeSearch = (s: unknown) => cleanLine(s).replace(/[,()%*_\\"'`:;<>[\]{}|&=]/g, "").slice(0, 60);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** A date filter covers the whole IST day. */
const dayStart = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59.999+05:30`).toISOString();

export async function listTicketsForStaff(f: TicketFilters) {
  try {
    const page = Math.max(1, Math.floor(Number(f.page) || 1));
    let q = createAdminClient()
      .from("support_tickets")
      .select("id, ticket_number, customer_name, customer_email, category, subject, order_number, status, created_at, last_message_at", { count: "exact" });
    if (f.status && TICKET_STATUS_VALUES.includes(f.status as TicketStatus)) q = q.eq("status", f.status);
    if (f.category && /^[a-z_]{3,20}$/.test(f.category)) q = q.eq("category", f.category);
    if (f.from && DATE_RE.test(f.from)) q = q.gte("created_at", dayStart(f.from));
    if (f.to && DATE_RE.test(f.to)) q = q.lte("created_at", dayEnd(f.to));
    const term = safeSearch(f.search);
    if (term) q = q.or(`ticket_number.ilike.%${term}%,subject.ilike.%${term}%,customer_email.ilike.%${term}%,customer_name.ilike.%${term}%,order_number.ilike.%${term}%`);
    const { data, error, count } = await q
      .order("last_message_at", { ascending: false })
      .range((page - 1) * STAFF_PAGE_SIZE, page * STAFF_PAGE_SIZE - 1);
    if (error) return fail("Could not load queries.");
    const rows = (data || []).map((t: any) => ({
      id: t.id as string,
      ticketNumber: t.ticket_number as string,
      customerName: t.customer_name as string,
      customerEmail: t.customer_email as string,
      category: t.category as string,
      subject: t.subject as string,
      orderNumber: (t.order_number as string | null) ?? null,
      status: t.status as string,
      createdAt: t.created_at as string,
      lastActivityAt: (t.last_message_at || t.created_at) as string,
    }));
    return { success: true as const, rows, total: count ?? rows.length, page, pageSize: STAFF_PAGE_SIZE };
  } catch {
    return fail("Could not load queries.");
  }
}

export async function getTicketForStaff(ticketId: unknown) {
  try {
    if (typeof ticketId !== "string" || !UUID_RE.test(ticketId)) return fail("Query not found.");
    const db = createAdminClient();
    const { data: t } = await db.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (!t) return fail("Query not found.");

    const [{ data: msgs }, { data: notes }, { data: events }] = await Promise.all([
      db.from("support_ticket_messages").select("id, author_role, author_id, body, created_at").eq("ticket_id", t.id).order("created_at", { ascending: true }),
      db.from("support_ticket_notes").select("id, author_id, body, created_at").eq("ticket_id", t.id).order("created_at", { ascending: true }),
      db.from("support_ticket_events").select("id, actor_id, actor_role, action, from_status, to_status, created_at").eq("ticket_id", t.id).order("created_at", { ascending: true }),
    ]);

    // Only what support needs about the order: no address, no phone number.
    let order: null | { orderNumber: string; status: string; paymentStatus: string; paymentMethod: string; total: number; placedAt: string; itemCount: number; trackingNumber: string | null } = null;
    if (t.order_id) {
      const { data: o } = await db
        .from("orders")
        .select("order_number, order_status, payment_status, payment_method, total_amount, created_at, tracking_number, order_items(id)")
        .eq("id", t.order_id)
        .maybeSingle();
      if (o) {
        order = {
          orderNumber: o.order_number,
          status: o.order_status,
          paymentStatus: o.payment_status,
          paymentMethod: o.payment_method,
          total: Number(o.total_amount),
          placedAt: o.created_at,
          itemCount: Array.isArray(o.order_items) ? o.order_items.length : 0,
          trackingNumber: o.tracking_number ?? null,
        };
      }
    }

    // Resolve staff ids to a readable label for the audit trail (email only, never more).
    const staffIds = Array.from(new Set([...(msgs || []), ...(notes || []), ...(events || [])].map((r: any) => r.author_id || r.actor_id).filter(Boolean)));
    const labels: Record<string, string> = {};
    if (staffIds.length) {
      const { data: profs } = await db.from("profiles").select("id, email, role").in("id", staffIds as string[]);
      for (const p of profs || []) labels[p.id] = p.email;
    }
    const alert = (await getAlertStates("ticket_admin", [t.id]))[t.id] ?? "none";

    return {
      success: true as const,
      ticket: {
        id: t.id as string,
        ticketNumber: t.ticket_number as string,
        customerName: t.customer_name as string,
        customerEmail: t.customer_email as string,
        accountDeleted: !t.user_id,
        category: t.category as string,
        subject: t.subject as string,
        status: t.status as string,
        createdAt: t.created_at as string,
        lastActivityAt: (t.last_message_at || t.created_at) as string,
      },
      order,
      alertState: alert,
      messages: (msgs || []).map((m: any) => ({ id: m.id, from: m.author_role as "customer" | "admin", by: m.author_id ? labels[m.author_id] || null : null, body: m.body as string, at: m.created_at as string })),
      notes: (notes || []).map((n: any) => ({ id: n.id, by: n.author_id ? labels[n.author_id] || null : null, body: n.body as string, at: n.created_at as string })),
      events: (events || []).map((e: any) => ({ id: e.id, by: e.actor_id ? labels[e.actor_id] || null : null, role: e.actor_role as string, action: e.action as string, from: e.from_status as string | null, to: e.to_status as string | null, at: e.created_at as string })),
    };
  } catch {
    return fail("Could not load this query.");
  }
}

function statusColumns(status: TicketStatus): Record<string, string | null> {
  const now = nowIso();
  if (status === "resolved") return { resolved_at: now, closed_at: null };
  if (status === "closed") return { closed_at: now };
  return { resolved_at: null, closed_at: null };
}

async function emailCustomerUpdate(t: any, eventKey: string, message: string) {
  return queueEmail({
    eventKey,
    template: "support_ticket_update",
    recipient: t.customer_email,
    data: { customerName: t.customer_name, ticketRef: t.ticket_number, subject: t.subject, message, url: `${SITE.url}/account/support/${t.id}` },
  });
}

export async function staffReply(
  staff: StaffActor,
  ticketId: unknown,
  bodyRaw: unknown,
  nextStatus: unknown,
  token: string | null
): Promise<Fail | { success: true; emailed: boolean; status: string }> {
  const db = createAdminClient();
  try {
    if (typeof ticketId !== "string" || !UUID_RE.test(ticketId)) return fail("Query not found.");
    const v = validateReply(bodyRaw);
    if (!v.ok) return fail(v.errors.body || "Please write a reply.", v.errors);
    const status = (nextStatus ?? "waiting_for_customer") as TicketStatus;
    if (!TICKET_STATUS_VALUES.includes(status)) return fail("Invalid status.");

    const { data: t } = await db.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (!t) return fail("Query not found.");
    if (t.status === "closed" && status === "closed") return fail("This query is closed. Change its status to reopen it before replying.");

    if (token) {
      const { data: dup } = await db.from("support_ticket_messages").select("id").eq("ticket_id", t.id).eq("submission_token", token).maybeSingle();
      if (dup) return { success: true, emailed: false, status: t.status };
    }
    const { data: msg, error } = await db
      .from("support_ticket_messages")
      .insert({ ticket_id: t.id, author_role: "admin", author_id: staff.id, body: v.value.body, submission_token: token })
      .select("id")
      .single();
    if (error || !msg) return fail("Could not save the reply. Please try again.");

    const now = nowIso();
    await db.from("support_tickets").update({ status, last_message_at: now, updated_at: now, ...statusColumns(status) }).eq("id", t.id);
    await db.from("support_ticket_events").insert({ ticket_id: t.id, actor_id: staff.id, actor_role: staff.role, action: "replied", from_status: t.status, to_status: status });

    const r = await emailCustomerUpdate(t, `ticket_reply:${msg.id}`, v.value.body);
    return { success: true, emailed: r.status === "sent", status };
  } catch (err) {
    console.error("[support] staffReply error:", err);
    return fail(GENERIC);
  }
}

export async function staffSetTicketStatus(staff: StaffActor, ticketId: unknown, statusRaw: unknown): Promise<Fail | { success: true; status: string; emailed: boolean }> {
  const db = createAdminClient();
  try {
    if (typeof ticketId !== "string" || !UUID_RE.test(ticketId)) return fail("Query not found.");
    if (!TICKET_STATUS_VALUES.includes(statusRaw as TicketStatus)) return fail("Invalid status.");
    const status = statusRaw as TicketStatus;
    const { data: t } = await db.from("support_tickets").select("*").eq("id", ticketId).maybeSingle();
    if (!t) return fail("Query not found.");
    if (t.status === status) return { success: true, status, emailed: false };

    const now = nowIso();
    const { error } = await db.from("support_tickets").update({ status, updated_at: now, ...statusColumns(status) }).eq("id", t.id);
    if (error) return fail("Could not update the status. Please try again.");
    const { data: ev } = await db
      .from("support_ticket_events")
      .insert({ ticket_id: t.id, actor_id: staff.id, actor_role: staff.role, action: "status_changed", from_status: t.status, to_status: status })
      .select("id")
      .single();

    // Tell the customer when their request is wrapped up (once per change).
    let emailed = false;
    if ((status === "resolved" || status === "closed") && ev?.id) {
      const text =
        status === "resolved"
          ? "We have marked your request as resolved. If something is still not right, just reply on the request and we will pick it up again."
          : "Your request is now closed. If you need more help, please raise a new query from your account.";
      emailed = (await emailCustomerUpdate(t, `ticket_status:${ev.id}`, text)).status === "sent";
    }
    return { success: true, status, emailed };
  } catch (err) {
    console.error("[support] setStatus error:", err);
    return fail(GENERIC);
  }
}

export async function staffAddNote(staff: StaffActor, ticketId: unknown, bodyRaw: unknown): Promise<Fail | { success: true }> {
  const db = createAdminClient();
  try {
    if (typeof ticketId !== "string" || !UUID_RE.test(ticketId)) return fail("Query not found.");
    const body = cleanText(bodyRaw);
    if (!body) return fail("Please write a note.");
    if (body.length > TICKET_LIMITS.reply) return fail(`Notes must be ${TICKET_LIMITS.reply} characters or fewer.`);
    const { data: t } = await db.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
    if (!t) return fail("Query not found.");
    const { error } = await db.from("support_ticket_notes").insert({ ticket_id: t.id, author_id: staff.id, body });
    if (error) return fail("Could not save the note.");
    await db.from("support_ticket_events").insert({ ticket_id: t.id, actor_id: staff.id, actor_role: staff.role, action: "note_added" });
    return { success: true };
  } catch {
    return fail(GENERIC);
  }
}

// =============================================================================
// STAFF: CONTACT MESSAGES
// =============================================================================
export interface ContactFilters {
  search?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
}

export async function listContactForStaff(f: ContactFilters) {
  try {
    const page = Math.max(1, Math.floor(Number(f.page) || 1));
    let q = createAdminClient()
      .from("contact_messages")
      .select("id, name, email, phone, subject, message, status, admin_notes, created_at, read_at, replied_at", { count: "exact" });
    if (f.status && CONTACT_STATUS_VALUES.includes(f.status as ContactStatus)) q = q.eq("status", f.status);
    if (f.from && DATE_RE.test(f.from)) q = q.gte("created_at", dayStart(f.from));
    if (f.to && DATE_RE.test(f.to)) q = q.lte("created_at", dayEnd(f.to));
    const term = safeSearch(f.search);
    if (term) q = q.or(`name.ilike.%${term}%,email.ilike.%${term}%,subject.ilike.%${term}%,message.ilike.%${term}%`);
    const { data, error, count } = await q.order("created_at", { ascending: false }).range((page - 1) * STAFF_PAGE_SIZE, page * STAFF_PAGE_SIZE - 1);
    if (error) return fail("Could not load messages.");
    const alerts = await getAlertStates("contact_admin", (data || []).map((r: any) => r.id));
    const rows = (data || []).map((m: any) => ({
      id: m.id as string,
      ref: contactRef(m.id),
      name: m.name as string,
      email: m.email as string,
      phone: (m.phone as string | null) ?? null,
      subject: m.subject as string,
      message: m.message as string,
      status: m.status as string,
      adminNotes: (m.admin_notes as string | null) ?? "",
      createdAt: m.created_at as string,
      repliedAt: (m.replied_at as string | null) ?? null,
      alertState: alerts[m.id] ?? "none",
    }));
    return { success: true as const, rows, total: count ?? rows.length, page, pageSize: STAFF_PAGE_SIZE };
  } catch {
    return fail("Could not load messages.");
  }
}

export async function setContactStatus(statusRaw: unknown, id: unknown): Promise<Fail | { success: true; status: string }> {
  try {
    if (typeof id !== "string" || !UUID_RE.test(id)) return fail("Message not found.");
    if (!CONTACT_STATUS_VALUES.includes(statusRaw as ContactStatus)) return fail("Invalid status.");
    const status = statusRaw as ContactStatus;
    const now = nowIso();
    const patch: Record<string, unknown> = { status, updated_at: now };
    if (status === "read") patch.read_at = now;
    if (status === "replied") patch.replied_at = now;
    const { data, error } = await createAdminClient().from("contact_messages").update(patch).eq("id", id).select("id");
    if (error) return fail("Could not update the message.");
    if (!data?.length) return fail("Message not found.");
    return { success: true, status };
  } catch {
    return fail(GENERIC);
  }
}

export async function setContactNotes(id: unknown, notesRaw: unknown): Promise<Fail | { success: true }> {
  try {
    if (typeof id !== "string" || !UUID_RE.test(id)) return fail("Message not found.");
    const notes = cleanText(notesRaw).slice(0, 3000);
    const { data, error } = await createAdminClient().from("contact_messages").update({ admin_notes: notes || null, updated_at: nowIso() }).eq("id", id).select("id");
    if (error) return fail("Could not save the note.");
    if (!data?.length) return fail("Message not found.");
    return { success: true };
  } catch {
    return fail(GENERIC);
  }
}

export async function deleteContact(id: unknown): Promise<Fail | { success: true }> {
  try {
    if (typeof id !== "string" || !UUID_RE.test(id)) return fail("Message not found.");
    const { error } = await createAdminClient().from("contact_messages").delete().eq("id", id);
    if (error) return fail("Could not delete the message.");
    return { success: true };
  } catch {
    return fail(GENERIC);
  }
}

/** Unread counts for the admin sidebar badges. */
export async function getStaffCounts() {
  const db = createAdminClient();
  const [msgs, tickets] = await Promise.all([
    db.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
    db.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);
  return { newMessages: msgs.count ?? 0, openTickets: tickets.count ?? 0 };
}
