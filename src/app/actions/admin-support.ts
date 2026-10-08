"use server";

import { requireAdmin } from "@/lib/auth/admin";
import {
  deleteContact,
  getStaffCounts,
  getTicketForStaff,
  listContactForStaff,
  listTicketsForStaff,
  setContactNotes,
  setContactStatus,
  staffAddNote,
  staffReply,
  staffSetTicketStatus,
  type ContactFilters,
  type StaffActor,
  type TicketFilters,
} from "@/lib/support/service";
import { cleanToken } from "@/lib/support/validate";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";

/**
 * Staff-only support actions. Every one of them re-checks the session on the server (requireAdmin); the admin
 * pages hiding links is only cosmetics. Staff and admins may handle queries; only admins may delete messages.
 */

const denied = (error: string) => ({ success: false as const, error });

async function staff(adminOnly = false, sensitive = false): Promise<{ ok: true; actor: StaffActor } | { ok: false; error: string }> {
  const a = await requireAdmin({ adminOnly });
  if (!a.ok) return { ok: false, error: a.error };
  const limit = await rateLimit(sensitive ? "adminSensitive" : "adminWrite", a.userId);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfter, "requests") };
  return { ok: true, actor: { id: a.userId, email: a.email, role: a.role } };
}

export async function listTicketsAction(filters: TicketFilters) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  return listTicketsForStaff(filters || {});
}

export async function getTicketAction(ticketId: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  return getTicketForStaff(ticketId);
}

export async function replyToTicketAsStaffAction(ticketId: string, body: string, status?: string, token?: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  const r = await staffReply(a.actor, ticketId, body, status, cleanToken(token));
  if (r.success) await audit({ action: "ticket.reply", actorId: a.actor.id, entityType: "support_ticket", entityId: ticketId, meta: { status: r.status } });
  return r;
}

export async function setTicketStatusAction(ticketId: string, status: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  const r = await staffSetTicketStatus(a.actor, ticketId, status);
  if (r.success) await audit({ action: "ticket.status_change", actorId: a.actor.id, entityType: "support_ticket", entityId: ticketId, meta: { status: r.status } });
  return r;
}

export async function addTicketNoteAction(ticketId: string, body: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  const r = await staffAddNote(a.actor, ticketId, body);
  if (r.success) await audit({ action: "ticket.note", actorId: a.actor.id, entityType: "support_ticket", entityId: ticketId });
  return r;
}

export async function listContactMessagesAction(filters: ContactFilters) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  return listContactForStaff(filters || {});
}

export async function setContactStatusAction(id: string, status: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  const r = await setContactStatus(status, id);
  if (r.success) await audit({ action: "contact.status_change", actorId: a.actor.id, entityType: "contact_message", entityId: id, meta: { status: r.status } });
  return r;
}

export async function saveContactNotesAction(id: string, notes: string) {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  const r = await setContactNotes(id, notes);
  if (r.success) await audit({ action: "contact.notes", actorId: a.actor.id, entityType: "contact_message", entityId: id });
  return r;
}

export async function deleteContactMessageAction(id: string) {
  const a = await staff(true, true);
  if (!a.ok) return denied(a.error);
  const r = await deleteContact(id);
  if (r.success) await audit({ action: "contact.delete", actorId: a.actor.id, entityType: "contact_message", entityId: id });
  return r;
}

export async function getSupportCountsAction() {
  const a = await staff();
  if (!a.ok) return denied(a.error);
  try {
    return { success: true as const, ...(await getStaffCounts()) };
  } catch {
    return denied("Could not load counts.");
  }
}
