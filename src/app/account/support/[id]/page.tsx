"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, Send, AlertTriangle, CheckCircle2, RefreshCw, Mail, MessageSquareReply, ArrowLeft } from "lucide-react";
import { getMyTicketAction, replyToTicketAction } from "@/app/actions/support";
import { ticketCategoryLabel, TICKET_CLOSED_MESSAGE } from "@/lib/support/constants";
import { TICKET_LIMITS } from "@/lib/support/validate";
import { formatDateTime, newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { StatusBadge } from "@/components/support/StatusBadge";
import { AccountShell } from "@/components/account/AccountShell";
import { useApp } from "@/lib/store";

type Ticket = { id: string; ticketNumber: string; category: string; subject: string; orderNumber: string | null; status: string; createdAt: string };
type Msg = { id: string; from: "you" | "support"; body: string; at: string };

const POLL_MS = 30_000;

export default function TicketPage() {
  const params = useParams<{ id: string }>();
  return (
    <AccountShell title="Your query" signInRedirect={`/account/support/${params?.id || ""}`}>
      <TicketContent />
    </AccountShell>
  );
}

function TicketContent() {
  const params = useParams<{ id: string }>();
  const justCreated = useSearchParams().get("created") === "1";
  const id = params?.id;
  const { user } = useApp();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sentNote, setSentNote] = useState(false);
  const [newReplyNote, setNewReplyNote] = useState(false);
  const token = useRef("");
  const submitting = useRef(false);
  const seenCount = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!id) return;
      if (!quiet) setLoadError(null);
      try {
        const res = await withTimeout(getMyTicketAction(id), 20_000);
        if (res.success) {
          setTicket(res.ticket);
          setMessages(res.messages);
          // A background refresh that brings a new message from the team is announced
          if (quiet && res.messages.length > seenCount.current && res.messages[res.messages.length - 1]?.from === "support") setNewReplyNote(true);
          seenCount.current = res.messages.length;
        } else if (!quiet) {
          setLoadError(res.error);
        }
      } catch (e) {
        if (!quiet) setLoadError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
      } finally {
        setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Check for replies every 30s while the tab is visible, and straight away when the customer comes back to it
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && load(true);
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || !id) return;
    const body = reply.trim();
    if (!body) return setReplyError("Please write a message.");
    if (body.length > TICKET_LIMITS.reply) return setReplyError(`Message must be ${TICKET_LIMITS.reply} characters or fewer.`);
    setReplyError(null);
    setSentNote(false);
    submitting.current = true;
    setSending(true);
    if (!token.current) token.current = newSubmissionToken();
    try {
      const res = await withTimeout(replyToTicketAction(id, body, token.current));
      if (res.success) {
        token.current = "";
        setReply("");
        setSentNote(true);
        await load(true);
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

  if (loading) {
    return (
      <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading your query…
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800 space-y-3">
        <p className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {loadError || "We could not find that query."}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={() => { setLoading(true); load(); }} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-red-300 bg-white text-xs font-semibold">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
          </button>
          <Link href="/account/support" className="inline-flex items-center min-h-[44px] px-4 text-xs underline">Back to my queries</Link>
        </div>
      </div>
    );
  }

  const closed = ticket.status === "closed";
  const lastFromSupport = messages.length > 0 && messages[messages.length - 1].from === "support";
  const email = user?.email;

  return (
    <>
      <Link href="/account/support" className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-brand-maroon hover:underline -mt-2">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> All my queries
      </Link>

      {/* Status banners: tell the customer exactly where things stand and where replies arrive */}
      <div aria-live="polite" className="space-y-3">
        {justCreated && (
          <div className="flex items-start gap-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
            <div>
              <p className="font-semibold">We have received your query ({ticket.ticketNumber}).</p>
              <p className="mt-0.5">
                Please check your email{email ? <> at <strong className="break-all">{email}</strong></> : null} for confirmation. Our reply will appear on this page and in your inbox. If you do not see it, check the Spam and Promotions folders.
              </p>
            </div>
          </div>
        )}
        {newReplyNote && (
          <p className="flex items-start gap-2 text-sm text-brand-maroon bg-brand-goldPale border border-brand-gold/40 rounded-2xl px-4 py-3">
            <MessageSquareReply className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> New reply from our team. See below.
          </p>
        )}
        {!justCreated && ticket.status === "waiting_for_customer" && lastFromSupport && (
          <div className="flex items-start gap-3 text-sm text-brand-maroon bg-brand-goldPale border border-brand-gold/40 rounded-2xl px-4 py-3.5">
            <Mail className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              <strong>We have replied to your query.</strong> Read it below. We also sent it to your email. If you need anything else, reply here.
            </p>
          </div>
        )}
        {ticket.status === "resolved" && (
          <div className="flex items-start gap-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" aria-hidden="true" />
            <p>
              <strong>This query is marked as resolved.</strong> Please check your email for details. If the problem is not fixed, reply below and we will pick it up again.
            </p>
          </div>
        )}
      </div>

      <header className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-neutral-500">{ticket.ticketNumber}</p>
            <h2 className="text-xl font-serif break-words">{ticket.subject}</h2>
          </div>
          <StatusBadge kind="ticket" status={ticket.status} />
        </div>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-neutral-600">
          <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Category</dt><dd>{ticketCategoryLabel(ticket.category)}</dd></div>
          <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Order</dt><dd>{ticket.orderNumber || "Not linked"}</dd></div>
          <div><dt className="uppercase tracking-wide text-[10px] text-neutral-500">Opened</dt><dd>{formatDateTime(ticket.createdAt)}</dd></div>
        </dl>
      </header>

      <section aria-labelledby="conv-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="conv-h" className="text-lg font-serif">Conversation</h2>
          <button type="button" onClick={() => load(true)} className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-full text-xs font-semibold text-neutral-600 hover:text-brand-maroon">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Refresh
          </button>
        </div>
        <ol className="space-y-3">
          {messages.map((m) => (
            <li key={m.id} className={`flex ${m.from === "you" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm border ${m.from === "you" ? "bg-brand-ivory border-brand-border" : "bg-brand-goldPale/60 border-brand-gold/40"}`}>
                <p className="text-[11px] font-semibold text-neutral-600 mb-1">{m.from === "you" ? "You" : "Raveena Sarees support"} · {formatDateTime(m.at)}</p>
                <p className="whitespace-pre-wrap break-words text-neutral-800">{m.body}</p>
              </div>
            </li>
          ))}
        </ol>
        {!lastFromSupport && !closed && ticket.status !== "resolved" && (
          <p className="mt-4 text-xs text-neutral-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Our team usually replies within 24 hours. You will get an email as soon as we do.
          </p>
        )}
      </section>

      {closed ? (
        <p className="text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-2xl px-4 py-3">
          {TICKET_CLOSED_MESSAGE} <Link href="/account/support/new" className="underline text-brand-maroon">Raise a new query</Link>
        </p>
      ) : (
        <form onSubmit={send} noValidate aria-busy={sending} className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card space-y-3">
          <label htmlFor="reply" className="text-sm font-semibold block">
            {ticket.status === "resolved" ? "Still need help? Reply to reopen" : "Add a reply"}
          </label>
          <textarea
            id="reply"
            rows={4}
            maxLength={TICKET_LIMITS.reply}
            value={reply}
            disabled={sending}
            aria-invalid={Boolean(replyError)}
            aria-describedby={replyError ? "reply-err" : undefined}
            onChange={(e) => {
              setReply(e.target.value);
              if (replyError) setReplyError(null);
              if (sentNote) setSentNote(false);
            }}
            className="w-full bg-white border border-brand-border rounded-xl px-4 py-3 text-base sm:text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20"
          />
          {replyError && <p id="reply-err" role="alert" className="text-xs text-red-700">{replyError}</p>}
          <div aria-live="polite">
            {sentNote && (
              <p className="flex items-start gap-2 text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> Message sent. We will email you when we reply.
              </p>
            )}
          </div>
          <button type="submit" disabled={sending || !reply.trim()} className="btn-primary min-h-[48px] px-8 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-60">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} {sending ? "Sending…" : "Send reply"}
          </button>
        </form>
      )}
    </>
  );
}
