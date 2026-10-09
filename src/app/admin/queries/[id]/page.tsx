"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Send, StickyNote, History, CheckCircle2, XCircle, RotateCcw, Clock, Mail, Phone } from "lucide-react";
import { addTicketNoteAction, getTicketAction, replyToTicketAsStaffAction, setTicketStatusAction } from "@/app/actions/admin-support";
import { TICKET_STATUSES, ticketCategoryLabel, ticketStatusLabel } from "@/lib/support/constants";
import { TICKET_LIMITS } from "@/lib/support/validate";
import { formatDateTime, newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminChip, AlertDot, ErrorBlock, LoadingBlock, adminInput } from "@/components/admin/AdminListShell";
import { formatINR } from "@/lib/utils";

type Detail = Extract<Awaited<ReturnType<typeof getTicketAction>>, { success: true }>;
type Busy = null | "reply" | "reply_resolve" | "note" | "status";

const ACTION_LABEL: Record<string, string> = {
  created: "Created by customer",
  customer_replied: "Customer replied",
  replied: "Staff replied",
  status_changed: "Status changed",
  note_added: "Internal note added",
};

/** Ready-made openings staff can insert and then edit. */
const QUICK_REPLIES = [
  { label: "Looking into it", text: "Thank you for reaching out. We are looking into this and will update you within 24 hours." },
  { label: "Order shipped", text: "Good news: your order has been shipped. You can follow it from My Orders → Track. Please let us know if you need anything else." },
  { label: "Refund started", text: "We have started your refund. It usually reaches your original payment method within 5–7 working days." },
  { label: "Need details", text: "To help you faster, could you please share a photo of the issue and your order number?" },
];

export default function AdminTicketPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const token = useRef("");
  const working = useRef(false);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await withTimeout(getTicketAction(id), 25_000);
      if (res.success) {
        setData(res);
        setNextStatus(res.ticket.status);
      } else setError(res.error);
    } catch (e) {
      setError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (kind: Exclude<Busy, null>, fn: () => Promise<{ success: boolean; error?: string; emailed?: boolean }>, okText: (r: any) => string, after?: () => void) => {
    if (working.current) return;
    working.current = true;
    setBusy(kind);
    setMessage(null);
    try {
      const r = await withTimeout(fn());
      if (r.success) {
        setMessage({ ok: true, text: okText(r) });
        after?.();
        await load();
      } else setMessage({ ok: false, text: r.error || "That did not work. Please try again." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE });
    } finally {
      working.current = false;
      setBusy(null);
    }
  };

  const sendReply = (status: "waiting_for_customer" | "resolved") => {
    if (!id || !reply.trim()) {
      replyRef.current?.focus();
      return;
    }
    if (!token.current) token.current = newSubmissionToken();
    run(
      status === "resolved" ? "reply_resolve" : "reply",
      () => replyToTicketAsStaffAction(id, reply, status, token.current),
      (r) =>
        `${status === "resolved" ? "Reply sent and the query is marked resolved." : "Reply sent."} ${
          r.emailed ? "The customer was emailed and can see it in their account." : "It is on their account; the email will be retried automatically."
        }`,
      () => {
        setReply("");
        token.current = "";
      }
    );
  };

  const changeStatus = (status: string) => {
    if (!id) return;
    run("status", () => setTicketStatusAction(id, status), (r: any) => `Status changed to ${ticketStatusLabel(status)}.${r.emailed ? " The customer was emailed." : ""}`);
  };

  if (loading) return <LoadingBlock label="Loading query…" />;
  if (error || !data) return <ErrorBlock message={error || "Query not found."} onRetry={() => { setLoading(true); load(); }} />;
  const { ticket, order, messages, notes, events } = data;
  const isClosed = ticket.status === "closed";
  const isDone = ticket.status === "resolved" || isClosed;

  const quickBtn = "inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border text-xs font-semibold disabled:opacity-50 transition-colors";

  return (
    <div className="space-y-6 font-sans text-adm-text">
      <div>
        <Link href="/admin/queries" className="inline-flex items-center min-h-[40px] text-xs text-adm-muted hover:text-adm-gold">&larr; All queries</Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-1">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-adm-goldsoft">{ticket.ticketNumber} · {ticketCategoryLabel(ticket.category)}</p>
            <h1 className="text-xl sm:text-2xl font-serif text-adm-strong break-words">{ticket.subject}</h1>
          </div>
          <AdminChip status={ticket.status} label={ticketStatusLabel(ticket.status)} />
        </div>

        {/* One-click status actions */}
        <div role="group" aria-label="Query actions" className="flex flex-wrap gap-2 mt-4">
          {!isDone && ticket.status !== "in_progress" && (
            <button type="button" disabled={busy !== null} onClick={() => changeStatus("in_progress")} className={`${quickBtn} border-sky-500/40 text-adm-info hover:bg-sky-500/15`}>
              <Clock className="w-4 h-4" aria-hidden="true" /> Mark in progress
            </button>
          )}
          {!isDone && (
            <button type="button" disabled={busy !== null} onClick={() => changeStatus("resolved")} className={`${quickBtn} border-emerald-500/40 text-adm-ok hover:bg-emerald-500/15`}>
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Mark resolved
            </button>
          )}
          {!isClosed && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => window.confirm("Close this query? The customer will be emailed and can no longer reply on it.") && changeStatus("closed")}
              className={`${quickBtn} border-adm-line2 text-adm-text hover:border-adm-danger hover:text-adm-danger`}
            >
              <XCircle className="w-4 h-4" aria-hidden="true" /> Close query
            </button>
          )}
          {isDone && (
            <button type="button" disabled={busy !== null} onClick={() => changeStatus("open")} className={`${quickBtn} border-adm-gold/50 text-adm-gold hover:bg-adm-gold/15`}>
              <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reopen
            </button>
          )}
          {busy === "status" && <Loader2 className="w-4 h-4 animate-spin self-center text-adm-muted" aria-label="Updating status" />}
        </div>
      </div>

      <div aria-live="polite">
        {message && (
          <p className={`text-sm rounded-xl px-4 py-3 border ${message.ok ? "text-adm-ok bg-adm-ok/15 border-adm-ok/40" : "text-adm-danger bg-adm-danger/15 border-adm-danger/40"}`}>{message.text}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section aria-label="Conversation" className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-adm-strong">Conversation</h2>
            <ol className="space-y-3">
              {messages.map((m) => (
                <li key={m.id} className={`flex ${m.from === "customer" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[92%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm border ${m.from === "customer" ? "bg-adm-raised border-adm-line" : "bg-adm-gold/10 border-adm-gold/40"}`}>
                    <p className="text-[11px] text-adm-muted mb-1 font-semibold">
                      {m.from === "customer" ? ticket.customerName : `Raveena support${m.by ? ` (${m.by})` : ""}`} · {formatDateTime(m.at)}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-adm-strong">{m.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {isClosed ? (
            <p className="bg-adm-surface border border-adm-line rounded-2xl p-4 text-sm text-adm-muted">
              This query is closed. Press <strong>Reopen</strong> above to reply again.
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendReply("waiting_for_customer");
              }}
              noValidate
              aria-busy={busy === "reply" || busy === "reply_resolve"}
              className="bg-adm-surface border border-adm-gold/40 rounded-2xl p-4 sm:p-5 space-y-3"
            >
              <div>
                <h2 className="text-sm font-semibold text-adm-strong">Reply to {ticket.customerName}</h2>
                <p className="text-[11px] text-adm-muted">They see this in My account → Help &amp; Support and receive it by email at {ticket.customerEmail}.</p>
              </div>

              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Insert a ready-made reply">
                {QUICK_REPLIES.map((q) => (
                  <button
                    key={q.label}
                    type="button"
                    onClick={() => {
                      setReply((r) => (r.trim() ? `${r.trim()}\n\n${q.text}` : q.text));
                      replyRef.current?.focus();
                    }}
                    className="min-h-[32px] px-3 rounded-full border border-adm-line2 text-[11px] text-adm-muted hover:text-adm-strong hover:border-adm-gold"
                  >
                    + {q.label}
                  </button>
                ))}
              </div>

              <label htmlFor="staff-reply" className="sr-only">Your reply</label>
              <textarea
                ref={replyRef}
                id="staff-reply"
                rows={6}
                maxLength={TICKET_LIMITS.reply}
                value={reply}
                disabled={busy === "reply" || busy === "reply_resolve"}
                onChange={(e) => setReply(e.target.value)}
                placeholder={`Hi ${ticket.customerName.split(" ")[0] || "there"}, …`}
                className={`${adminInput} w-full text-sm leading-relaxed`}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] text-adm-faint">{reply.length}/{TICKET_LIMITS.reply}</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => sendReply("resolved")}
                    disabled={busy !== null || !reply.trim()}
                    className="min-h-[44px] px-5 rounded-full border border-emerald-500/50 text-adm-ok text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 hover:bg-emerald-500/15 disabled:opacity-50"
                  >
                    {busy === "reply_resolve" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="w-4 h-4" aria-hidden="true" />} Send &amp; mark resolved
                  </button>
                  <button
                    type="submit"
                    disabled={busy !== null || !reply.trim()}
                    className="min-h-[44px] px-6 rounded-full bg-adm-gold text-black text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy === "reply" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Send reply
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-adm-faint">&ldquo;Send reply&rdquo; sets the query to Waiting for Customer. When they answer, it comes back to Needs reply.</p>
            </form>
          )}

          <section aria-label="Internal notes" className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-adm-strong flex items-center gap-2"><StickyNote className="w-4 h-4 text-adm-gold" aria-hidden="true" /> Internal notes <span className="text-[10px] font-normal text-adm-faint">(never shown to the customer)</span></h2>
            {notes.length === 0 && <p className="text-xs text-adm-faint">No notes yet.</p>}
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl bg-adm-raised border border-adm-line px-3 py-2.5 text-xs">
                <p className="text-[10px] text-adm-faint mb-1">{n.by || "Staff"} · {formatDateTime(n.at)}</p>
                <p className="whitespace-pre-wrap break-words">{n.body}</p>
              </div>
            ))}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (id && note.trim()) run("note", () => addTicketNoteAction(id, note), () => "Note added.", () => setNote(""));
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <label htmlFor="staff-note" className="sr-only">Add an internal note</label>
              <input id="staff-note" maxLength={TICKET_LIMITS.reply} value={note} disabled={busy === "note"} onChange={(e) => setNote(e.target.value)} placeholder="Add an internal note…" className={`${adminInput} flex-1`} />
              <button type="submit" disabled={busy !== null || !note.trim()} className="min-h-[40px] px-5 rounded-xl border border-adm-line2 text-xs font-semibold hover:border-adm-gold disabled:opacity-50">Add note</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 text-xs space-y-3" aria-label="Status">
            <h2 className="text-sm font-semibold text-adm-strong">Status</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (nextStatus && nextStatus !== ticket.status) changeStatus(nextStatus);
              }}
              className="flex gap-2"
            >
              <label htmlFor="ticket-status" className="sr-only">Set status</label>
              <select id="ticket-status" value={nextStatus} disabled={busy !== null} onChange={(e) => setNextStatus(e.target.value)} className={`${adminInput} flex-1`}>
                {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <button type="submit" disabled={busy !== null || nextStatus === ticket.status} className="min-h-[40px] px-4 rounded-xl border border-adm-line2 font-semibold hover:border-adm-gold disabled:opacity-40">
                Update
              </button>
            </form>
            <p className="text-[11px] text-adm-faint">Resolved and Closed email the customer automatically.</p>
            <AlertDot state={data.alertState} />
          </section>

          <section className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 text-xs space-y-2" aria-label="Customer">
            <h2 className="text-sm font-semibold text-adm-strong">Customer</h2>
            <p className="text-adm-text text-sm">{ticket.customerName}{ticket.accountDeleted && <span className="ml-2 text-[10px] text-adm-faint">(account deleted)</span>}</p>
            <p className="flex items-center gap-1.5 text-adm-muted break-all">
              <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <a href={`mailto:${ticket.customerEmail}`} className="hover:text-adm-gold">{ticket.customerEmail}</a>
            </p>
            {ticket.customerPhone && (
              <p className="flex items-center gap-1.5 text-adm-muted">
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <a href={`tel:+91${ticket.customerPhone}`} className="hover:text-adm-gold">+91 {ticket.customerPhone}</a>
              </p>
            )}
            {ticket.customerSecondaryPhone && (
              <p className="flex items-center gap-1.5 text-adm-muted">
                <Phone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <a href={`tel:+91${ticket.customerSecondaryPhone}`} className="hover:text-adm-gold">+91 {ticket.customerSecondaryPhone}</a>
                <span className="text-[10px] text-adm-faint">(secondary)</span>
              </p>
            )}
            <p className="text-adm-faint">Opened {formatDateTime(ticket.createdAt)}</p>
          </section>

          {order && (
            <section className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 text-xs space-y-1.5" aria-label="Order">
              <h2 className="text-sm font-semibold text-adm-strong">Related order</h2>
              <p className="font-mono text-adm-goldsoft">{order.orderNumber}</p>
              <p className="text-adm-text">Status: {order.status.replace(/_/g, " ")}</p>
              <p className="text-adm-text">Payment: {order.paymentMethod.toUpperCase()} · {order.paymentStatus}</p>
              <p className="text-adm-text">Total: {formatINR(order.total)} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}</p>
              {order.trackingNumber && <p className="text-adm-text">Tracking: {order.trackingNumber}</p>}
              <p className="text-adm-faint">Placed {formatDateTime(order.placedAt)}</p>
            </section>
          )}

          <section className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 text-xs" aria-label="Audit trail">
            <h2 className="text-sm font-semibold text-adm-strong flex items-center gap-2 mb-3"><History className="w-4 h-4 text-adm-gold" aria-hidden="true" /> Audit trail</h2>
            <ol className="space-y-2.5">
              {events.map((ev) => (
                <li key={ev.id} className="border-l-2 border-adm-line2 pl-3">
                  <p className="text-adm-text">
                    {ACTION_LABEL[ev.action] || ev.action}
                    {ev.to ? <span className="text-adm-muted"> {ev.from ? `${ticketStatusLabel(ev.from)} → ` : "→ "}{ticketStatusLabel(ev.to)}</span> : null}
                  </p>
                  <p className="text-[10px] text-adm-faint">{ev.by || ev.role} · {formatDateTime(ev.at)}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  );
}
