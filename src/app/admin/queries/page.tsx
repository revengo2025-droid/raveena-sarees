"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, MessageSquareReply } from "lucide-react";
import { listTicketsAction } from "@/app/actions/admin-support";
import { TICKET_CATEGORIES, TICKET_STATUSES, ticketCategoryLabel, ticketStatusLabel } from "@/lib/support/constants";
import { formatDateTime, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminChip, AdminPageHeader, ErrorBlock, LoadingBlock, Pager, adminInput } from "@/components/admin/AdminListShell";

type Row = { id: string; ticketNumber: string; customerName: string; customerEmail: string; category: string; subject: string; orderNumber: string | null; status: string; createdAt: string; lastActivityAt: string };

const QUICK_TABS = [
  { value: "needs_reply", label: "Needs reply" },
  { value: "", label: "All" },
  { value: "waiting_for_customer", label: "Waiting for customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

export default function AdminQueriesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: "", status: "needs_reply", category: "", from: "", to: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Typing in the search box only queries after a short pause
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
      const res = await withTimeout(listTicketsAction({ search: debouncedSearch, status: filters.status, category: filters.category, from: filters.from, to: filters.to, page }), 25_000);
      if (mine !== requestId.current) return; // a newer request superseded this one
      if (res.success) {
        setRows(res.rows);
        setTotal(res.total);
        setPageSize(res.pageSize);
      } else setError(res.error);
    } catch (e) {
      if (mine === requestId.current) setError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [debouncedSearch, filters.status, filters.category, filters.from, filters.to, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (k: "status" | "category" | "from" | "to") => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    setFilters((f) => ({ ...f, [k]: e.target.value }));
    setPage(1);
  };

  return (
    <div className="space-y-6 font-sans">
      <AdminPageHeader title="Customer Queries" subtitle="Support tickets raised by customers. Click any query to read it, reply, and mark it resolved or closed. The customer sees your reply in their account and by email." />

      <div role="group" aria-label="Quick filter" className="flex gap-2 overflow-x-auto pb-1">
        {QUICK_TABS.map((t) => {
          const on = filters.status === t.value;
          return (
            <button
              key={t.label}
              type="button"
              aria-pressed={on}
              onClick={() => {
                setFilters((f) => ({ ...f, status: t.value }));
                setPage(1);
              }}
              className={`shrink-0 min-h-[40px] px-4 rounded-full text-xs font-semibold border transition-colors ${
                on ? "bg-adm-gold text-black border-adm-gold" : "bg-adm-surface text-adm-text border-adm-line2 hover:border-adm-gold"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-2">
          <label htmlFor="q-search" className="sr-only">Search queries</label>
          <Search className="w-4 h-4 text-adm-muted absolute left-3 top-3" aria-hidden="true" />
          <input id="q-search" type="search" placeholder="Search ticket, subject, name, email, order…" maxLength={60} value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} className={`${adminInput} w-full pl-9`} />
        </div>
        <div>
          <label htmlFor="q-status" className="sr-only">Status</label>
          <select id="q-status" value={filters.status} onChange={setFilter("status")} className={`${adminInput} w-full`}>
            <option value="">All statuses</option>
            <option value="needs_reply">Needs reply</option>
            {TICKET_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q-cat" className="sr-only">Category</label>
          <select id="q-cat" value={filters.category} onChange={setFilter("category")} className={`${adminInput} w-full`}>
            <option value="">All categories</option>
            {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-2">
          <div className="flex-1">
            <label htmlFor="q-from" className="sr-only">From date</label>
            <input id="q-from" type="date" value={filters.from} onChange={setFilter("from")} className={`${adminInput} w-full`} />
          </div>
          <div className="flex-1">
            <label htmlFor="q-to" className="sr-only">To date</label>
            <input id="q-to" type="date" value={filters.to} onChange={setFilter("to")} className={`${adminInput} w-full`} />
          </div>
        </div>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}
      {loading && rows.length === 0 && !error && <LoadingBlock label="Loading queries…" />}

      {!error && !(loading && rows.length === 0) && (
        <div className={`bg-adm-surface border border-adm-line rounded-2xl overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-adm-muted">
              {filters.status === "needs_reply" && !debouncedSearch ? "All caught up: no queries are waiting for a reply." : "No queries match these filters."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-adm-muted bg-adm-raised border-b border-adm-line">
                  <tr>
                    <th scope="col" className="py-3 px-4">Ticket</th>
                    <th scope="col" className="py-3 px-4">Customer</th>
                    <th scope="col" className="py-3 px-4">Category</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4">Last activity</th>
                    <th scope="col" className="py-3 px-4"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adm-line">
                  {rows.map((t) => (
                    // The whole row opens the query (mouse); the link and button inside keep it keyboard and screen-reader friendly
                    <tr key={t.id} onClick={() => router.push(`/admin/queries/${t.id}`)} className="hover:bg-adm-hover cursor-pointer">
                      <td className="py-3 px-4 max-w-[280px]">
                        <Link href={`/admin/queries/${t.id}`} onClick={(e) => e.stopPropagation()} className="text-adm-goldsoft font-mono hover:underline">{t.ticketNumber}</Link>
                        <p className="text-adm-text truncate" title={t.subject}>{t.subject}</p>
                        {t.orderNumber && <p className="text-[10px] text-adm-faint">Order {t.orderNumber}</p>}
                      </td>
                      <td className="py-3 px-4"><p className="text-adm-text">{t.customerName}</p><p className="text-[10px] text-adm-faint break-all">{t.customerEmail}</p></td>
                      <td className="py-3 px-4 text-adm-text">{ticketCategoryLabel(t.category)}</td>
                      <td className="py-3 px-4"><AdminChip status={t.status} label={ticketStatusLabel(t.status)} /></td>
                      <td className="py-3 px-4 text-adm-muted whitespace-nowrap">{formatDateTime(t.lastActivityAt)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/queries/${t.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 min-h-[36px] px-3.5 rounded-full border border-adm-gold/50 text-adm-gold text-[11px] font-semibold whitespace-nowrap hover:bg-adm-gold hover:text-black"
                        >
                          <MessageSquareReply className="w-3.5 h-3.5" aria-hidden="true" />
                          {t.status === "open" || t.status === "in_progress" ? "Reply" : "Open"}
                          <span className="sr-only"> to {t.ticketNumber}</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {!error && total > 0 && <Pager page={page} pageSize={pageSize} total={total} onPage={setPage} busy={loading} />}
    </div>
  );
}
