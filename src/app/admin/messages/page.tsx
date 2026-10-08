"use client";

import React, { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Mail, Phone, Trash2, ChevronDown } from "lucide-react";
import { deleteContactMessageAction, listContactMessagesAction, saveContactNotesAction, setContactStatusAction } from "@/app/actions/admin-support";
import { CONTACT_STATUSES, contactStatusLabel } from "@/lib/support/constants";
import { formatDateTime, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminChip, AdminPageHeader, AlertDot, ErrorBlock, LoadingBlock, Pager, adminInput } from "@/components/admin/AdminListShell";
import { useApp } from "@/lib/store";

type Row = {
  id: string; ref: string; name: string; email: string; phone: string | null; subject: string; message: string; status: string;
  adminNotes: string; createdAt: string; repliedAt: string | null; alertState: "sent" | "pending" | "failed" | "none";
};

function MessagesInner() {
  const { user } = useApp();
  const openParam = useSearchParams().get("open");
  const [filters, setFilters] = useState({ search: "", status: "", from: "", to: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(openParam);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const requestId = useRef(0);
  const working = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(listContactMessagesAction({ search: debouncedSearch, status: filters.status, from: filters.from, to: filters.to, page }), 25_000);
      if (mine !== requestId.current) return;
      if (res.success) {
        setRows(res.rows);
        setTotal(res.total);
        setPageSize(res.pageSize);
        setNotes((n) => {
          const next = { ...n };
          for (const r of res.rows) if (next[r.id] === undefined) next[r.id] = r.adminNotes;
          return next;
        });
      } else setError(res.error);
    } catch (e) {
      if (mine === requestId.current) setError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.from, filters.to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, fn: () => Promise<{ success: boolean; error?: string }>, ok: string) => {
    if (working.current) return;
    working.current = true;
    setBusyId(id);
    setNotice(null);
    try {
      const r = await withTimeout(fn());
      if (r.success) {
        setNotice({ ok: true, text: ok });
        await load();
      } else setNotice({ ok: false, text: r.error || "That did not work. Please try again." });
    } catch (e) {
      setNotice({ ok: false, text: e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE });
    } finally {
      working.current = false;
      setBusyId(null);
    }
  };

  // Opening a "new" message marks it as read (once)
  const toggle = (r: Row) => {
    const opening = openId !== r.id;
    setOpenId(opening ? r.id : null);
    if (opening && r.status === "new") act(r.id, () => setContactStatusAction(r.id, "read"), "Marked as read.");
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 font-sans">
      <AdminPageHeader title="Contact Messages" subtitle="Messages sent from the Contact Us form. Reply from your email, then mark them as replied." />

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <label htmlFor="m-search" className="sr-only">Search messages</label>
          <Search className="w-4 h-4 text-adm-muted absolute left-3 top-3" aria-hidden="true" />
          <input id="m-search" type="search" maxLength={60} placeholder="Search name, email, subject, text…" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className={`${adminInput} w-full pl-9`} />
        </div>
        <div>
          <label htmlFor="m-status" className="sr-only">Status</label>
          <select id="m-status" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }} className={`${adminInput} w-full`}>
            <option value="">All statuses</option>
            {CONTACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="m-from" className="sr-only">From date</label>
          <input id="m-from" type="date" value={filters.from} onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }} className={`${adminInput} w-full`} />
        </div>
        <div>
          <label htmlFor="m-to" className="sr-only">To date</label>
          <input id="m-to" type="date" value={filters.to} onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }} className={`${adminInput} w-full`} />
        </div>
      </div>

      {notice && (
        <p role={notice.ok ? "status" : "alert"} className={`text-xs rounded-xl px-3 py-2.5 border ${notice.ok ? "text-adm-ok bg-adm-ok/15 border-adm-ok/40" : "text-adm-danger bg-adm-danger/15 border-adm-danger/40"}`}>{notice.text}</p>
      )}
      {error && <ErrorBlock message={error} onRetry={load} />}
      {loading && rows.length === 0 && !error && <LoadingBlock label="Loading messages…" />}

      {!error && !(loading && rows.length === 0) && (
        rows.length === 0 ? (
          <p className="bg-adm-surface border border-adm-line rounded-2xl p-10 text-center text-sm text-adm-muted">No messages match these filters.</p>
        ) : (
          <ul className={`space-y-3 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {rows.map((r) => {
              const open = openId === r.id;
              return (
                <li key={r.id} className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden">
                  <button type="button" onClick={() => toggle(r)} aria-expanded={open} aria-controls={`msg-${r.id}`} className="w-full text-left p-4 flex items-start gap-3 hover:bg-adm-surface">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-[11px] text-adm-goldsoft">{r.ref}</span>
                        <AdminChip status={r.status} label={contactStatusLabel(r.status)} />
                        <span className="text-[11px] text-adm-faint">{formatDateTime(r.createdAt)}</span>
                      </div>
                      <p className={`mt-1 truncate ${r.status === "new" ? "font-semibold text-adm-strong" : "text-adm-text"}`}>{r.subject}</p>
                      <p className="text-xs text-adm-muted truncate">{r.name} · {r.email}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-adm-muted shrink-0 mt-1 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>

                  {open && (
                    <div id={`msg-${r.id}`} className="border-t border-adm-line p-4 space-y-4 text-sm">
                      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div><dt className="text-[10px] uppercase text-adm-faint">Message ID</dt><dd className="font-mono break-all text-adm-text">{r.id}</dd></div>
                        <div><dt className="text-[10px] uppercase text-adm-faint">Email</dt><dd className="break-all"><a className="text-adm-goldsoft hover:underline inline-flex items-center gap-1" href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.subject} [${r.ref}]`)}`}><Mail className="w-3 h-3" aria-hidden="true" />{r.email}</a></dd></div>
                        <div><dt className="text-[10px] uppercase text-adm-faint">Phone</dt><dd className="text-adm-text">{r.phone ? <a className="hover:underline inline-flex items-center gap-1" href={`tel:+91${r.phone}`}><Phone className="w-3 h-3" aria-hidden="true" />{r.phone}</a> : "Not provided"}</dd></div>
                      </dl>
                      <div className="rounded-xl bg-adm-raised border border-adm-line px-4 py-3 whitespace-pre-wrap break-words text-gray-100">{r.message}</div>
                      <AlertDot state={r.alertState} />

                      <div>
                        <label htmlFor={`notes-${r.id}`} className="text-[10px] uppercase text-adm-faint block mb-1">Internal notes (staff only)</label>
                        <textarea id={`notes-${r.id}`} rows={2} maxLength={3000} value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} className={`${adminInput} w-full`} />
                        <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => saveContactNotesAction(r.id, notes[r.id] ?? ""), "Notes saved.")} className="mt-2 min-h-[40px] px-4 rounded-xl border border-adm-line2 text-xs font-semibold hover:border-adm-gold disabled:opacity-50">Save notes</button>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {r.status !== "read" && r.status !== "replied" && r.status !== "closed" && (
                          <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => setContactStatusAction(r.id, "read"), "Marked as read.")} className="min-h-[40px] px-4 rounded-full border border-adm-line2 text-xs font-semibold hover:border-adm-gold disabled:opacity-50">Mark as read</button>
                        )}
                        {r.status !== "replied" && (
                          <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => setContactStatusAction(r.id, "replied"), "Marked as replied.")} className="min-h-[40px] px-4 rounded-full border border-adm-ok/40 text-adm-ok text-xs font-semibold hover:bg-adm-ok/15 disabled:opacity-50">Mark as replied</button>
                        )}
                        {r.status !== "closed" ? (
                          <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => setContactStatusAction(r.id, "closed"), "Message closed.")} className="min-h-[40px] px-4 rounded-full border border-adm-line2 text-xs font-semibold hover:border-adm-gold disabled:opacity-50">Close</button>
                        ) : (
                          <button type="button" disabled={busyId === r.id} onClick={() => act(r.id, () => setContactStatusAction(r.id, "read"), "Message reopened.")} className="min-h-[40px] px-4 rounded-full border border-adm-line2 text-xs font-semibold hover:border-adm-gold disabled:opacity-50">Reopen</button>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => {
                              if (window.confirm(`Permanently delete message ${r.ref} from ${r.name}? This cannot be undone.`)) {
                                setOpenId(null);
                                act(r.id, () => deleteContactMessageAction(r.id), "Message deleted.");
                              }
                            }}
                            className="ml-auto min-h-[40px] px-4 rounded-full border border-adm-danger/40 text-adm-danger text-xs font-semibold hover:bg-adm-danger/15 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
      {!error && total > 0 && <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} busy={loading} />}
    </div>
  );
}

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={<LoadingBlock label="Loading…" />}>
      <MessagesInner />
    </Suspense>
  );
}
