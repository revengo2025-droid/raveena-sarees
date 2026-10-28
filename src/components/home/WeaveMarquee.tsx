"use client";

import React, { useMemo } from "react";
import { m } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";

/**
 * A slow, endless ribbon of the store's real collection and fabric names. Purely decorative (aria-hidden), so it
 * never repeats noise for screen readers. Motion stops automatically for visitors who prefer reduced motion.
 */
export function WeaveMarquee() {
  const { categories, products } = useApp();

  const words = useMemo(() => {
    const set = new Set<string>();
    categories.forEach((c) => c.name && set.add(c.name));
    products.forEach((p) => p.fabric && set.add(p.fabric));
    return Array.from(set).slice(0, 14);
  }, [categories, products]);

  if (words.length < 3) return null;

  // Two identical halves, each item carrying its own right padding, so moving by exactly -50% loops seamlessly
  const loop = [...words, ...words];

  return (
    <section aria-hidden="true" className="overflow-hidden border-y border-brand-border bg-white py-4 sm:py-5">
      <m.div
        className="flex w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: words.length * 4.5, ease: "linear", repeat: Infinity }}
      >
        {loop.map((word, i) => (
          <span key={`${word}-${i}`} className="flex items-center gap-8 sm:gap-12 pr-8 sm:pr-12 whitespace-nowrap">
            <span className="font-serif text-lg sm:text-2xl text-brand-text/80 tracking-wide">{word}</span>
            <Sparkles className="w-4 h-4 text-brand-gold" />
          </span>
        ))}
      </m.div>
    </section>
  );
}
