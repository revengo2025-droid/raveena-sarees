"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";

export default function CategoryPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const { categories, products } = useApp();
  const [sortBy, setSortBy] = useState<string>("featured");

  const category = categories.find((c) => c.slug === slug || c.id === slug);

  // Category Products
  const categoryProducts = useMemo(() => {
    if (!category) return [];
    return products
      .filter((p) => {
        if (p.categoryId === category.id) return true;
        if (p.categoryName?.toLowerCase() === category.name.toLowerCase()) return true;
        const catWord = category.name.split(" ")[0].toLowerCase();
        if (p.tags?.some((t) => t.toLowerCase().includes(catWord))) return true;
        if (category.slug === "banarasi-sarees" && (p.tags?.includes("Banarasi") || p.fabric?.includes("Banarasi"))) return true;
        if (category.slug === "handloom-sarees" && (p.tags?.includes("Handloom") || p.tags?.includes("Kanjivaram") || p.tags?.includes("Pure Silk"))) return true;
        return false;
      })
      .sort((a, b) => {
        const priceA = a.discountPrice || a.price;
        const priceB = b.discountPrice || b.price;
        if (sortBy === "price-asc") return priceA - priceB;
        if (sortBy === "price-desc") return priceB - priceA;
        if (sortBy === "rating") return b.rating - a.rating;
        if (sortBy === "newest")
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        return 0;
      });
  }, [category, products, sortBy]);

  if (!category) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text">
        <h2 className="text-2xl font-serif mb-2">Category Not Found</h2>
        <p className="text-xs text-neutral-500 mb-6">
          The requested saree collection could not be located.
        </p>
        <Link
          href="/shop"
          className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          View All Sarees
        </Link>
      </div>
    );
  }

  // Other categories for cross-linking
  const otherCategories = categories.filter((c) => c.id !== category.id);

  return (
    <div className="min-h-screen bg-brand-white font-sans text-brand-text">
      {/* 1. Category Hero Banner */}
      <section className="relative w-full h-[45vh] min-h-[360px] max-h-[500px] overflow-hidden bg-brand-ivory flex items-center">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10" />
        <img
          src={category.bannerUrl || category.imageUrl}
          alt={category.name}
          className="w-full h-full object-cover object-center scale-105"
        />

        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-xl space-y-4 text-white">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs text-neutral-200 font-poppins">
              <Link href="/" className="hover:text-brand-gold">
                Home
              </Link>
              <span>/</span>
              <Link href="/shop" className="hover:text-brand-gold">
                Categories
              </Link>
              <span>/</span>
              <span className="text-amber-200 font-semibold">{category.name}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif text-white font-normal leading-tight drop-shadow">
              {category.name}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-100 leading-relaxed font-light drop-shadow">
              {category.description}
            </p>

            <div className="flex items-center gap-4 pt-1">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/90 backdrop-blur-md border border-brand-gold/40 rounded-full text-xs text-brand-maroon font-semibold font-poppins shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" /> 100% Silk Mark Certified
              </span>
              <span className="text-xs text-neutral-200 font-medium font-poppins">
                {categoryProducts.length} Exclusive Creations
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Collection Grid & Sort Header */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 bg-brand-ivory p-4 rounded-2xl border border-brand-border shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-text font-poppins">
            Showing {categoryProducts.length} Handwoven Sarees
          </span>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 font-poppins">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-brand-border text-brand-text text-xs rounded-full px-3.5 py-2 focus:outline-none focus:border-brand-gold font-poppins shadow-sm"
            >
              <option value="featured">Featured Curations</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest Drops</option>
            </select>
          </div>
        </div>

        {categoryProducts.length === 0 ? (
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-12 text-center text-brand-text shadow-card">
            <h3 className="text-lg font-serif mb-2">New Weaves Coming Soon</h3>
            <p className="text-xs text-neutral-500 mb-6 font-light">
              Our master weavers are currently finishing the next batch of {category.name}.
            </p>
            <Link
              href="/shop"
              className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md inline-block"
            >
              Explore Other Sarees
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* 3. Explore Other Categories */}
      <section className="py-16 bg-brand-ivory border-t border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl sm:text-2xl font-serif text-brand-text mb-6">
            Discover Other Royal Handlooms
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {otherCategories.slice(0, 6).map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.slug}`}
                className="group p-4 bg-white border border-brand-border hover:border-brand-gold rounded-2xl text-center transition-all shadow-card hover:shadow-luxury"
              >
                <h4 className="text-xs font-serif font-semibold text-brand-text group-hover:text-brand-maroon transition-colors">
                  {cat.name}
                </h4>
                <span className="text-[10px] text-brand-gold font-poppins mt-1 block font-medium">
                  Explore Weaves &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
