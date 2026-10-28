"use client";

import React from "react";
import { m } from "framer-motion";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { rise, SectionHeading, stagger } from "./motion";

/**
 * "Pick up where you left off". Shown only to visitors who have already viewed sarees in this browser (the list
 * is read from their own device), so first-time visitors never see an empty or made-up section.
 */
export function RecentlyViewedStrip() {
  const { recentlyViewed } = useApp();
  const items = recentlyViewed.slice(0, 4);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="recent-heading" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      <SectionHeading eyebrow="Welcome Back" title={<span id="recent-heading">Pick Up Where You Left Off</span>} subtitle="Sarees you looked at recently." />
      <m.ul variants={stagger(0.09)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {items.map((product) => (
          <m.li key={product.id} variants={rise} className="h-full">
            <ProductCard product={product} />
          </m.li>
        ))}
      </m.ul>
    </section>
  );
}
