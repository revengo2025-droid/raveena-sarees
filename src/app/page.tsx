"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
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
  Timer,
  Eye,
  MessageCircle,
  Tag,
  CheckCircle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { HERO_SLIDES, TESTIMONIALS } from "@/lib/mockData";
import { ProductCard } from "@/components/ProductCard";
import { ScrollReveal } from "@/components/ScrollReveal";
import { formatINR, calculateDiscountPercentage } from "@/lib/utils";

export default function HomePage() {
  const { products, categories, showToast, addToCart, setQuickViewProduct, isInWishlist, toggleWishlist } = useApp();

  // Hero Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [collectionTab, setCollectionTab] = useState<"trending" | "handloom" | "party" | "bestseller">("trending");

  // Silk Comparator state
  const [selectedWeave, setSelectedWeave] = useState<"kanjivaram" | "banarasi" | "tissue" | "softsilk">("tissue");

  // Coupon copy state
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  // Live Flash Deal Countdown Timer (Hours, Minutes, Seconds)
  const [timeLeft, setTimeLeft] = useState({ hours: 9, minutes: 42, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 23, minutes: 59, seconds: 59 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto advance hero slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);

  // Copy coupon handler
  const copyCouponCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    showToast(`Privilege Code "${code}" copied to clipboard!`, "success");
    setTimeout(() => setCopiedCoupon(null), 3500);
  };

  // Filtered products for active curator tab
  const filteredTabProducts = products.filter((p) => {
    if (collectionTab === "trending") return p.isNewArrival || p.isFeatured;
    if (collectionTab === "handloom") return p.categoryId === "cat-4" || p.categoryId === "cat-7";
    if (collectionTab === "party") return p.categoryId === "cat-5" || p.categoryId === "cat-7";
    if (collectionTab === "bestseller") return p.isBestseller;
    return true;
  });

  // Highlighted Flash Deal Sarees (Turquoise Tissue & Rani Pink)
  const flashDealProducts = products.filter(
    (p) => p.sku === "RAV-TIS-009" || p.sku === "RAV-SLK-010"
  );

  // Weave Comparator Data (4 Weaves)
  const WEAVE_DATA = {
    tissue: {
      name: "Royal Shimmer Tissue & Silver Zari",
      origin: "Varanasi & Chanderi Looms",
      tagline: "Ethereal Luminescence & Modern Royalty",
      weight: "450g – 550g (Featherlight Radiance)",
      zari: "Exquisite Silver Zari & Scalloped Embroidered Border",
      daysToWeave: "14 to 21 Days per Drape",
      technique: "High-twist Metallic Tissue Weave with Silver Zari Floral Bootis",
      drapeProfile: "Airy, gossamer elegance that shimmers with multi-dimensional radiance under festive evening chandeliers.",
      image: "/images/products/turquoise-tissue-1.jpg",
      link: "/product/turquoise-blue-tissue-silver-zariwork-saree-with-matching-blouse-piece",
      specPoints: [
        "Lightweight Metallic Sheer Tissue Blend",
        "Luminescent Multi-Reflective Silver Sheen",
        "Intricate Silver Zari Floral Bootis",
        "Hand-scalloped Embroidered Zari Borders",
      ],
    },
    softsilk: {
      name: "Rani Pink Jacquard Soft Silk",
      origin: "Kanchipuram & Surat Looms",
      tagline: "Liquid Lustre & Effortless Festive Grace",
      weight: "520g – 620g (Silky Fluid Fall)",
      zari: "Intricate Silver & Light Gold Dual Metallic Core",
      daysToWeave: "18 to 25 Days per Drape",
      technique: "Jacquard Floral Jaal with Handcrafted Tassel Pallu",
      drapeProfile: "Buttery-soft drape that pleats effortlessly, creating a regal silhouette with a rich pallu statement.",
      image: "/images/products/rani-pink-silk-1.jpg",
      link: "/product/rani-pink-soft-silk-saree-rich-silver-zari-pallu-floral-jaal",
      specPoints: [
        "Pure Litchi Soft Silk with High Tensile Weft",
        "All-over Intricate Silver Floral Jaal",
        "Opulent Statement Pallu with Artisanal Tassels",
        "Includes Matching Brocade Blouse Piece",
      ],
    },
    kanjivaram: {
      name: "Kanjivaram Korvai Pure Silk",
      origin: "Kanchipuram, Tamil Nadu",
      tagline: "The Queen of Silks · Generational Heirloom",
      weight: "780g – 950g (Substantial & Sculptural)",
      zari: "Pure Silver Core dipped in 24K Gold (Tested)",
      daysToWeave: "30 to 45 Days per Drape",
      technique: "Korvai Interlocking Pit Loom Technique",
      drapeProfile: "Architectural, stately drape that forms crisp, majestic pleats for wedding muhurthams.",
      image: "/images/products/rani-pink-silk-3.jpg",
      link: "/category/silk-sarees",
      specPoints: [
        "3-Ply Twisted Mulberry Silk Filament",
        "Contrast Korvai Solid Pallu Joint",
        "Temple & Annapakshi Mythological Borders",
        "Silk Mark India Certified Authenticity",
      ],
    },
    banarasi: {
      name: "Kadwa Banarasi Zari Silk",
      origin: "Varanasi, Uttar Pradesh",
      tagline: "Sacred Mughal Court Splendour",
      weight: "620g – 750g (Silky Fluid Grace)",
      zari: "Antique Matte Gold & Silver Dual Resham Zari",
      daysToWeave: "25 to 35 Days per Drape",
      technique: "Kadwa Embossed Hand-Weave (Zero Floats)",
      drapeProfile: "Soft, flowing, and sensuous with raised metallic motifs that glow under ambient royal chandeliers.",
      image: "/images/products/rani-pink-silk-2.jpg",
      link: "/category/designer-sarees",
      specPoints: [
        "Pure Mulberry Warp with Metallic Weft",
        "Hand-engraved Kadwa Motifs (No Cutting)",
        "Shikargah & Floral Jaal Traditional Patterns",
        "Tested Pure Silver Zari Certified",
      ],
    },
  };

  const currentWeaveInfo = WEAVE_DATA[selectedWeave];
  const heroSpotlightSaree = products.find((p) => p.sku === "RAV-SLK-010") || products[0];

  return (
    <div className="flex flex-col min-h-screen bg-brand-white text-brand-text font-sans">
      
      {/* ─────────────────────────────────────────────────────────────
          1. BESPOKE WIDESCREEN HAUTE HERO CAROUSEL
      ────────────────────────────────────────────────────────────── */}
      <section className="relative w-full aspect-[21/9] min-h-[340px] sm:min-h-[440px] md:min-h-[520px] lg:min-h-[580px] xl:min-h-[640px] overflow-hidden bg-brand-ivory group">
        {HERO_SLIDES.map((slide, idx) => (
          <Link
            key={slide.id}
            href={slide.linkUrl}
            className={`absolute inset-0 block transition-opacity duration-1000 ease-in-out ${
              currentSlide === idx ? "opacity-100 z-10 pointer-events-auto" : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            {/* Widescreen Banner Image */}
            <img
              src={slide.imageUrl}
              alt={slide.title}
              loading={idx === 0 ? "eager" : "lazy"}
              fetchPriority={idx === 0 ? "high" : "auto"}
              decoding="async"
              className="w-full h-full object-cover object-center scale-100 hover:scale-[1.02] transition-transform duration-1000 ease-out"
            />

            {/* Subtle Gradient Shadow along bottom for navigation readability */}
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 via-black/10 to-transparent pointer-events-none" />

            {/* Floating Action Pill */}
            <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-12 z-20 hidden sm:flex items-center gap-2">
              <span className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-brand-maroon/90 hover:bg-brand-maroon text-white text-xs font-bold uppercase tracking-[0.18em] shadow-luxury backdrop-blur-sm border border-brand-gold/40 hover:scale-105 transition-all font-poppins">
                {slide.buttonText} <ArrowRight className="w-3.5 h-3.5 text-amber-200" />
              </span>
            </div>
          </Link>
        ))}

        {/* Carousel Prev & Next Controls */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prevSlide();
          }}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-white/80 hover:bg-brand-gold text-brand-text hover:text-white border border-brand-gold/40 backdrop-blur-md transition-all shadow-luxury opacity-85 hover:opacity-100 hover:scale-110"
          aria-label="Previous Banner"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            nextSlide();
          }}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 p-3 sm:p-3.5 rounded-full bg-white/80 hover:bg-brand-gold text-brand-text hover:text-white border border-brand-gold/40 backdrop-blur-md transition-all shadow-luxury opacity-85 hover:opacity-100 hover:scale-110"
          aria-label="Next Banner"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel Slide Indicators */}
        <div className="absolute bottom-5 sm:bottom-7 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
          {HERO_SLIDES.map((slide, idx) => (
            <button
              key={slide.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCurrentSlide(idx);
              }}
              className={`h-2 rounded-full transition-all duration-500 ${
                currentSlide === idx
                  ? "w-8 bg-brand-gold shadow-gold"
                  : "w-2 bg-white/60 hover:bg-white"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </section>

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

      {/* ─────────────────────────────────────────────────────────────
          3. FLASH LOOM SPOTLIGHT DEAL OF THE DAY (Countdown Feature)
      ────────────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1F1610] via-[#2A1E17] to-[#17100B] border border-brand-gold/40 shadow-2xl p-6 sm:p-10 lg:p-12 text-white">
          
          {/* Subtle Ambient Golden Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-gold/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/15">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold tracking-widest uppercase mb-3 border border-amber-400/30 font-poppins">
                <Flame className="w-3.5 h-3.5 text-amber-400" /> Today&apos;s Loom Spotlight · 40% to 44% OFF
              </div>
              <h2 className="text-2xl sm:text-4xl font-serif font-normal text-white tracking-tight">
                Featured Festive Drops
              </h2>
              <p className="text-xs sm:text-sm text-neutral-300 mt-1 font-light">
                Direct weaver introductions at exclusive introductory rates. Limited loom stock.
              </p>
            </div>

            {/* Live Countdown Timer */}
            <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-2xl border border-brand-gold/40">
              <Timer className="w-5 h-5 text-amber-300 shrink-0" />
              <div className="flex items-center gap-2 font-mono text-center">
                <div className="countdown-box px-2.5 py-1.5 rounded-lg min-w-[42px]">
                  <span className="text-base sm:text-lg font-bold text-amber-200">
                    {String(timeLeft.hours).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider block text-neutral-400 font-sans">Hrs</span>
                </div>
                <span className="text-amber-300 font-bold">:</span>
                <div className="countdown-box px-2.5 py-1.5 rounded-lg min-w-[42px]">
                  <span className="text-base sm:text-lg font-bold text-amber-200">
                    {String(timeLeft.minutes).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider block text-neutral-400 font-sans">Min</span>
                </div>
                <span className="text-amber-300 font-bold">:</span>
                <div className="countdown-box px-2.5 py-1.5 rounded-lg min-w-[42px]">
                  <span className="text-base sm:text-lg font-bold text-amber-200">
                    {String(timeLeft.seconds).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider block text-neutral-400 font-sans">Sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flash Spotlight 2-Column Product Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
            {flashDealProducts.map((deal) => {
              const discountPercent = calculateDiscountPercentage(deal.price, deal.discountPrice);
              return (
                <div
                  key={deal.id}
                  className="group relative rounded-2xl bg-white/5 border border-white/15 hover:border-brand-gold/60 p-5 sm:p-6 transition-all duration-500 flex flex-col sm:flex-row gap-6 items-center backdrop-blur-sm"
                >
                  {/* Saree Dual Hover Image */}
                  <div className="relative w-full sm:w-48 aspect-[3/4] rounded-xl overflow-hidden shrink-0 bg-black/40">
                    <img
                      src={deal.images[0]}
                      alt={deal.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    {deal.images[1] && (
                      <img
                        src={deal.images[1]}
                        alt={`${deal.name} view 2`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      />
                    )}
                    <span className="absolute top-2 left-2 bg-brand-maroon text-white font-bold text-[9px] uppercase px-2 py-0.5 rounded-full shadow">
                      {discountPercent}% OFF
                    </span>
                  </div>

                  {/* Deal Details */}
                  <div className="flex flex-col justify-between w-full h-full space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-amber-300 uppercase tracking-widest font-semibold font-poppins">
                        <span>{deal.categoryName}</span>
                        <span className="text-emerald-400 font-bold">● In Stock</span>
                      </div>

                      <Link href={`/product/${deal.slug}`} className="block mt-1">
                        <h3 className="font-serif text-lg sm:text-xl text-white group-hover:text-amber-200 transition-colors font-medium line-clamp-2">
                          {deal.name}
                        </h3>
                      </Link>

                      <p className="text-xs text-neutral-300 mt-1.5 line-clamp-2 font-light">
                        {deal.fabric} with {deal.zariType}. Matching blouse piece included.
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl font-serif font-bold text-amber-200">
                          {formatINR(deal.discountPrice || deal.price)}
                        </span>
                        {deal.discountPrice && (
                          <span className="text-xs text-neutral-400 line-through">
                            {formatINR(deal.price)}
                          </span>
                        )}
                        <span className="text-xs text-emerald-400 font-semibold font-poppins">
                          Save {formatINR(deal.price - (deal.discountPrice || deal.price))}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => addToCart(deal)}
                          className="flex-1 py-3 bg-brand-gold hover:bg-brand-goldHover text-white text-xs font-bold uppercase tracking-wider rounded-full flex items-center justify-center gap-2 transition-all shadow-md font-poppins hover:scale-[1.02]"
                        >
                          <ShoppingBag className="w-4 h-4" /> Add to Bag
                        </button>
                        <Link
                          href={`/product/${deal.slug}`}
                          className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-colors"
                          title="View Saree"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. ROYAL WEAVES BENTO GALLERY (Shop by Category)
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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

        {/* Dynamic Asymmetric Bento Grid - 6 Curated Categories */}
        <ScrollReveal direction="up" delay={150}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categories.slice(0, 6).map((category, idx) => {
            const isTall = idx === 1;
            const isWide = idx === 0 || idx === 4;

            return (
              <div
                key={category.id}
                className={`group rounded-2xl overflow-hidden shadow-card border border-brand-border/60 hover:shadow-luxury transition-all duration-500 bg-brand-ivory relative ${
                  isWide ? "md:col-span-2" : "md:col-span-1"
                } ${isTall ? "md:row-span-2" : ""}`}
              >
                <Link
                  href={`/category/${category.slug}`}
                  className={`relative block overflow-hidden w-full ${
                    isTall
                      ? "h-full min-h-[380px] md:min-h-[580px]"
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
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
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
                    <p className="text-xs text-neutral-200 mt-2 line-clamp-2 max-w-lg opacity-90 group-hover:opacity-100 transition-opacity font-light leading-relaxed">
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
          })}
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
                🔥 Trending (Under ₹2k)
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredTabProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

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
          6. INTERACTIVE 360° SILK & WEAVE COMPARATOR MASTERCLASS
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal direction="up" delay={80}>
        <div className="rounded-3xl bg-white border border-brand-border p-6 sm:p-10 lg:p-14 shadow-luxury">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] block mb-2 font-poppins">
              Saree Connoisseur Guide
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-brand-text font-normal tracking-tight">
              Understand Your Sacred Weave
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2.5 font-light">
              Compare silk densities, authentic zari techniques, and fall profiles crafted by master artisans across India.
            </p>
          </div>

          {/* Weave Switcher Tabs (4 Weaves) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
            <button
              onClick={() => setSelectedWeave("tissue")}
              className={`py-3.5 px-4 rounded-2xl text-xs uppercase tracking-[0.16em] transition-all font-poppins ${
                selectedWeave === "tissue"
                  ? "bg-brand-gold text-white font-bold shadow-md"
                  : "bg-brand-ivory text-neutral-600 hover:text-brand-text border border-brand-border"
              }`}
            >
              ✨ Shimmer Tissue
            </button>
            <button
              onClick={() => setSelectedWeave("softsilk")}
              className={`py-3.5 px-4 rounded-2xl text-xs uppercase tracking-[0.16em] transition-all font-poppins ${
                selectedWeave === "softsilk"
                  ? "bg-brand-gold text-white font-bold shadow-md"
                  : "bg-brand-ivory text-neutral-600 hover:text-brand-text border border-brand-border"
              }`}
            >
              🌸 Rani Soft Silk
            </button>
            <button
              onClick={() => setSelectedWeave("kanjivaram")}
              className={`py-3.5 px-4 rounded-2xl text-xs uppercase tracking-[0.16em] transition-all font-poppins ${
                selectedWeave === "kanjivaram"
                  ? "bg-brand-gold text-white font-bold shadow-md"
                  : "bg-brand-ivory text-neutral-600 hover:text-brand-text border border-brand-border"
              }`}
            >
              🏛️ Pure Kanjivaram
            </button>
            <button
              onClick={() => setSelectedWeave("banarasi")}
              className={`py-3.5 px-4 rounded-2xl text-xs uppercase tracking-[0.16em] transition-all font-poppins ${
                selectedWeave === "banarasi"
                  ? "bg-brand-gold text-white font-bold shadow-md"
                  : "bg-brand-ivory text-neutral-600 hover:text-brand-text border border-brand-border"
              }`}
            >
              👑 Kadwa Banarasi
            </button>
          </div>

          {/* Weave Profile Detail Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Image Preview */}
            <div className="lg:col-span-5 relative">
              <div className="aspect-[4/5] rounded-2xl overflow-hidden border border-brand-gold/30 shadow-card relative">
                <img
                  src={currentWeaveInfo.image}
                  alt={currentWeaveInfo.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-white/95 backdrop-blur-md border border-brand-border shadow-sm">
                  <span className="text-[10px] text-brand-gold uppercase tracking-[0.2em] font-semibold block font-poppins">
                    Origin & Loom Lineage
                  </span>
                  <p className="text-xs font-serif text-brand-text font-medium">{currentWeaveInfo.origin}</p>
                </div>
              </div>
            </div>

            {/* Comparative Breakdown */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <span className="text-[11px] uppercase tracking-[0.25em] text-brand-gold font-semibold font-poppins">
                  {currentWeaveInfo.tagline}
                </span>
                <h3 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal mt-1">
                  {currentWeaveInfo.name}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-600 mt-2.5 leading-relaxed font-light">
                  {currentWeaveInfo.drapeProfile}
                </p>
              </div>

              {/* Technical Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-brand-ivory border border-brand-border">
                  <div className="flex items-center gap-2 text-brand-gold mb-1">
                    <Layers className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-500 font-poppins">
                      Zari Details
                    </span>
                  </div>
                  <p className="text-xs text-brand-text font-medium">{currentWeaveInfo.zari}</p>
                </div>

                <div className="p-4 rounded-xl bg-brand-ivory border border-brand-border">
                  <div className="flex items-center gap-2 text-brand-gold mb-1">
                    <Clock className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-500 font-poppins">
                      Loom Duration
                    </span>
                  </div>
                  <p className="text-xs text-brand-text font-medium">{currentWeaveInfo.daysToWeave}</p>
                </div>

                <div className="p-4 rounded-xl bg-brand-ivory border border-brand-border">
                  <div className="flex items-center gap-2 text-brand-gold mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-500 font-poppins">
                      Fabric Weight
                    </span>
                  </div>
                  <p className="text-xs text-brand-text font-medium">{currentWeaveInfo.weight}</p>
                </div>

                <div className="p-4 rounded-xl bg-brand-ivory border border-brand-border">
                  <div className="flex items-center gap-2 text-brand-gold mb-1">
                    <Compass className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-[0.2em] font-semibold text-neutral-500 font-poppins">
                      Weave Technique
                    </span>
                  </div>
                  <p className="text-xs text-brand-text font-medium">{currentWeaveInfo.technique}</p>
                </div>
              </div>

              {/* Authenticity Checklist */}
              <div className="pt-2">
                <p className="text-[10px] uppercase tracking-[0.2em] text-brand-gold font-semibold mb-2.5 font-poppins">
                  Authenticity Quality Standards:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentWeaveInfo.specPoints.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-center gap-2 text-xs text-neutral-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA */}
              <div className="pt-3">
                <Link
                  href={currentWeaveInfo.link}
                  className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-bold text-brand-maroon hover:text-brand-gold transition-colors font-poppins group"
                >
                  Browse Handwoven {currentWeaveInfo.name} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. REAL CUSTOMER & BRIDE STYLING REEL (#RavinaRoyalty)
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-brand-ivory border-t border-brand-border">
        <ScrollReveal direction="up" delay={80}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] block mb-2.5 font-poppins">
              #RavinaRoyalty
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-brand-text font-normal tracking-tight">
              Styled by Connoisseurs
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-2 font-light">
              Real moments from brides, artists, and handloom enthusiasts adorned in Ravina Sarees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((test) => (
              <div
                key={test.id}
                className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-border shadow-card flex flex-col justify-between hover:shadow-luxury transition-all"
              >
                <div>
                  <div className="flex items-center gap-1 text-brand-gold mb-4">
                    {[...Array(test.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-brand-gold text-brand-gold" />
                    ))}
                  </div>
                  <p className="font-serif italic text-sm sm:text-base text-neutral-700 leading-relaxed font-normal">
                    &ldquo;{test.quote}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3.5 pt-6 mt-6 border-t border-brand-border">
                  <img
                    src={test.image}
                    alt={test.name}
                    className="w-12 h-12 rounded-full object-cover border border-brand-gold/40"
                  />
                  <div>
                    <h4 className="font-serif font-bold text-brand-text text-sm">{test.name}</h4>
                    <p className="text-[11px] text-neutral-500 font-light">{test.role} · {test.city}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                      Verified Buyer
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. ARTISANAL HERITAGE & SACRED LOOM STORYTELLING
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal direction="up" delay={80}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Visual Showcase */}
          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-luxury border border-brand-border aspect-[4/5] bg-brand-ivory">
              <img
                src="/images/products/golden-kanchipuram-1.jpg"
                alt="Raveena Sarees Master Handloom Weaving"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Floating Gold Trust Badge */}
            <div className="absolute -bottom-6 -right-6 hidden sm:block p-6 rounded-2xl bg-white/95 border border-brand-gold/40 shadow-luxury max-w-xs backdrop-blur-md">
              <div className="flex items-center gap-3 text-brand-gold mb-2.5">
                <div className="w-9 h-9 rounded-full bg-brand-gold/15 border border-brand-gold/40 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] font-bold text-brand-text block font-poppins">
                    Silk Mark India
                  </span>
                  <span className="text-[10px] text-brand-gold font-medium">Authenticated Purity</span>
                </div>
              </div>
              <p className="text-xs text-neutral-600 font-light leading-relaxed">
                Direct from master loom artisans in Kanchipuram, Varanasi & Telangana. 0% Synthetic, 100% Pure Mulberry Silk.
              </p>
            </div>
          </div>

          {/* Narrative Content */}
          <div className="space-y-7">
            <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] font-poppins">
              The Ravina Sarees Heritage
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif text-brand-text font-normal leading-[1.12] tracking-tight">
              Preserving Centuries of Sacred Indian Loom Craft
            </h2>
            <p className="text-sm text-neutral-600 leading-relaxed font-light">
              <strong className="text-brand-text font-medium">Ravina Sarees</strong> was born out of profound reverence for India&apos;s master handloom weavers. A genuine Kanjivaram or Kadwa Banarasi saree is not merely fabric; it is a hand-engraved piece of sacred art requiring intense shuttle-work by generational master artisans.
            </p>
            <p className="text-sm text-neutral-600 leading-relaxed font-light">
              We exclusively use tested gold and silver zari, unadulterated mulberry silks, and historic temple motifs to ensure every drape you don feels majestic today and becomes a treasured heirloom for future celebrations.
            </p>

            {/* Metrics Matrix */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand-border">
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border">
                <span className="text-2xl font-serif font-bold text-brand-maroon block">3-Ply</span>
                <span className="text-xs text-neutral-500 mt-1 block">Mulberry Silk Filament</span>
              </div>
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border">
                <span className="text-2xl font-serif font-bold text-brand-gold block">Tested Zari</span>
                <span className="text-xs text-neutral-500 mt-1 block">Metallic Core Purity</span>
              </div>
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border">
                <span className="text-2xl font-serif font-bold text-brand-maroon block">₹1,499+</span>
                <span className="text-xs text-neutral-500 mt-1 block">Accessible Masterpiece Rates</span>
              </div>
              <div className="p-4 bg-brand-ivory rounded-2xl border border-brand-border">
                <span className="text-2xl font-serif font-bold text-brand-gold block">24×7 Open</span>
                <span className="text-xs text-neutral-500 mt-1 block">Concierge & Online Dispatch</span>
              </div>
            </div>

            <div className="pt-2">
              <Link
                href="/about"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-brand-maroon hover:text-brand-gold transition-colors font-poppins group"
              >
                Read Our Complete Handloom Journey{" "}
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. VIP BRIDAL & FESTIVE PAVILION (Privilege Unlock)
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <ScrollReveal direction="up" delay={80}>
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#7A1F2B] via-[#5C141E] to-[#3B0C13] border border-brand-gold/50 p-8 sm:p-14 shadow-luxury text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brand-gold/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 text-amber-200 rounded-full text-[10px] uppercase tracking-[0.22em] font-semibold border border-brand-gold/40 shadow font-poppins">
              <Sparkles className="w-3.5 h-3.5 text-brand-gold" /> Exclusive Atelier Privilege Suite
            </div>
            <h2 className="text-3xl sm:text-5xl font-serif text-white font-normal leading-[1.12] tracking-tight">
              The Festive & Wedding Atelier Lounge
            </h2>
            <p className="text-xs sm:text-sm text-neutral-100 leading-relaxed font-light">
              Adorn yourself in unblemished splendour. Enjoy complimentary gift packaging, bespoke saree blouse consultation, and verified Silk Mark certified quality on every single order.
            </p>

            {/* Privilege Coupon Codes Box */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-black/40 border border-brand-gold/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-300 uppercase tracking-widest font-semibold block font-poppins">
                    Welcome Code
                  </span>
                  <span className="font-mono text-base font-bold text-white">FIRSTBUY</span>
                  <span className="text-[11px] text-neutral-300 block">15% Off (Min ₹1,500)</span>
                </div>
                <button
                  onClick={() => copyCouponCode("FIRSTBUY")}
                  className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-brand-gold text-xs text-white font-medium flex items-center gap-1 transition-all"
                >
                  {copiedCoupon === "FIRSTBUY" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCoupon === "FIRSTBUY" ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-brand-gold/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-amber-300 uppercase tracking-widest font-semibold block font-poppins">
                    Royal Festive Code
                  </span>
                  <span className="font-mono text-base font-bold text-white">ROYAL400</span>
                  <span className="text-[11px] text-neutral-300 block">Flat ₹400 Off (Min ₹3,500)</span>
                </div>
                <button
                  onClick={() => copyCouponCode("ROYAL400")}
                  className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-brand-gold text-xs text-white font-medium flex items-center gap-1 transition-all"
                >
                  {copiedCoupon === "ROYAL400" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCoupon === "ROYAL400" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 pt-3">
              <Link
                href="/shop"
                className="px-8 py-3.5 bg-brand-gold hover:bg-brand-goldHover text-white font-bold text-xs uppercase tracking-[0.2em] rounded-full hover:scale-105 transition-all shadow-lg font-poppins"
              >
                Shop Masterpieces Now
              </Link>
              <a
                href="https://wa.me/917780756009?text=Hi%20Ravina%20Sarees,%20I%20would%20like%20to%20consult%20with%20your%20saree%20stylist"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3.5 bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-semibold uppercase tracking-[0.16em] rounded-full flex items-center gap-2 transition-all shadow font-poppins"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp Stylist (24×7)
              </a>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          10. INSTAGRAM SAREE WALL & TRUST MATRIX
      ────────────────────────────────────────────────────────────── */}
      <section className="py-20 md:py-24 bg-brand-ivory border-t border-brand-border">
        <ScrollReveal direction="up" delay={80}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-brand-border pb-6">
            <div>
              <span className="text-[11px] font-semibold text-brand-gold uppercase tracking-[0.28em] block mb-2 font-poppins">
                Follow On Instagram
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal tracking-tight">
                @ravinasarees · Live from Looms
              </h2>
            </div>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 md:mt-0 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold hover:text-brand-maroon flex items-center gap-2 transition-colors font-poppins"
            >
              <Instagram className="w-4 h-4" /> Follow Atelier on Instagram
            </a>
          </div>

          {/* Saree Wall Images */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="aspect-square rounded-2xl overflow-hidden relative group border border-brand-border shadow-sm">
              <img
                src="/images/products/rani-pink-silk-2.jpg"
                alt="Rani Pink Saree Drape"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden relative group border border-brand-border shadow-sm">
              <img
                src="/images/products/turquoise-tissue-1.jpg"
                alt="Turquoise Tissue Drape"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden relative group border border-brand-border shadow-sm">
              <img
                src="/images/products/emerald-kanjivaram-1.jpg"
                alt="Kanjivaram Saree Drape"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="aspect-square rounded-2xl overflow-hidden relative group border border-brand-border shadow-sm">
              <img
                src="/images/products/rani-pink-silk-3.jpg"
                alt="Pallu Tassels Drape"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          {/* 4 Pillars Trust Matrix */}
          <div className="mt-16 bg-white rounded-2xl border border-brand-border shadow-card p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 lg:divide-x divide-brand-border">
              <div className="flex items-center gap-4 pt-4 sm:pt-0">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/25 flex items-center justify-center text-brand-gold shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-text font-poppins">Silk Mark Certified</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">100% pure certified natural silk mark</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 sm:pt-0 lg:pl-8">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/25 flex items-center justify-center text-brand-gold shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-text font-poppins">Tested Zari Purity</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">Real silver metallic core zari</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 sm:pt-0 lg:pl-8">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/25 flex items-center justify-center text-brand-gold shrink-0">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-text font-poppins">Free Express Shipping</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">Complimentary on all orders ₹2,500+</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 sm:pt-0 lg:pl-8">
                <div className="w-12 h-12 rounded-full bg-brand-gold/10 border border-brand-gold/25 flex items-center justify-center text-brand-gold shrink-0">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-brand-text font-poppins">24×7 Concierge</h4>
                  <p className="text-xs text-neutral-500 mt-0.5 font-light">Direct phone & WhatsApp styling help</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
