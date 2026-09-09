"use client";

import React from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useApp } from "@/lib/store";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none font-sans">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-luxury backdrop-blur-md animate-scaleUp ${
            toast.type === "success"
              ? "bg-white/95 border-emerald-300 text-emerald-950"
              : toast.type === "error"
              ? "bg-white/95 border-red-300 text-red-950"
              : "bg-white/95 border-brand-gold/50 text-brand-text"
          }`}
        >
          {toast.type === "success" && (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          {toast.type === "error" && (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          {toast.type === "info" && (
            <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" />
          )}

          <div className="flex-1 text-xs leading-relaxed font-medium">{toast.message}</div>

          <button
            onClick={() => removeToast(toast.id)}
            className="text-neutral-400 hover:text-neutral-700 p-0.5 rounded-full hover:bg-neutral-100 transition-colors"
            aria-label="Dismiss toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
