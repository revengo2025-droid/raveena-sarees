"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Award,
  ShieldCheck,
  Truck,
  Star,
  Instagram,
  CheckCircle2,
  Compass,
  Layers,
  Clock,
  Video,
  Gift,
  Scissors,
  BookmarkCheck,
  Copy,
  Check,
  Heart,
  ShoppingBag,
  Flame,
  Percent,
  Eye,
  MessageCircle,
  Tag,
  CheckCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import type { HeroBanner } from "@/lib/hero/types";
import { SITE } from "@/lib/site";
import { ShieldCheck as TrustShield, Truck as TrustTruck, RotateCcw as TrustReturn, PackageSearch as TrustTrack } from "lucide-react";
import { WhatsAppIcon as TrustWhatsApp } from "@/components/WhatsAppButton";
import { ProductCard } from "@/components/ProductCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { FeaturedFestiveDrops } from "@/components/FeaturedFestiveDrops";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { Reveal } from "@/components/motion/Reveal";
import { WeaveMarquee } from "@/components/home/WeaveMarquee";
import { TrendingNow } from "@/components/home/TrendingNow";
import { ShopByOccasion } from "@/components/home/ShopByOccasion";
import { FutureDrops } from "@/components/home/FutureDrops";
import { ShopByBudget } from "@/components/home/ShopByBudget";
import { RecentlyViewedStrip } from "@/components/home/RecentlyViewedStrip";
import { m } from "framer-motion";
import { calculateDiscountPercentage } from "@/lib/utils";

export default function HomeClient({ heroBanners }: { heroBanners: HeroBanner[] }) {
  const { products, categories, showToast, addToCart, setQuickViewProduct, isInWishlist, toggleWishlist } = useApp();

  const [collectionTab, setCollectionTab] = useState<"trending" | "handloom" | "party" | "bestseller">("trending");

  // Filtered products for active curator tab
  const filteredTabProducts = products.filter((p) => {
    if (collectionTab === "trending") return p.isNewArrival || p.isFeatured;
    if (collectionTab === "handloom") return p.categoryId === "cat-4" || p.categoryId === "cat-7";
    if (collectionTab === "party") return p.categoryId === "cat-5" || p.categoryId === "cat-7";
    if (collectionTab === "bestseller") return p.isBestseller;
    return true;
  });


  // Weave Comparator Data (4 Weaves)

  return (
    <MotionProvider>
    <div className="flex flex-col min-h-screen bg-brand-white text-brand-text font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HERO CAROUSEL (banners are managed from Admin → Hero Banners)
      ────────────────────────────────────────────────────────────── */}
      <HeroCarousel banners={heroBanners} />

      {/* ─────────────────────────────────────────────────────────────
          2. FAST DISCOVERY & OCCASION QUICK-BAR
      ────────────────────────────────────────────────────────────── */}
      <section className="relative z-20 -mt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white rounded-2xl border border-brand-border shadow-luxury p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 overflow-x-auto no-scrollbar py-1">
            <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-brand-gold whitespace-nowrap hidden md:inline font-poppins">
              Quick Discovery:
            </span>
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <Link
                href="/shop?price=2000"
                className="px-4 py-2 rounded-full bg-brand-maroon/10 hover:bg-brand-maroon hover:text-white text-brand-maroon text-xs font-semibold tracking-wide border border-brand-maroon/30 transition-all whitespace-nowrap flex items-center gap-1.5 font-poppins"
              >
                <Flame className="w-3.5 h-3.5 text-brand-maroon" /> Sarees Under ₹1,999
              </Link>
              <Link
                href="/category/wedding-sarees"
                className="px-4 py-2 rounded-full bg-brand-ivory hover:bg-brand-gold hover:text-white text-brand-text text-xs font-medium tracking-wide border border-brand-border transition-all whitespace-nowrap flex items-center gap-1.5 font-poppins"
              >
                👑 Wedding & Bridal
              </Link>
              <Link
                href="/category/party-wear-sarees"
                className="px-4 py-2 rounded-full bg-brand-ivory hover:bg-brand-gold hover:text-white text-brand-text text-xs font-medium tracking-wide border border-brand-border transition-all whitespace-nowrap flex items-center gap-1.5 font-poppins"
              >
                ✨ Shimmer Tissue
              </Link>
              <Link
                href="/category/silk-sarees"
                className="px-4 py-2 rounded-full bg-brand-ivory hover:bg-brand-gold hover:text-white text-brand-text text-xs font-medium tracking-wide border border-brand-border transition-all whitespace-nowrap flex items-center gap-1.5 font-poppins"
              >
                🌸 Soft Jacquard Silks
              </Link>
              <Link
                href="/category/designer-sarees"
                className="px-4 py-2 rounded-full bg-brand-ivory hover:bg-brand-gold hover:text-white text-brand-text text-xs font-medium tracking-wide border border-brand-border transition-all whitespace-nowrap flex items-center gap-1.5 font-poppins"
              >
                ✨ Designer Sarees
              </Link>
            </div>
            <Link
              href="/shop"
              className="text-xs text-brand-gold hover:text-brand-maroon font-semibold uppercase tracking-wider whitespace-nowrap flex items-center gap-1 ml-auto font-poppins"
            >
              All Sarees <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURED FESTIVE DROPS (admin-managed, database-driven) */}
      <FeaturedFestiveDrops />

      {/* ─────────────────────────────────────────────────────────────
          4. ROYAL WEAVES BENTO GALLERY (Shop by Category)
      ────────────────────────────────────────────────────────────── */}
      <section id="curated-collections" className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal direction="up" delay={80}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-brand-border pb-6">
            <div>
              <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] block mb-2 font-poppins">
                The Royal Archive
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-brand-text font-normal tracking-tight">
                Curated Saree Collections
              </h2>
            </div>
            <Link
              href="/shop"
              className="mt-4 md:mt-0 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold hover:text-brand-maroon flex items-center gap-2 transition-colors font-poppins group"
            >
              Explore Complete Archive ({categories.length}){" "}
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        {/* Dynamic Asymmetric Bento Grid - 5 Curated Categories */}
        <ScrollReveal direction="up" delay={150}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(() => {
            const curatedSlugs = [
              "party-wear-sarees",
              "silk-sarees",
              "wedding-sarees",
              "banarasi-sarees",
              "handloom-sarees",
            ];
            const curatedList = curatedSlugs
              .map((slug) => categories.find((c) => c.slug === slug))
              .filter((c): c is (typeof categories)[0] => Boolean(c));
            const displayCategories = curatedList.length === 5 ? curatedList : categories.slice(0, 5);

            return displayCategories.map((category, idx) => {
              const isTall = idx === 1;
              const isWide = idx === 0;
              const isFull = idx === 4;

              const objectPositionClass =
                idx === 1
                  ? "object-top"
                  : idx === 2
                  ? "object-[35%_25%]"
                  : idx === 3
                  ? "object-[40%_25%]"
                  : idx === 0
                  ? "object-[center_18%]"
                  : "object-center";

              return (
                <div
                  key={category.id}
                  className={`group rounded-2xl overflow-hidden shadow-card border border-brand-border/60 hover:shadow-luxury transition-all duration-500 bg-brand-ivory relative ${
                    isFull ? "md:col-span-3" : isWide ? "md:col-span-2" : "md:col-span-1"
                  } ${isTall ? "md:row-span-2" : ""}`}
                >
                  <Link
                    href={`/category/${category.slug}`}
                    className={`relative block overflow-hidden w-full ${
                      isTall
                        ? "h-full min-h-[380px] md:min-h-[580px]"
                        : isFull
                        ? "h-[280px] sm:h-[340px]"
                        : isWide
                        ? "h-[280px] sm:h-[340px]"
                        : "h-[280px]"
                    }`}
                  >
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      loading="lazy"
                      decoding="async"
                      className={`absolute inset-0 w-full h-full object-cover ${objectPositionClass} group-hover:scale-105 transition-transform duration-700 ease-out`}
                    />
                    {/* Luxury Multi-layer Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity group-hover:from-black/95" />

                    {/* Text Overlay */}
                    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex flex-col justify-end text-white z-10">
                      <span className="text-[10px] text-amber-200 uppercase tracking-[0.25em] font-semibold mb-1.5 flex items-center gap-1.5 font-poppins">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse" />
                        {products.filter((p) => p.categoryId === category.id).length || category.itemCount || 1} Curated Drape{products.filter((p) => p.categoryId === category.id).length === 1 ? "" : "s"}
                      </span>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-serif text-white font-normal group-hover:text-amber-200 transition-colors leading-snug">
                        {category.name}
                      </h3>
                      <p className="text-xs text-neutral-200 mt-2 line-clamp-2 max-w-xl opacity-90 group-hover:opacity-100 transition-opacity font-light leading-relaxed">
                        {category.description}
                      </p>
                      <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-[0.2em] text-brand-gold font-semibold group-hover:text-white flex items-center gap-1.5 font-poppins">
                          Discover Collection <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            });
          })()}
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. THE CURATOR&apos;S EDIT (Tabbed Catalog Showcase)
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 bg-brand-ivory border-y border-brand-border">
        <ScrollReveal direction="up" delay={80}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center mb-14">
            <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] mb-2.5 font-poppins">
              The Atelier Showcase
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-brand-text font-normal mb-8 tracking-tight">
              Handpicked Sarees of Distinction
            </h2>

            {/* Tab Switcher */}
            <div className="inline-flex p-1.5 bg-white border border-brand-border rounded-full shadow-card flex-wrap justify-center gap-1">
              <button
                onClick={() => setCollectionTab("trending")}
                className={`px-5 sm:px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 font-poppins ${
                  collectionTab === "trending"
                    ? "bg-brand-gold text-white shadow-sm font-bold"
                    : "text-neutral-500 hover:text-brand-text"
                }`}
              >
                🌟 New & Featured
              </button>
              <button
                onClick={() => setCollectionTab("handloom")}
                className={`px-5 sm:px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 font-poppins ${
                  collectionTab === "handloom"
                    ? "bg-brand-gold text-white shadow-sm font-bold"
                    : "text-neutral-500 hover:text-brand-text"
                }`}
              >
                🏛️ Royal Handlooms
              </button>
              <button
                onClick={() => setCollectionTab("party")}
                className={`px-5 sm:px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 font-poppins ${
                  collectionTab === "party"
                    ? "bg-brand-gold text-white shadow-sm font-bold"
                    : "text-neutral-500 hover:text-brand-text"
                }`}
              >
                ✨ Shimmer & Party
              </button>
              <button
                onClick={() => setCollectionTab("bestseller")}
                className={`px-5 sm:px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-[0.16em] transition-all duration-300 font-poppins ${
                  collectionTab === "bestseller"
                    ? "bg-brand-gold text-white shadow-sm font-bold"
                    : "text-neutral-500 hover:text-brand-text"
                }`}
              >
                👑 Bestsellers
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <m.div
            key={collectionTab}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6"
          >
            {filteredTabProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </m.div>

          {/* View Catalog CTA */}
          <div className="text-center mt-14">
            <Link
              href="/shop"
              className="btn-primary inline-flex items-center gap-3 px-9 py-4 rounded-full text-xs font-bold uppercase tracking-[0.22em] font-poppins shadow-md hover:scale-105"
            >
              Explore Full Collection ({products.length} Sarees)
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. NEW SECTIONS: marquee, Trending Now, Shop by Occasion, Future Drops, Shop by Budget, Recently viewed
      ────────────────────────────────────────────────────────────── */}
      <WeaveMarquee />
      <TrendingNow />
      <ShopByOccasion />
      <FutureDrops />
      <ShopByBudget />
      <RecentlyViewedStrip />

      {/* HELP */}
      <section aria-labelledby="help-heading" className="py-14 md:py-20 px-4 sm:px-6 lg:px-8 bg-brand-ivory border-y border-brand-border">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 id="help-heading" className="text-2xl sm:text-4xl font-serif font-normal text-brand-text">Need help choosing a saree?</h2>
          <p className="text-sm sm:text-base text-neutral-600 font-light">
            Tell us the occasion and your budget, and we will reply with suggestions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <a
              href={`https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent("Namaste Raveena Sarees, I would like help choosing a saree.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto min-h-[48px] px-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] hover:bg-[#1EBE5A] text-white text-sm font-semibold font-poppins shadow-md transition-colors"
            >
              <TrustWhatsApp className="w-4 h-4" /> Chat on WhatsApp
            </a>
            <Link
              href="/contact"
              className="w-full sm:w-auto min-h-[48px] px-7 inline-flex items-center justify-center rounded-full border border-brand-gold text-brand-maroon text-sm font-semibold font-poppins hover:bg-white transition-colors"
            >
              Send a message
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST BAR: only things the store actually does */}
      <section aria-label="Shopping with Raveena Sarees" className="py-10 md:py-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            { icon: TrustShield, title: "Secure payments", text: "Online payments are processed by Razorpay.", href: "/faq#payments" },
            { icon: TrustTruck, title: "Free delivery", text: "On every order, with no minimum.", href: "/shipping-policy" },
            { icon: TrustReturn, title: `${SITE.returnWindowDays}-day returns`, text: "Request a return within 7 days of delivery.", href: "/return-policy" },
            { icon: TrustTrack, title: "Order tracking", text: "Follow your order from your account.", href: "/account/orders" },
          ].map(({ icon: Icon, title, text, href }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} y={20}>
              <Link href={href} className="group h-full flex flex-col items-center text-center gap-2 p-4 sm:p-5 rounded-2xl border border-brand-border bg-white hover:border-brand-gold/60 hover:-translate-y-1 hover:shadow-card transition-all duration-300 motion-reduce:hover:translate-y-0">
                <Icon className="w-6 h-6 text-brand-gold group-hover:scale-110 transition-transform duration-300" aria-hidden="true" />
                <span className="text-xs uppercase tracking-[0.14em] font-bold text-brand-text font-poppins">{title}</span>
                <span className="text-xs text-neutral-500 font-light leading-relaxed">{text}</span>
              </Link>
            </Reveal>
          ))}
        </ul>
      </section>
    </div>
    </MotionProvider>
  );
}
