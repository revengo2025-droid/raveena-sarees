"use client";

import React from "react";
import { AnimatePresence, m } from "framer-motion";
import { Moon, Sun } from "lucide-react";

export type AdminTheme = "light" | "dark";

/** Sun/moon switch. The icons rotate and fade into each other. */
export function ThemeToggle({ theme, onToggle }: { theme: AdminTheme; onToggle: () => void }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="relative w-11 h-11 rounded-full border border-adm-line2 bg-adm-surface text-adm-gold flex items-center justify-center overflow-hidden hover:border-adm-gold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-adm-gold/60"
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={theme}
          initial={{ y: 14, opacity: 0, rotate: -50 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: -14, opacity: 0, rotate: 50 }}
          transition={{ duration: 0.22 }}
          className="flex"
        >
          {dark ? <Sun className="w-[18px] h-[18px]" aria-hidden="true" /> : <Moon className="w-[18px] h-[18px]" aria-hidden="true" />}
        </m.span>
      </AnimatePresence>
    </button>
  );
}
