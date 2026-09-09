"use client";

import React from "react";
import Link from "next/link";
import { Award, ShieldCheck, Sparkles, MapPin, ArrowRight, Heart, Clock } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text font-sans">
      {/* 1. Hero */}
      <section className="relative py-20 lg:py-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-ivory border border-brand-gold/40 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-brand-gold font-poppins">
            The Ravina Sarees Legacy
          </span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-serif text-brand-text font-normal leading-tight">
          Purveyors of Royal Indian Handloom Silks
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 font-light max-w-2xl mx-auto leading-relaxed">
          Rooted in Telangana, Ravina Sarees is dedicated to honoring the master weavers of India.
          Every saree in our collection is an heirloom — woven with 100% pure mulberry silk, tested gold zari,
          and timeless devotion.
        </p>
      </section>

      {/* 2. Visual Story Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-brand-border shadow-luxury bg-brand-ivory">
            <img
              src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1200&q=85"
              alt="Ravina Sarees Kanchipuram Weaving"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-widest text-brand-gold font-semibold font-poppins">
              The Artisan Craft
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-brand-text leading-snug">
              Direct from the Looms of Kanchipuram, Varanasi & Pochampally
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light">
              We bypass intermediate trading channels and partner directly with hereditary weaver
              societies. A single bridal Kanjivaram or Kadwa Banarasi can take anywhere from three weeks
              to two months to weave on a traditional wooden pit loom.
            </p>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed font-light">
              Our master artisans use the traditional Korvai interlocking technique where the border,
              body, and pallu are woven separately on three shuttles and fused with extraordinary
              structural strength.
            </p>
            <div className="pt-2">
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-brand-maroon hover:text-brand-gold transition-colors font-poppins"
              >
                Browse Masterloom Creations &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. The 4 Pillars */}
      <section className="py-20 bg-brand-ivory border-y border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs text-brand-gold uppercase tracking-widest font-semibold block mb-1 font-poppins">
              Uncompromising Quality
            </span>
            <h2 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
              The Ravina Silk Standard
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-white border border-brand-border rounded-2xl shadow-card space-y-3">
              <Award className="w-6 h-6 text-brand-gold" />
              <h3 className="font-serif text-base text-brand-text font-semibold">Silk Mark Certified</h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-light">
                All sarees carry authenticated Silk Mark India labels verifying 100% natural silk protein threads.
              </p>
            </div>

            <div className="p-6 bg-white border border-brand-border rounded-2xl shadow-card space-y-3">
              <ShieldCheck className="w-6 h-6 text-brand-gold" />
              <h3 className="font-serif text-base text-brand-text font-semibold">Pure Zari Authenticity</h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-light">
                Tested silver and gold electroplated zari that retains its royal courtly brilliance without tarnishing.
              </p>
            </div>

            <div className="p-6 bg-white border border-brand-border rounded-2xl shadow-card space-y-3">
              <Clock className="w-6 h-6 text-brand-gold" />
              <h3 className="font-serif text-base text-brand-text font-semibold">Open 24×7 Always</h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-light">
                Round-the-clock concierge service, private styling consultations, and express dispatch.
              </p>
            </div>

            <div className="p-6 bg-white border border-brand-border rounded-2xl shadow-card space-y-3">
              <Heart className="w-6 h-6 text-brand-gold" />
              <h3 className="font-serif text-base text-brand-text font-semibold">Weaver Welfare</h3>
              <p className="text-xs text-neutral-600 leading-relaxed font-light">
                Fair-trade compensation ensuring weaver families flourish and historic loom techniques endure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Atelier Visit */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <h2 className="text-2xl sm:text-4xl font-serif text-brand-text font-normal">
          Visit Our Atelier & Boutique
        </h2>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto leading-relaxed font-light">
          Whether you are assembling your wedding trousseau or looking for a bespoke Kanjivaram,
          our drape connoisseurs welcome you at Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana.
        </p>
        <div className="pt-2">
          <Link
            href="/contact"
            className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center gap-2 font-poppins"
          >
            Showroom Directions & Appointments <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
