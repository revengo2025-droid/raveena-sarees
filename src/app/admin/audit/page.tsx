"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { listAuditLogsAction, type AuditRow } from "@/app/actions/admin-audit";
import { formatDateTime, withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminPageHeader, ErrorBlock, LoadingBlock, Pager, adminInput } from "@/components/admin/AdminListShell";

const GROUPS = [
  ["", "All events"],
  ["auth.", "Sign-in / sign-out"],
  ["account.", "Account deletion"],
  ["product.", "Products"],
  ["order.", "Orders"],
  ["coupon.", "Coupons"],
  ["review.", "Reviews"],
  ["ticket.", "Support tickets"],
  ["contact.", "Contact messages"],
  ["settings.", "Settings"],
  ["security.", "Security"],
] as const;

export default function AdminAuditPage() {
  const [filters, setFilters] = useState({ action: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(listAuditLogsAction({ ...filters, page }), 25_000);
      if (mine !== requestId.current) return;
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
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 font-sans">
      <AdminPageHeader title="Audit Log" subtitle="A permanent record of sign-ins and sensitive administrative actions. Entries cannot be edited or deleted. Administrators only." />

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="a-action" className="sr-only">Event type</label>
          <select id="a-action" value={filters.action} onChange={(e) => { setFilters((f) => ({ ...f, action: e.target.value })); setPage(1); }} className={`${adminInput} w-full`}>
            {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="a-from" className="sr-only">From date</label>
          <input id="a-from" type="date" value={filters.from} onChange={(e) => { setFilters((f) => ({ ...f, from: e.target.value })); setPage(1); }} className={`${adminInput} w-full`} />
        </div>
        <div>
          <label htmlFor="a-to" className="sr-only">To date</label>
          <input id="a-to" type="date" value={filters.to} onChange={(e) => { setFilters((f) => ({ ...f, to: e.target.value })); setPage(1); }} className={`${adminInput} w-full`} />
        </div>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}
      {loading && rows.length === 0 && !error && <LoadingBlock label="Loading audit log…" />}

      {!error && !(loading && rows.length === 0) && (
        <div className={`bg-adm-surface border border-adm-line rounded-2xl overflow-hidden ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-adm-muted">No events match these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-adm-muted bg-adm-raised border-b border-adm-line">
                  <tr>
                    <th scope="col" className="py-3 px-4">When</th>
                    <th scope="col" className="py-3 px-4">Event</th>
                    <th scope="col" className="py-3 px-4">Who</th>
                    <th scope="col" className="py-3 px-4">Resource</th>
                    <th scope="col" className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adm-line">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top hover:bg-adm-surface">
                      <td className="py-3 px-4 whitespace-nowrap text-adm-muted">{formatDateTime(r.at)}</td>
                      <td className="py-3 px-4 font-mono text-adm-goldsoft">{r.action}</td>
                      <td className="py-3 px-4 text-adm-text break-all">{r.actor || "Anonymous / system"}</td>
                      <td className="py-3 px-4 text-adm-text"><span className="text-adm-faint">{r.entityType}</span>{r.entityId ? <span className="font-mono break-all"> {r.entityId}</span> : null}</td>
                      <td className="py-3 px-4 text-adm-muted font-mono break-all max-w-[280px]">{r.details ? JSON.stringify(r.details) : ""}</td>
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
