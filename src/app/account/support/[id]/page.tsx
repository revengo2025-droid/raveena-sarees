"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Send, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { getMyTicketAction, replyToTicketAction } from "@/app/actions/support";
import { ticketCategoryLabel, TICKET_CLOSED_MESSAGE } from "@/lib/support/constants";
import { TICKET_LIMITS } from "@/lib/support/validate";
import { formatDateTime, newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { StatusBadge } from "@/components/support/StatusBadge";

type Ticket = { id: string; ticketNumber: string; category: string; subject: string; orderNumber: string | null; status: string; createdAt: string };
type Msg = { id: string; from: "you" | "support"; body: string; at: string };

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  const justCreated = useSearchParams().get("created") === "1";
  const id = params?.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const token = useRef("");
  const submitting = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const res = await withTimeout(getMyTicketAction(id), 20_000);
      if (res.success) {
        setTicket(res.ticket);
        setMessages(res.messages);
      } else {
        setLoadError(res.error);
      }
    } catch (e) {
      setLoadError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || !id) return;
    const body = reply.trim();
    if (!body) return setReplyError("Please write a message.");
    if (body.length > TICKET_LIMITS.reply) return setReplyError(`Message must be ${TICKET_LIMITS.reply} characters or fewer.`);
    setReplyError(null);
    submitting.current = true;
    setSending(true);
    if (!token.current) token.current = newSubmissionToken();
    try {
      const res = await withTimeout(replyToTicketAction(id, body, token.current));
      if (res.success) {
        token.current = "";
        setReply("");
        await load();
      } else {
        setReplyError(res.error);
      }
    } catch (err) {
      setReplyError(err instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      submitting.current = false;
      setSending(false);
    }
  };

  const closed = ticket?.status === "closed";

  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-4 font-poppins">
          <Link href="/account" className="hover:text-brand-gold">My account</Link> <span aria-hidden="true">/</span>{" "}
          <Link href="/account/support" className="hover:text-brand-gold">Help &amp; Support</Link> <span aria-hidden="true">/</span> <span className="text-brand-text">{ticket?.ticketNumber || "Query"}</span>
        </nav>

        {loading && (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading…
          </div>
        )}

        {!loading && loadError && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800 space-y-3">
            <p className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {loadError}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setLoading(true); load(); }} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-red-300 bg-white text-xs font-semibold">
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
              </button>
              <Link href="/account/support" className="inline-flex items-center min-h-[44px] px-4 text-xs underline">Back to my queries</Link>
            </div>
          </div>
        )}

        {!loading && ticket && (
          <>
            {justCreated && (
              <p role="status" className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> Your query has been created. Your ticket ID is <strong className="font-mono">{ticket.ticketNumber}</strong>.
              </p>
            )}
            <header className="bg-brand-ivory border border-brand-border rounded-3xl p-5 sm:p-6 mb-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-mono text-neutral-500">{ticket.ticketNumber}</p>
                  <h1 className="text-xl sm:text-2xl font-serif break-words">{ticket.subject}</h1>
                </div>
                <StatusBadge kind="ticket" status={ticket.status} />
              </div>
              <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-600">
                <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Category</dt><dd>{ticketCategoryLabel(ticket.category)}</dd></div>
                <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Order</dt><dd>{ticket.orderNumber || "Not linked"}</dd></div>
                <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Opened</dt><dd>{formatDateTime(ticket.createdAt)}</dd></div>
              </dl>
            </header>

            <ol className="space-y-3 mb-6" aria-label="Conversation">
              {messages.map((m) => (
                <li key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm border ${m.from === "you" ? "bg-white border-brand-border" : "bg-brand-ivory border-brand-gold/40"}`}>
                    <p className="text-[11px] font-semibold text-neutral-500 mb-1">{m.from === "you" ? "You" : "Raveena Sarees support"} · {formatDateTime(m.at)}</p>
                    <p className="whitespace-pre-wrap break-words text-neutral-800">{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>

            {closed ? (
              <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                {TICKET_CLOSED_MESSAGE} <Link href="/account/support/new" className="underline text-brand-maroon">Raise a new query</Link>
              </p>
            ) : (
              <form onSubmit={send} noValidate aria-busy={sending} className="space-y-3">
                <label htmlFor="reply" className="text-[11px] uppercase text-neutral-600 font-poppins block tracking-wide">Add a reply</label>
                <textarea
                  id="reply"
                  rows={4}
                  maxLength={TICKET_LIMITS.reply}
                  value={reply}
                  disabled={sending}
                  aria-invalid={Boolean(replyError)}
                  aria-describedby={replyError ? "reply-err" : undefined}
                  onChange={(e) => { setReply(e.target.value); if (replyError) setReplyError(null); }}
                  className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
                />
                {replyError && <p id="reply-err" role="alert" className="text-xs text-red-700">{replyError}</p>}
                <button type="submit" disabled={sending || !reply.trim()} className="btn-primary min-h-[48px] px-8 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} {sending ? "Sending…" : "Send reply"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
