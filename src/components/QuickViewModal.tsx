"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Star, ShoppingBag, Heart, ShieldCheck, ArrowRight } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, calculateDiscountPercentage } from "@/lib/utils";

export const QuickViewModal: React.FC = () => {
  const router = useRouter();
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    toggleWishlist,
    isInWishlist,
  } = useApp();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string>("");

  if (!quickViewProduct) return null;

  const discountPercent = calculateDiscountPercentage(
    quickViewProduct.price,
    quickViewProduct.discountPrice
  );
  const isWishlisted = isInWishlist(quickViewProduct.id);
  const activeColor = selectedColor || quickViewProduct.primaryColor;

  const handleBuyNow = () => {
    addToCart(quickViewProduct, 1, activeColor);
    setQuickViewProduct(null);
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setQuickViewProduct(null)}
      />

      {/* Modal Card */}
      <div className="relative bg-white rounded-3xl border border-brand-border shadow-luxury max-w-4xl w-full z-10 p-6 sm:p-8 animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={() => setQuickViewProduct(null)}
          className="absolute top-4 right-4 z-20 p-2.5 bg-brand-ivory hover:bg-brand-gold text-neutral-500 hover:text-white border border-brand-border rounded-full transition-colors shadow-sm"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gallery Column */}
          <div className="space-y-4">
            <div className="aspect-[3/4] w-full rounded-2xl overflow-hidden bg-brand-ivory border border-brand-border relative shadow-card">
              <img
                src={quickViewProduct.images[selectedImageIndex] || quickViewProduct.images[0]}
                alt={quickViewProduct.name}
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Thumbnails */}
            {quickViewProduct.images.length > 1 && (
              <div className="flex gap-2.5">
                {quickViewProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-16 h-20 rounded-xl overflow-hidden border transition-all ${
                      selectedImageIndex === idx
                        ? "border-brand-gold scale-105 shadow-md ring-2 ring-brand-gold/30"
                        : "border-brand-border opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Saree Details Column */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Category & SKU */}
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-1.5 font-poppins">
                <span className="text-brand-gold font-semibold">{quickViewProduct.categoryName}</span>
                <span className="font-mono text-neutral-400">SKU: {quickViewProduct.sku}</span>
              </div>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-serif text-brand-text font-normal leading-snug tracking-tight">
                {quickViewProduct.name}
              </h2>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2.5">
                <div className="flex items-center text-brand-gold">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(quickViewProduct.rating)
                          ? "fill-brand-gold text-brand-gold"
                          : "text-neutral-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11px] text-neutral-500">
                  {quickViewProduct.rating} ({quickViewProduct.reviewCount} reviews)
                </span>
                <span className="text-[10px] uppercase tracking-wider text-brand-gold flex items-center gap-1 font-semibold ml-2 font-poppins">
                  <ShieldCheck className="w-3.5 h-3.5" /> Silk Mark Certified
                </span>
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-3 mt-4 pt-3 border-t border-brand-border">
                <span className="text-2xl sm:text-3xl font-serif font-bold text-brand-maroon">
                  {formatINR(quickViewProduct.discountPrice || quickViewProduct.price)}
                </span>
                {quickViewProduct.discountPrice && (
                  <>
                    <span className="text-sm text-neutral-400 line-through">
                      {formatINR(quickViewProduct.price)}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 bg-brand-maroon text-white rounded-full font-poppins">
                      {discountPercent}% OFF
                    </span>
                  </>
                )}
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-600 mt-3 line-clamp-3 leading-relaxed font-light">
                {quickViewProduct.description}
              </p>

              {/* Fabric Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 mt-4 p-3.5 bg-brand-ivory rounded-2xl border border-brand-border text-xs">
                <div>
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider block font-poppins">Fabric</span>
                  <span className="text-brand-text font-medium">{quickViewProduct.fabric}</span>
                </div>
                <div>
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider block font-poppins">Zari Technique</span>
                  <span className="text-brand-text font-medium">{quickViewProduct.zariType}</span>
                </div>
                <div className="mt-1">
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider block font-poppins">Drape Length</span>
                  <span className="text-brand-text font-medium">{quickViewProduct.sareeLength}</span>
                </div>
                <div className="mt-1">
                  <span className="text-neutral-500 text-[9px] uppercase tracking-wider block font-poppins">Blouse Piece</span>
                  <span className="text-brand-maroon font-medium">Included (0.8m Brocade)</span>
                </div>
              </div>

              {/* Available Colors */}
              {quickViewProduct.availableColors.length > 0 && (
                <div className="mt-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 block mb-2 font-poppins">
                    Selected Shade: <strong className="text-brand-text">{activeColor}</strong>
                  </label>
                  <div className="flex gap-2">
                    {quickViewProduct.availableColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`px-3.5 py-1.5 text-xs rounded-full border transition-all font-poppins ${
                          activeColor === color
                            ? "bg-brand-gold text-white font-semibold border-brand-gold shadow-sm"
                            : "bg-white text-neutral-600 border-brand-border hover:border-brand-gold/60"
                        }`}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 pt-4 border-t border-brand-border space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    addToCart(quickViewProduct, 1, activeColor);
                    setQuickViewProduct(null);
                  }}
                  className="flex-1 py-3 px-4 bg-brand-ivory hover:bg-white border border-brand-gold text-brand-maroon hover:text-brand-gold font-bold text-xs uppercase tracking-[0.18em] rounded-full transition-all flex items-center justify-center gap-2 shadow-sm font-poppins"
                >
                  <ShoppingBag className="w-4 h-4 text-brand-gold" />
                  Add to Bag
                </button>

                <button
                  onClick={handleBuyNow}
                  className="btn-primary flex-1 py-3 px-4 text-xs font-bold uppercase tracking-[0.18em] rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
                >
                  Buy Now <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => toggleWishlist(quickViewProduct.id)}
                  className={`p-3 rounded-full border transition-all ${
                    isWishlisted
                      ? "bg-brand-maroon border-brand-maroon text-white"
                      : "bg-brand-ivory border-brand-border text-neutral-500 hover:text-brand-maroon hover:border-brand-gold"
                  }`}
                  aria-label="Wishlist"
                >
                  <Heart className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`} />
                </button>
              </div>

              <div className="text-center pt-1">
                <Link
                  href={`/product/${quickViewProduct.slug}`}
                  onClick={() => setQuickViewProduct(null)}
                  className="text-xs uppercase tracking-[0.2em] text-brand-gold hover:text-brand-maroon font-medium font-poppins"
                >
                  View Complete Saree Specifications &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
