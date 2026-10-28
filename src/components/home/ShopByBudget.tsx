"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { m } from "framer-motion";
import { useApp } from "@/lib/store";
import { budgetTiers } from "@/lib/trending";
import { formatINR } from "@/lib/utils";
import { rise, SectionHeading, stagger } from "./motion";

/**
 * Shop by Budget. The price steps are chosen from the real catalogue (see budgetTiers), so a store whose sarees all
 * cost under ₹2,000 gets useful steps such as "Under ₹750" instead of empty "Under ₹5,000" cards.
 */
export function ShopByBudget() {
  const { products } = useApp();
  const tiers = useMemo(() => budgetTiers(products), [products]);

  if (tiers.length < 2) return null;

  return (
    <section aria-labelledby="budget-heading" className="py-14 sm:py-20 bg-brand-ivory border-y border-brand-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Shop by Budget" title={<span id="budget-heading">Beautiful at Every Price</span>} subtitle="Pick a budget and browse sarees that fit it." />

        <m.ul
          variants={stagger(0.09)}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
          className={`grid grid-cols-2 gap-3 sm:gap-6 ${tiers.length >= 4 ? "lg:grid-cols-4" : tiers.length === 3 ? "lg:grid-cols-3" : ""}`}
        >
          {tiers.map((t) => (
            <m.li key={t.limit} variants={rise} className="h-full">
              <Link
                href={`/shop?price=${t.limit}`}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-brand-border bg-white p-5 sm:p-7 transition-all duration-500 hover:-translate-y-1.5 hover:border-brand-gold/70 hover:shadow-luxury motion-reduce:hover:translate-y-0"
              >
                {/* Gold wash that rises on hover */}
                <span aria-hidden="true" className="absolute inset-0 translate-y-full bg-gradient-to-t from-brand-goldPale to-transparent transition-transform duration-500 group-hover:translate-y-0" />
                <span className="relative text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-gold font-poppins">Under</span>
                <span className="relative mt-2 font-serif text-3xl sm:text-4xl text-brand-text">{formatINR(t.limit)}</span>
                <span className="relative mt-5 flex items-center justify-between text-xs text-neutral-500 font-poppins">
                  {t.count} {t.count === 1 ? "saree" : "sarees"}
                  <ArrowUpRight className="w-5 h-5 text-brand-gold transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </Link>
            </m.li>
          ))}
        </m.ul>
      </div>
    </section>
  );
}
