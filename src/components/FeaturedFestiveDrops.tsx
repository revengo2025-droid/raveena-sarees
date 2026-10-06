"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Eye, ShoppingBag, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { calculateDiscountPercentage, formatINR } from "@/lib/utils";
import type { SareeProduct } from "@/lib/types";

function DropCard({ product }: { product: SareeProduct }) {
  const { addToCart } = useApp();
  const discount = calculateDiscountPercentage(product.price, product.discountPrice);
  const inStock = product.stock > 0;
  const savings = product.discountPrice ? product.price - product.discountPrice : 0;

  return (
    <article className="group relative rounded-2xl bg-white/5 border border-white/15 hover:border-brand-gold/60 p-4 sm:p-6 transition-colors duration-500 flex flex-row sm:flex-row gap-4 sm:gap-6 items-center backdrop-blur-sm">
      <div className="relative w-28 sm:w-48 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(min-width: 640px) 192px, 112px"
            className="object-cover group-hover:scale-105 transition-transform duration-700 motion-reduce:transition-none"
          />
        )}
        {discount > 0 && (
          <span className="absolute top-2 left-2 bg-brand-maroon text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full shadow">
            {discount}% OFF
          </span>
        )}
      </div>

      <div className="flex flex-col justify-between w-full min-w-0 space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest font-semibold font-poppins">
            <span className="text-amber-300 truncate">{product.categoryName}</span>
            <span className={inStock ? "text-emerald-400" : "text-red-300"}>{inStock ? "● In Stock" : "● Sold Out"}</span>
          </div>

          <h3 className="font-serif text-base sm:text-xl text-white group-hover:text-amber-200 transition-colors font-medium line-clamp-2 mt-1">
            {/* Stretched link: the whole card opens the product without nesting links in buttons */}
            <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 after:z-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-gold after:rounded-2xl">
              {product.name}
            </Link>
          </h3>

          <p className="text-xs text-neutral-300 mt-1.5 line-clamp-2 font-light hidden sm:block">
            {[product.fabric, product.zariType].filter(Boolean).join(" · ")}
            {product.blouseIncluded ? ". Blouse piece included." : ""}
          </p>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="text-xl sm:text-2xl font-serif font-bold text-amber-200">
              {formatINR(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-neutral-400 line-through">{formatINR(product.price)}</span>
            )}
            {savings > 0 && (
              <span className="text-xs text-emerald-400 font-semibold font-poppins">Save {formatINR(savings)}</span>
            )}
          </div>

          <div className="relative z-10 flex items-center gap-2 mt-3 sm:mt-4">
            <button
              type="button"
              onClick={() => addToCart(product)}
              disabled={!inStock}
              className="flex-1 py-2.5 sm:py-3 bg-brand-gold hover:bg-brand-goldHover disabled:bg-neutral-600 disabled:cursor-not-allowed text-white text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition-colors shadow-md font-poppins"
            >
              <ShoppingBag className="w-4 h-4" /> {inStock ? "Add to Bag" : "Sold Out"}
            </button>
            <Link
              href={`/product/${product.slug}`}
              className="p-2.5 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
              aria-label={`View ${product.name}`}
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

function EmptySlot() {
  return (
    <div className="rounded-2xl border border-dashed border-white/25 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[220px]">
      <Sparkles className="w-6 h-6 text-amber-300/80" />
      <p className="font-serif text-lg text-white">Our next festive drop is on its way</p>
      <p className="text-xs text-neutral-300 font-light max-w-xs">
        Meanwhile, explore the complete collection of handpicked sarees.
      </p>
      <Link href="/shop" className="text-xs font-semibold uppercase tracking-wider text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 font-poppins">
        Browse all sarees <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/** Homepage section. Shows exactly the two products an admin selected under Featured Festive Drops. */
export function FeaturedFestiveDrops() {
  const { featuredDrops } = useApp();
  const slots: (SareeProduct | null)[] = [featuredDrops[0] ?? null, featuredDrops[1] ?? null];

  return (
    <section
      aria-labelledby="festive-drops-heading"
      className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full"
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1F1610] via-[#2A1E17] to-[#17100B] border border-brand-gold/40 shadow-2xl p-5 sm:p-10 lg:p-12 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 pb-6 sm:pb-8 border-b border-white/15">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold tracking-widest uppercase mb-3 border border-amber-400/30 font-poppins">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Handpicked for the festive season
          </div>
          <h2 id="festive-drops-heading" className="text-2xl sm:text-4xl font-serif font-normal text-white tracking-tight">
            Featured Festive Drops
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 mt-1 font-light">
            Two sarees our team is celebrating right now.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 pt-6 sm:pt-8">
          {slots.map((product, i) => (product ? <DropCard key={product.id} product={product} /> : <EmptySlot key={`empty-${i}`} />))}
        </div>
      </div>
    </section>
  );
}
