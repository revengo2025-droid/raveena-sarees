"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Search, Mail, Phone } from "lucide-react";
import { listCustomersAction, type AdminCustomerRow } from "@/app/actions/admin-customers";
import { withTimeout, RequestTimeoutError, TIMEOUT_MESSAGE, NETWORK_MESSAGE } from "@/lib/support/client";
import { AdminPageHeader, ErrorBlock, LoadingBlock, Pager, adminInput } from "@/components/admin/AdminListShell";
import { formatINR } from "@/lib/utils";

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<AdminCustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(listCustomersAction({ search: debounced, page }), 25_000);
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
  }, [debounced, page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 font-sans">
      <AdminPageHeader title="Customers" subtitle="Every registered customer account with their contact numbers, city and order history." />

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <label htmlFor="cust-search" className="sr-only">Search customers</label>
          <Search className="w-4 h-4 text-adm-muted absolute left-3 top-3" aria-hidden="true" />
          <input
            id="cust-search"
            type="search"
            placeholder="Search by name, email or mobile number…"
            maxLength={60}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${adminInput} w-full pl-9`}
          />
        </div>
        <span className="text-xs text-adm-goldsoft font-semibold" aria-live="polite">
          {total} customer{total === 1 ? "" : "s"}
        </span>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}
      {loading && rows.length === 0 && !error && <LoadingBlock label="Loading customers…" />}

      {!error && !(loading && rows.length === 0) && (
        <div className={`bg-adm-surface border border-adm-line rounded-2xl overflow-hidden transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
          {rows.length === 0 ? (
            <p className="p-10 text-center text-sm text-adm-muted">{debounced ? "No customers match this search." : "No customers have registered yet."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[10px] uppercase font-bold text-adm-muted bg-adm-raised border-b border-adm-line">
                  <tr>
                    <th scope="col" className="py-3 px-4">Customer</th>
                    <th scope="col" className="py-3 px-4">Mobile</th>
                    <th scope="col" className="py-3 px-4">Secondary mobile</th>
                    <th scope="col" className="py-3 px-4">City</th>
                    <th scope="col" className="py-3 px-4">Orders</th>
                    <th scope="col" className="py-3 px-4">Paid total</th>
                    <th scope="col" className="py-3 px-4">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adm-line">
                  {rows.map((c) => (
                    <tr key={c.id} className="hover:bg-adm-hover">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-adm-strong text-sm">{c.name}</p>
                        <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-adm-muted hover:text-adm-gold break-all">
                          <Mail className="w-3 h-3 shrink-0" aria-hidden="true" /> {c.email}
                        </a>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.phone ? (
                          <a href={`tel:+91${c.phone}`} className="inline-flex items-center gap-1 text-adm-text hover:text-adm-gold">
                            <Phone className="w-3 h-3" aria-hidden="true" /> +91 {c.phone}
                          </a>
                        ) : (
                          <span className="text-adm-faint">Not added</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {c.secondaryPhone ? (
                          <a href={`tel:+91${c.secondaryPhone}`} className="inline-flex items-center gap-1 text-adm-text hover:text-adm-gold">
                            <Phone className="w-3 h-3" aria-hidden="true" /> +91 {c.secondaryPhone}
                          </a>
                        ) : (
                          <span className="text-adm-faint">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-adm-text">{c.city ? `${c.city}, ${c.state}` : <span className="text-adm-faint">—</span>}</td>
                      <td className="py-3 px-4 font-semibold text-adm-strong">{c.ordersCount}</td>
                      <td className="py-3 px-4 font-semibold text-adm-goldsoft whitespace-nowrap">{formatINR(c.paidSpend)}</td>
                      <td className="py-3 px-4 text-adm-muted whitespace-nowrap">{new Date(c.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</td>
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
