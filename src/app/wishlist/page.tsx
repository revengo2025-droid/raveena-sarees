"use client";

import React from "react";
import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export default function WishlistPage() {
  const { wishlist, products, toggleWishlist, addToCart } = useApp();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="border-b border-brand-border pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            Your Royal Wishlist ({wishlistedProducts.length})
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-light">
            Curated sarees reserved for your upcoming festivities and bridal trousseau.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistedProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white border border-brand-border rounded-3xl overflow-hidden flex flex-col justify-between hover:border-brand-gold/60 transition-all shadow-card hover:shadow-luxury group"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-brand-ivory">
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <button
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-3 right-3 p-2 bg-white/80 hover:bg-brand-maroon text-neutral-600 hover:text-white rounded-full transition-colors shadow-sm"
                  aria-label="Remove from Wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[10px] text-brand-gold uppercase tracking-widest font-semibold block font-poppins">
                    {product.categoryName}
                  </span>
                  <Link
                    href={`/product/${product.slug}`}
                    className="font-serif text-base text-brand-text hover:text-brand-maroon line-clamp-1 block transition-colors"
                  >
                    {product.name}
                  </Link>
                  <p className="text-[11px] text-neutral-400 line-clamp-1 italic mt-0.5">
                    {product.fabric}
                  </p>

                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-base font-bold font-serif text-brand-maroon">
                      {formatINR(product.discountPrice || product.price)}
                    </span>
                    {product.discountPrice && (
                      <span className="text-xs text-neutral-400 line-through">
                        {formatINR(product.price)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-brand-border flex gap-2">
                  <button
                    onClick={() => {
                      addToCart(product);
                      toggleWishlist(product.id);
                    }}
                    className="btn-primary flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full flex items-center justify-center gap-1.5 shadow-sm font-poppins"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" /> Move to Bag
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
