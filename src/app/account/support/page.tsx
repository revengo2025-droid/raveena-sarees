"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Plus, Loader2, AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { listMyTicketsAction } from "@/app/actions/support";
import { ticketCategoryLabel } from "@/lib/support/constants";
import { formatDateTime, withTimeout, NETWORK_MESSAGE, TIMEOUT_MESSAGE, RequestTimeoutError } from "@/lib/support/client";
import { StatusBadge } from "@/components/support/StatusBadge";

type Row = { id: string; ticketNumber: string; category: string; subject: string; orderNumber: string | null; status: string; createdAt: string; updatedAt: string };

export default function SupportListPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await withTimeout(listMyTicketsAction(), 20_000);
      if (res.success) setRows(res.tickets);
      else setError(res.error);
    } catch (e) {
      setError(e instanceof RequestTimeoutError ? TIMEOUT_MESSAGE : NETWORK_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-4 font-poppins">
          <Link href="/account" className="hover:text-brand-gold">My account</Link> <span aria-hidden="true">/</span> <span className="text-brand-text">Help &amp; Support</span>
        </nav>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif">Help &amp; Support</h1>
            <p className="text-sm text-neutral-600 mt-1">Raise a query and follow our replies here.</p>
          </div>
          <Link href="/account/support/new" className="btn-primary inline-flex items-center gap-2 px-5 min-h-[44px] text-xs font-bold uppercase tracking-wider rounded-full shadow-md">
            <Plus className="w-4 h-4" aria-hidden="true" /> Raise a Query
          </Link>
        </div>

        {loading && (
          <div role="status" className="flex items-center justify-center gap-2 py-16 text-sm text-neutral-500">
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Loading your queries…
          </div>
        )}

        {!loading && error && (
          <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-5 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {error}</span>
            <button type="button" onClick={load} className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-red-300 bg-white text-xs font-semibold">
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
            </button>
          </div>
        )}

        {!loading && !error && rows && rows.length === 0 && (
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-8 text-center">
            <LifeBuoy className="w-10 h-10 text-brand-gold mx-auto mb-3" aria-hidden="true" />
            <h2 className="text-lg font-serif mb-1">No queries yet</h2>
            <p className="text-sm text-neutral-600 mb-4">If you need help with an order, payment, delivery or return, raise a query and we will reply here and by email.</p>
            <Link href="/account/support/new" className="btn-primary inline-block px-6 py-3 text-xs rounded-full font-semibold shadow-md">Raise a Query</Link>
          </div>
        )}

        {!loading && !error && rows && rows.length > 0 && (
          <ul className="space-y-3">
            {rows.map((t) => (
              <li key={t.id}>
                <Link href={`/account/support/${t.id}`} className="block bg-white border border-brand-border hover:border-brand-gold rounded-2xl p-4 sm:p-5 shadow-card transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono text-neutral-500">{t.ticketNumber}</p>
                      <p className="font-semibold text-brand-text mt-0.5 break-words">{t.subject}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {ticketCategoryLabel(t.category)}
                        {t.orderNumber ? ` · Order ${t.orderNumber}` : ""} · Opened {formatDateTime(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge kind="ticket" status={t.status} />
                      <ChevronRight className="w-4 h-4 text-neutral-400" aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
