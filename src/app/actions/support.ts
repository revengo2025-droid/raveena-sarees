"use server";

import { requireCustomer } from "@/lib/support/context";
import { createTicket, getMyTicket, listMyTickets, replyToMyTicket } from "@/lib/support/service";
import { cleanToken, validateTicket } from "@/lib/support/validate";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";

/** Customer support tickets. The customer is always the signed-in user from the session, never a client-sent id. */

export async function createTicketAction(values: unknown) {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false as const, error: ctx.error };

  const raw = (values && typeof values === "object" ? values : {}) as Record<string, unknown>;
  const v = validateTicket(raw);
  if (!v.ok) {
    return { success: false as const, error: Object.values(v.errors)[0] || "Please check your details.", fieldErrors: v.errors as Record<string, string> };
  }
  const limit = await rateLimit("ticketCreate", ctx.actor.id);
  if (!limit.ok) return { success: false as const, error: tooManyMessage(limit.retryAfter, "requests") };
  return createTicket(ctx.actor, v.value, cleanToken(raw.token));
}

export async function listMyTicketsAction() {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false as const, error: ctx.error };
  return listMyTickets(ctx.actor);
}

export async function getMyTicketAction(ticketId: string) {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false as const, error: ctx.error };
  return getMyTicket(ctx.actor, ticketId);
}

export async function replyToTicketAction(ticketId: string, body: string, token?: string) {
  const ctx = await requireCustomer();
  if (!ctx.ok) return { success: false as const, error: ctx.error };
  const limit = await rateLimit("ticketReply", ctx.actor.id);
  if (!limit.ok) return { success: false as const, error: tooManyMessage(limit.retryAfter, "messages") };
  return replyToMyTicket(ctx.actor, ticketId, body, cleanToken(token));
}
