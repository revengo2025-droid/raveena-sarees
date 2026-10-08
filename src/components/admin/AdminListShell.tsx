"use client";

import React from "react";
import { AlertTriangle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeletons";

/** Shared dark-theme building blocks for the admin list pages (queries, messages, audit log). */

export const adminInput =
  "bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-xs text-adm-strong placeholder-adm-faint focus:outline-none focus:border-adm-gold min-h-[40px]";

export function AdminPageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-adm-line pb-6">
      <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">{title}</h1>
      <p className="text-xs text-adm-muted mt-1">{subtitle}</p>
    </div>
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <TableSkeleton rows={6} />
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="bg-adm-danger/15 border border-adm-danger/40 rounded-2xl p-5 text-sm text-adm-danger flex flex-col sm:flex-row sm:items-center gap-3">
      <span className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" /> {message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 min-h-[40px] px-4 rounded-full border border-adm-danger/40 text-xs font-semibold hover:bg-adm-danger/15">
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function Pager({ page, pageSize, total, onPage, busy }: { page: number; pageSize: number; total: number; onPage: (p: number) => void; busy?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="text-[11px] text-adm-faint">{total} result{total === 1 ? "" : "s"}</p>;
  return (
    <div className="flex items-center justify-between gap-3 text-xs text-adm-muted">
      <span>{total} results</span>
      <div className="flex items-center gap-2">
        <button type="button" disabled={page <= 1 || busy} onClick={() => onPage(page - 1)} aria-label="Previous page" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-adm-line2 disabled:opacity-40 hover:border-adm-gold">
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
        </button>
        <span>Page {page} of {pages}</span>
        <button type="button" disabled={page >= pages || busy} onClick={() => onPage(page + 1)} aria-label="Next page" className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-adm-line2 disabled:opacity-40 hover:border-adm-gold">
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Dark-theme status chip (the customer-facing StatusBadge is light-theme). */
const TONES: Record<string, string> = {
  open: "bg-amber-500/15 text-adm-warn border-amber-500/30",
  new: "bg-amber-500/15 text-adm-warn border-amber-500/30",
  in_progress: "bg-sky-500/15 text-adm-info border-sky-500/30",
  read: "bg-sky-500/15 text-adm-info border-sky-500/30",
  waiting_for_customer: "bg-violet-500/15 text-adm-violet border-violet-500/30",
  resolved: "bg-emerald-500/15 text-adm-ok border-emerald-500/30",
  replied: "bg-emerald-500/15 text-adm-ok border-emerald-500/30",
  closed: "bg-gray-500/15 text-adm-text border-adm-line2",
};
export function AdminChip({ status, label }: { status: string; label: string }) {
  return <span className={`inline-flex whitespace-nowrap px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${TONES[status] || TONES.closed}`}>{label}</span>;
}

export function AlertDot({ state }: { state: "sent" | "pending" | "failed" | "none" }) {
  const map = {
    sent: ["bg-emerald-400", "Email alert delivered"],
    pending: ["bg-amber-400", "Email alert queued"],
    failed: ["bg-red-500", "Email alert failed (will retry)"],
    none: ["bg-gray-600", "No email alert recorded"],
  } as const;
  const [dot, text] = map[state];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-adm-muted" title={text}>
      <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" /> <span>{text}</span>
    </span>
  );
}
