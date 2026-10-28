"use client";

import React from "react";
import type { Variants } from "framer-motion";
import { Reveal } from "@/components/motion/Reveal";

/** Same easing curve as <Reveal>, so every section on the page moves with one feel. */
export const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Parent variant: children using `rise` / `slide` animate one after another. */
export const stagger = (gap = 0.08, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const rise: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
};

export const slideFromRight: Variants = {
  hidden: { opacity: 0, x: 36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

/** Section title block used by all the new homepage sections. Must sit inside a <MotionProvider>. */
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  light = false,
  align = "center",
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: string;
  light?: boolean;
  align?: "center" | "left";
  /** Optional controls shown beside the title (for example carousel arrows). */
  children?: React.ReactNode;
}) {
  const centered = align === "center";
  return (
    <Reveal className={`mb-10 sm:mb-14 flex ${centered ? "flex-col items-center text-center" : "flex-col sm:flex-row sm:items-end sm:justify-between gap-6"}`}>
      <div className={centered ? "flex flex-col items-center" : ""}>
        <span className={`inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] font-poppins ${light ? "text-amber-200" : "text-brand-gold"}`}>
          <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />
          {eyebrow}
          {centered && <span aria-hidden="true" className="h-px w-8 bg-current opacity-60" />}
        </span>
        <h2 className={`mt-3 text-3xl sm:text-4xl lg:text-5xl font-serif font-normal tracking-tight ${light ? "text-white" : "text-brand-text"}`}>{title}</h2>
        {subtitle && (
          <p className={`mt-3 max-w-xl text-sm sm:text-base font-light leading-relaxed ${light ? "text-neutral-200" : "text-neutral-600"}`}>{subtitle}</p>
        )}
      </div>
      {children}
    </Reveal>
  );
}
