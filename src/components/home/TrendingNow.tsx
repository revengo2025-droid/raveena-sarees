"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { m, useScroll, useTransform } from "framer-motion";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { rankTrending } from "@/lib/trending";
import { rise, SectionHeading, stagger } from "./motion";

/**
 * "Trending Now": the most-loved sarees as a ranked, swipeable showcase. Ranking uses only real catalogue signals
 * (bestseller / featured / new flags set in the admin, plus genuine rating and review count): see lib/trending.ts.
 */
export function TrendingNow() {
  const { products } = useApp();
  const items = useMemo(() => rankTrending(products, 8), [products]);

  const sectionRef = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false, progress: 0, thumb: 1 });

  // Decorative glows drift at different speeds as the section scrolls past
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const glowA = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const glowB = useTransform(scrollYProgress, [0, 1], [-40, 80]);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setEdge({
      start: el.scrollLeft <= 4,
      end: max <= 4 || el.scrollLeft >= max - 4,
      progress: max > 0 ? el.scrollLeft / max : 0,
      thumb: el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1,
    });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  const scrollByPage = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (items.length < 3) return null;

  const arrowClass =
    "w-11 h-11 rounded-full border border-white/30 text-white flex items-center justify-center transition-all hover:bg-brand-gold hover:border-brand-gold disabled:opacity-30 disabled:pointer-events-none";

  return (
    <section
      ref={sectionRef}
      aria-labelledby="trending-heading"
      className="relative overflow-hidden bg-gradient-to-b from-brand-maroonDark via-brand-maroon to-brand-maroonDark py-16 sm:py-24"
    >
      <m.div aria-hidden="true" style={{ y: glowA }} className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-gold/20 blur-3xl" />
      <m.div aria-hidden="true" style={{ y: glowB }} className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-brand-goldLight/15 blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          light
          align="left"
          eyebrow="Trending Now"
          title={<span id="trending-heading">The Sarees Everyone Is Eyeing</span>}
          subtitle="Our most-loved drapes, ranked by bestseller status and customer ratings."
        >
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => scrollByPage(-1)} disabled={edge.start} aria-label="Previous trending sarees" className={arrowClass}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" onClick={() => scrollByPage(1)} disabled={edge.end} aria-label="Next trending sarees" className={arrowClass}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </SectionHeading>

        <m.ul
          ref={track}
          onScroll={measure}
          variants={stagger(0.09)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="flex gap-4 sm:gap-6 overflow-x-auto snap-x snap-mandatory no-scrollbar pt-12 pb-4 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {items.map((product, i) => (
            <m.li key={product.id} variants={rise} className="relative shrink-0 snap-start w-[64%] sm:w-[40%] md:w-[31%] lg:w-[23.5%]">
              {/* Outlined rank numeral peeking above the card */}
              <span
                aria-hidden="true"
                className="pointer-events-none select-none absolute -top-11 left-1 z-20 font-serif text-[64px] leading-none font-bold text-transparent [-webkit-text-stroke:1.5px_#D4B86A]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <ProductCard product={product} />
            </m.li>
          ))}
        </m.ul>

        {/* Scroll position */}
        <div aria-hidden="true" className="mt-6 h-0.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-gold transition-[margin,width] duration-200"
            style={{ width: `${edge.thumb * 100}%`, marginLeft: `${edge.progress * (1 - edge.thumb) * 100}%` }}
          />
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/shop?sort=bestseller"
            className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-full border border-brand-gold/70 text-amber-100 hover:bg-brand-gold hover:text-white text-xs font-bold uppercase tracking-[0.22em] font-poppins transition-colors"
          >
            See All Bestsellers <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
