"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Send, StickyNote, History } from "lucide-react";
import { addTicketNoteAction, getTicketAction, replyToTicketAsStaffAction, setTicketStatusAction } from "@/app/actions/admin-support";
import { TICKET_STATUSES, ticketCategoryLabel, ticketStatusLabel } from "@/lib/support/constants";
import { TICKET_LIMITS } from "@/lib/support/validate";
import { formatDateTime, newSubmissionToken, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminChip, AlertDot, ErrorBlock, LoadingBlock, adminInput } from "@/components/admin/AdminListShell";
import { formatINR } from "@/lib/utils";

type Detail = Extract<Awaited<ReturnType<typeof getTicketAction>>, { success: true }>;

const ACTION_LABEL: Record<string, string> = {
  created: "Created by customer",
  customer_replied: "Customer replied",
  replied: "Staff replied",
  status_changed: "Status changed",
  note_added: "Internal note added",
};

export default function AdminTicketPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reply, setReply] = useState("");
  const [replyStatus, setReplyStatus] = useState("waiting_for_customer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "reply" | "note" | "status">(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const token = useRef("");
  const working = useRef(false);

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const res = await withTimeout(getTicketAction(id), 25_000);
      if (res.success) setData(res);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (kind: "reply" | "note" | "status", fn: () => Promise<{ success: boolean; error?: string; emailed?: boolean }>, okText: (r: any) => string, after?: () => void) => {
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

  const sendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    if (!token.current) token.current = newSubmissionToken();
    run(
      "reply",
      () => replyToTicketAsStaffAction(id, reply, replyStatus, token.current),
      (r) => (r.emailed ? "Reply sent and emailed to the customer." : "Reply saved. The email could not be delivered yet and will be retried automatically."),
      () => {
        setReply("");
        token.current = "";
      }
    );
  };

  if (loading) return <LoadingBlock label="Loading query…" />;
  if (error || !data) return <ErrorBlock message={error || "Query not found."} onRetry={() => { setLoading(true); load(); }} />;
  const { ticket, order, messages, notes, events } = data;

  return (
    <div className="space-y-6 font-sans text-adm-text">
      <div>
        <Link href="/admin/queries" className="text-xs text-adm-muted hover:text-adm-gold">&larr; All queries</Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-adm-goldsoft">{ticket.ticketNumber}</p>
            <h1 className="text-xl sm:text-2xl font-serif text-adm-strong break-words">{ticket.subject}</h1>
          </div>
          <AdminChip status={ticket.status} label={ticketStatusLabel(ticket.status)} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section aria-label="Conversation" className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 space-y-3">
            {messages.map((m) => (
              <div key={m.id} className={`rounded-xl px-4 py-3 text-sm border ${m.from === "customer" ? "bg-adm-raised border-adm-line" : "bg-[#1b1708] border-adm-gold/30"}`}>
                <p className="text-[11px] text-adm-muted mb-1">{m.from === "customer" ? ticket.customerName : `Staff${m.by ? ` (${m.by})` : ""}`} · {formatDateTime(m.at)}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            ))}
          </section>

          <form onSubmit={sendReply} noValidate aria-busy={busy === "reply"} className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-sm font-semibold text-adm-strong">Reply to customer</h2>
            <p className="text-[11px] text-adm-muted">The customer sees this on their account and receives it by email.</p>
            <label htmlFor="staff-reply" className="sr-only">Reply</label>
            <textarea id="staff-reply" rows={5} maxLength={TICKET_LIMITS.reply} value={reply} disabled={busy === "reply"} onChange={(e) => setReply(e.target.value)} className={`${adminInput} w-full text-sm`} />
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label htmlFor="reply-status" className="text-[10px] uppercase text-adm-muted block mb-1">Then set status to</label>
                <select id="reply-status" value={replyStatus} onChange={(e) => setReplyStatus(e.target.value)} className={adminInput}>
                  {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <button type="submit" disabled={busy !== null || !reply.trim()} className="ml-auto min-h-[44px] px-6 rounded-full bg-[#D4AF37] text-black text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50">
                {busy === "reply" ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Send reply
              </button>
            </div>
          </form>

          {message && (
            <p role={message.ok ? "status" : "alert"} className={`text-xs rounded-xl px-3 py-2.5 border ${message.ok ? "text-adm-ok bg-adm-ok/15 border-adm-ok/40" : "text-adm-danger bg-adm-danger/15 border-adm-danger/40"}`}>{message.text}</p>
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
            <label htmlFor="ticket-status" className="sr-only">Change status</label>
            <select
              id="ticket-status"
              value={ticket.status}
              disabled={busy === "status"}
              onChange={(e) => id && run("status", () => setTicketStatusAction(id, e.target.value), (r: any) => (r.emailed ? "Status updated and the customer was emailed." : "Status updated."))}
              className={`${adminInput} w-full`}
            >
              {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <AlertDot state={data.alertState} />
          </section>

          <section className="bg-adm-surface border border-adm-line rounded-2xl p-4 sm:p-5 text-xs space-y-2" aria-label="Customer">
            <h2 className="text-sm font-semibold text-adm-strong">Customer</h2>
            <p className="text-adm-text">{ticket.customerName}{ticket.accountDeleted && <span className="ml-2 text-[10px] text-adm-faint">(account deleted)</span>}</p>
            <p className="text-adm-muted break-all"><a href={`mailto:${ticket.customerEmail}`} className="hover:text-adm-gold">{ticket.customerEmail}</a></p>
            <p className="text-adm-faint">{ticketCategoryLabel(ticket.category)} · opened {formatDateTime(ticket.createdAt)}</p>
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
