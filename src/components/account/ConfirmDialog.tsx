"use client";

import React, { useEffect, useRef } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  title: string;
  /** What will happen, in plain words. */
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Shows a spinner and blocks closing while the action runs. */
  busy?: boolean;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small accessible confirmation dialog (replaces window.confirm, which is easy to miss and cannot be styled).
 * Focus starts on the safe choice, Tab stays inside, Escape cancels, and focus returns to the opener afterwards.
 */
export function ConfirmDialog({ open, title, children, confirmLabel, cancelLabel = "Cancel", busy = false, danger = false, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const t = setTimeout(() => cancelRef.current?.focus(), 30);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = "";
      (openerRef.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4" onKeyDown={trapTab}>
      <div className="absolute inset-0 bg-black/50 animate-fadeIn" aria-hidden="true" onClick={() => !busy && onCancel()} />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        aria-busy={busy}
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-modal p-6 text-brand-text animate-slideInUp sm:animate-fadeIn motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${danger ? "bg-red-50 text-red-600" : "bg-brand-goldPale text-brand-maroon"}`}>
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-serif">{title}</h2>
            <div id="confirm-desc" className="text-sm text-neutral-600 mt-1">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-[48px] px-6 rounded-full border border-brand-border text-sm font-semibold hover:border-brand-gold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`min-h-[48px] px-6 rounded-full text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              danger ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500" : "bg-brand-maroon hover:bg-brand-maroonDark focus-visible:ring-brand-gold"
            }`}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
