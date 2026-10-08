// CSS-only loading placeholders (no JavaScript cost). The shimmer is defined in globals.css (.skeleton) and follows the
// admin theme. Each block has the same size as the real content, so nothing jumps when the data arrives.
import React from "react";

export const Sk = ({ className = "" }: { className?: string }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

export function SkeletonLabel({ text = "Loading" }: { text?: string }) {
  return <span className="sr-only">{text}…</span>;
}

/** Admin dashboard: heading, KPI cards, then a table. */
export function AdminPageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-6">
      <SkeletonLabel />
      <div className="space-y-2 pb-6 border-b border-adm-line">
        <Sk className="h-8 w-64" />
        <Sk className="h-3.5 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-adm-line bg-adm-surface p-5 space-y-3">
            <Sk className="h-3 w-24" />
            <Sk className="h-8 w-32" />
            <Sk className="h-3 w-20" />
          </div>
        ))}
      </div>
      <TableSkeleton rows={6} />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface overflow-hidden" aria-hidden="true">
      <div className="px-4 py-3 border-b border-adm-line bg-adm-raised">
        <Sk className="h-3 w-40" />
      </div>
      <div className="divide-y divide-adm-line">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <Sk className="h-4 w-24" />
            <Sk className="h-4 flex-1 max-w-xs" />
            <Sk className="h-4 w-28 hidden sm:block" />
            <Sk className="h-6 w-20 rounded-full ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Storefront / account pages. */
export function PageSkeleton() {
  return (
    <div role="status" aria-busy="true" className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <SkeletonLabel />
      <Sk className="h-9 w-64" />
      <Sk className="h-4 w-96 max-w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-3xl border border-brand-border p-6 space-y-3">
            <Sk className="h-4 w-24" />
            <Sk className="h-8 w-16" />
            <Sk className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="space-y-3 pt-4">
        {[0, 1, 2].map((i) => (
          <Sk key={i} className="h-20 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Product detail: gallery on the left, details on the right. */
export function ProductSkeleton() {
  return (
    <div role="status" aria-busy="true" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
      <SkeletonLabel text="Loading saree" />
      <div className="space-y-3">
        <Sk className="aspect-[3/4] w-full rounded-3xl" />
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Sk key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-5 pt-2">
        <Sk className="h-3 w-32" />
        <Sk className="h-9 w-4/5" />
        <Sk className="h-7 w-40" />
        <Sk className="h-20 w-full" />
        <Sk className="h-12 w-full rounded-full" />
        <Sk className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}

/** Category / shop grid. */
export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div role="status" aria-busy="true" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SkeletonLabel text="Loading sarees" />
      <Sk className="h-9 w-56 mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Sk className="aspect-[3/4] w-full rounded-2xl" />
            <Sk className="h-4 w-4/5" />
            <Sk className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
