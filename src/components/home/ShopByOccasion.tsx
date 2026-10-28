"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { m } from "framer-motion";
import { useApp } from "@/lib/store";
import { occasionMatches, occasionText } from "@/lib/occasions";
import { rise, SectionHeading, stagger } from "./motion";

const TILES = [
  { option: "Bridal / Wedding", title: "Bridal & Wedding", blurb: "For the muhurtham and every ceremony after." },
  { option: "Grand Festive", title: "Festive Celebrations", blurb: "Rich zari for the days that deserve it." },
  { option: "Evening Party", title: "Party & Cocktail", blurb: "Shimmer and drape for the evening." },
  { option: "Daily Classic / Puja", title: "Puja & Everyday", blurb: "Graceful drapes for daily elegance." },
] as const;

/**
 * Shop by Occasion. Each tile's picture and count come from the real catalogue and use the same matching rule as
 * the shop filter it links to, so what a visitor sees here is exactly what they land on. Empty occasions are skipped.
 */
export function ShopByOccasion() {
  const { products } = useApp();

  const tiles = useMemo(
    () =>
      TILES.map((tile) => {
        const matches = products.filter((p) => occasionMatches(occasionText(p), tile.option));
        const cover = [...matches]
          .filter((p) => p.images[0])
          .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || Number(!!b.isFeatured) - Number(!!a.isFeatured) || Number(!!b.isBestseller) - Number(!!a.isBestseller))[0];
        return { ...tile, count: matches.length, image: cover?.images[0] || null, alt: cover?.name || tile.title };
      }).filter((t) => t.count > 0 && t.image),
    [products]
  );

  if (tiles.length < 2) return null;

  return (
    <section aria-labelledby="occasion-heading" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <SectionHeading
        eyebrow="Shop by Occasion"
        title={<span id="occasion-heading">Find the Saree for the Moment</span>}
        subtitle="Start with the occasion and we will show you the drapes that suit it."
      />

      <m.ul
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        className={`grid grid-cols-2 gap-3 sm:gap-6 ${tiles.length >= 4 ? "lg:grid-cols-4" : tiles.length === 3 ? "lg:grid-cols-3" : ""}`}
      >
        {tiles.map((tile) => (
          <m.li key={tile.option} variants={rise}>
            <Link
              href={`/shop?occasion=${encodeURIComponent(tile.option)}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-brand-ivory shadow-card hover:shadow-luxury transition-shadow duration-500"
            >
              <Image
                src={tile.image!}
                alt={tile.alt}
                fill
                sizes="(min-width: 1024px) 25vw, 50vw"
                className="object-cover object-top transition-transform duration-[1200ms] ease-out group-hover:scale-110 motion-reduce:transition-none"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent transition-opacity duration-500 group-hover:from-black/90" />
              {/* Gold frame that draws in on hover */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-3 rounded-xl border border-brand-gold/0 group-hover:border-brand-gold/80 scale-95 group-hover:scale-100 transition-all duration-500" />

              <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 text-white">
                <span className="inline-block mb-2 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] font-poppins">
                  {tile.count} {tile.count === 1 ? "saree" : "sarees"}
                </span>
                <h3 className="font-serif text-lg sm:text-2xl leading-snug">{tile.title}</h3>
                <p className="mt-1 hidden sm:block text-xs font-light text-neutral-200 leading-relaxed">{tile.blurb}</p>
                <span className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200 font-poppins">
                  Explore <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1.5 transition-transform" />
                </span>
              </div>
            </Link>
          </m.li>
        ))}
      </m.ul>
    </section>
  );
}
