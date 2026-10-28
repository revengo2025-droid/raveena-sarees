"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroBanner } from "@/lib/hero/types";

/**
 * "responsive" is the real storefront (Tailwind breakpoints follow the screen). "mobile" and "desktop" pin one
 * layout so the admin preview can show both side by side regardless of the admin's own screen size.
 * Class names are written out in full (never concatenated) so Tailwind can see them.
 */
export type HeroVariant = "responsive" | "mobile" | "desktop";

const STYLES: Record<HeroVariant, Record<"section" | "pill" | "prev" | "next" | "dots" | "dot" | "dotOn" | "dotOff", string>> = {
  responsive: {
    section: "aspect-[2.4/1] sm:aspect-[21/9] sm:min-h-[440px] md:min-h-[520px] lg:min-h-[580px] xl:min-h-[640px]",
    pill: "bottom-6 sm:bottom-8 right-6 sm:right-12 hidden sm:flex",
    prev: "left-2 sm:left-8 p-1.5 sm:p-3.5",
    next: "right-2 sm:right-8 p-1.5 sm:p-3.5",
    dots: "bottom-1.5 sm:bottom-7 gap-1 sm:gap-2.5 bg-black/30 sm:bg-black/40 px-1.5 sm:px-4 py-1 sm:py-2",
    dot: "h-1 sm:h-2",
    dotOn: "w-3 sm:w-8 bg-brand-gold shadow-gold",
    dotOff: "w-1 sm:w-2 bg-white/60 hover:bg-white",
  },
  mobile: {
    section: "aspect-[2.4/1]",
    pill: "hidden",
    prev: "left-2 p-1.5",
    next: "right-2 p-1.5",
    dots: "bottom-1.5 gap-1 bg-black/30 px-1.5 py-1",
    dot: "h-1",
    dotOn: "w-3 bg-brand-gold shadow-gold",
    dotOff: "w-1 bg-white/60 hover:bg-white",
  },
  desktop: {
    section: "aspect-[21/9]",
    pill: "bottom-8 right-12 flex",
    prev: "left-8 p-3.5",
    next: "right-8 p-3.5",
    dots: "bottom-7 gap-2.5 bg-black/40 px-4 py-2",
    dot: "h-2",
    dotOn: "w-8 bg-brand-gold shadow-gold",
    dotOff: "w-2 bg-white/60 hover:bg-white",
  },
};

const AUTOPLAY_MS = 8000;

export function HeroCarousel({
  banners,
  variant = "responsive",
  preview = false,
}: {
  banners: HeroBanner[];
  variant?: HeroVariant;
  /** Admin preview: slides are not links, and the first image is not preloaded. */
  preview?: boolean;
}) {
  const count = banners.length;
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const s = STYLES[variant];

  // The admin can add or remove banners while the preview is on screen
  useEffect(() => {
    setCurrent((c) => (count === 0 ? 0 : Math.min(c, count - 1)));
  }, [count]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(q.matches);
    const onChange = () => setReduceMotion(q.matches);
    q.addEventListener?.("change", onChange);
    return () => q.removeEventListener?.("change", onChange);
  }, []);

  // One timer per slide: any manual change restarts the countdown instead of skipping ahead a moment later
  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const t = setTimeout(() => setCurrent((c) => (c + 1) % count), AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [current, count, paused, reduceMotion]);

  const go = useCallback((i: number) => setCurrent(((i % count) + count) % count), [count]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections"
      // Pause while a mouse hovers. Touch is excluded: a tap fires an emulated "enter" with no matching "leave",
      // which would freeze the carousel on phones after the first tap.
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      className={`relative w-full overflow-hidden bg-brand-ivory group ${s.section}`}
    >
      {banners.map((b, idx) => {
        const active = current === idx;
        const slideClass = `absolute inset-0 block transition-opacity duration-1000 ease-in-out motion-reduce:transition-none ${
          active ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
        }`;
        const content = (
          <>
            {/* Banner: optimised + responsive (WebP, sized per device) */}
            <Image
              src={b.imageUrl}
              alt={b.alt}
              fill
              sizes="100vw"
              quality={80}
              priority={!preview && idx === 0}
              className="object-cover object-center"
            />

            {/* Subtle gradient along the bottom keeps the navigation readable */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />

            {b.buttonText && (
              <div className={`absolute z-20 items-center gap-2 ${s.pill}`}>
                <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-maroon/90 hover:bg-brand-maroon text-white text-xs font-bold uppercase tracking-[0.18em] shadow-luxury backdrop-blur-sm border border-brand-gold/40 hover:scale-105 transition-all font-poppins">
                  {b.buttonText} <ArrowRight className="w-3.5 h-3.5 text-amber-200" />
                </span>
              </div>
            )}
          </>
        );

        return preview ? (
          <div key={b.id} aria-hidden={!active} className={slideClass}>
            {content}
          </div>
        ) : (
          <Link key={b.id} href={b.linkUrl} aria-hidden={!active} tabIndex={active ? 0 : -1} className={slideClass}>
            {content}
          </Link>
        );
      })}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(current - 1);
            }}
            className={`absolute top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/80 hover:bg-brand-gold text-brand-text hover:text-white border border-brand-gold/40 backdrop-blur-md transition-all shadow-luxury opacity-85 hover:opacity-100 hover:scale-110 ${s.prev}`}
            aria-label="Previous Banner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              go(current + 1);
            }}
            className={`absolute top-1/2 -translate-y-1/2 z-30 rounded-full bg-white/80 hover:bg-brand-gold text-brand-text hover:text-white border border-brand-gold/40 backdrop-blur-md transition-all shadow-luxury opacity-85 hover:opacity-100 hover:scale-110 ${s.next}`}
            aria-label="Next Banner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide indicators (small on phones; the invisible ::after widens the tap area) */}
          <div className={`absolute left-1/2 -translate-x-1/2 z-30 flex items-center backdrop-blur-md rounded-full border border-white/20 ${s.dots}`}>
            {banners.map((b, idx) => (
              <button
                key={b.id}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  go(idx);
                }}
                className={`relative rounded-full transition-all duration-500 after:absolute after:-inset-1.5 after:content-[''] ${s.dot} ${
                  current === idx ? s.dotOn : s.dotOff
                }`}
                aria-label={`Go to slide ${idx + 1}`}
                aria-current={current === idx}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
