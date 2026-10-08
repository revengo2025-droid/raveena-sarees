"use client";

import React from "react";
import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { useApp } from "@/lib/store";

/** Toasts slide and spring in, and glide out. The region is announced politely to screen readers. */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      className="fixed z-[120] flex flex-col gap-2.5 w-[calc(100%-2rem)] max-w-sm pointer-events-none font-sans bottom-20 left-4 lg:bottom-6 lg:left-6"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <m.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: -40, scale: 0.96, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-luxury backdrop-blur-md ${
              toast.type === "success"
                ? "bg-white/95 border-emerald-300 text-emerald-950"
                : toast.type === "error"
                ? "bg-white/95 border-red-300 text-red-950"
                : "bg-white/95 border-brand-gold/50 text-brand-text"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden="true" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-brand-gold shrink-0 mt-0.5" aria-hidden="true" />}

            <div className="flex-1 text-xs leading-relaxed font-medium">{toast.message}</div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-400 hover:text-neutral-700 p-1 -m-0.5 rounded-full hover:bg-neutral-100 transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </m.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
