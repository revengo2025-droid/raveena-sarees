"use client";

import React from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useApp } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";

export default function WishlistPage() {
  const { wishlist, products } = useApp();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-brand-border pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            Your Wishlist ({wishlistedProducts.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-light">
            Sarees you have saved. Tap the heart on any saree to remove it.
          </p>
        </div>
      </div>

      {wishlistedProducts.length === 0 ? (
        <div className="min-h-[50vh] bg-brand-ivory border border-brand-border rounded-3xl p-12 text-center flex flex-col items-center justify-center shadow-card">
          <div className="w-16 h-16 rounded-full bg-white border border-brand-border flex items-center justify-center mb-4 text-brand-gold shadow-sm">
            <Heart className="w-8 h-8 opacity-70" />
          </div>
          <h3 className="text-xl font-serif text-brand-text mb-1">Your Wishlist is Empty</h3>
          <p className="text-xs text-neutral-500 max-w-sm mb-6 font-light">
            Click the heart icon on any saree to save it to your private bridal wishlist.
          </p>
          <Link
            href="/shop"
            className="btn-primary px-8 py-3 text-xs font-bold uppercase tracking-widest rounded-full shadow-md font-poppins"
          >
            Browse Sarees
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {wishlistedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
