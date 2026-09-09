"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Heart, Eye, ShoppingBag, Star, ArrowRight } from "lucide-react";
import { SareeProduct } from "@/lib/types";
import { useApp } from "@/lib/store";
import { formatINR, calculateDiscountPercentage } from "@/lib/utils";

interface ProductCardProps {
  product: SareeProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const discountPercent = calculateDiscountPercentage(product.price, product.discountPrice);

  return (
    <div
      className="luxury-card-elevated group flex flex-col h-full cursor-pointer overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Section */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-ivory rounded-t-card">
        {/* Main & Secondary Product Image Crossfade */}
        <img
          src={product.images[0]}
          alt={product.name}
          className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-luxury ${
            isHovered && product.images[1] ? "opacity-0 scale-105" : "opacity-100 scale-100 group-hover:scale-105"
          }`}
          loading="lazy"
        />
        {product.images[1] && (
          <img
            src={product.images[1]}
            alt={`${product.name} alternate view`}
            className={`absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-luxury ${
              isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
            }`}
            loading="lazy"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.isBestseller && (
            <span className="bg-brand-gold text-white font-button font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-gold">
              Bestseller
            </span>
          )}
          {product.isNewArrival && !product.isBestseller && (
            <span className="bg-white text-brand-text font-button font-semibold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full shadow-soft border border-brand-border">
              New Arrival
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-brand-maroon text-white font-button font-semibold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              {discountPercent}% Off
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 p-2.5 rounded-full border transition-all duration-300 z-10 shadow-soft ${
            isWishlisted
              ? "bg-brand-maroon border-brand-maroon text-white"
              : "bg-white/90 backdrop-blur-sm border-brand-border text-brand-textMuted hover:text-brand-maroon hover:border-brand-maroon"
          }`}
          aria-label="Add to Wishlist"
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`} />
        </button>

        {/* Hover Actions Overlay */}
        <div className="absolute inset-x-3 bottom-3 hidden group-hover:flex items-center gap-2 z-20 animate-fadeIn">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setQuickViewProduct(product);
            }}
            className="flex-1 py-2.5 px-3 bg-white/95 backdrop-blur-sm hover:bg-white text-brand-text text-[11px] font-button font-semibold uppercase tracking-wider rounded-full border border-brand-border hover:border-brand-gold flex items-center justify-center gap-1.5 transition-all shadow-card"
          >
            <Eye className="w-3.5 h-3.5 text-brand-gold" />
            Quick View
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart(product);
            }}
            className="p-2.5 bg-brand-gold hover:bg-brand-maroon text-white rounded-full shadow-gold transition-all hover:scale-105"
            aria-label="Add to Bag"
            title="Add to Bag"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between bg-white">
        <div>
          {/* Category & Colors */}
          <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-brand-gold font-button font-semibold mb-1.5">
            <span>{product.categoryName}</span>
            <div className="flex items-center gap-1.5" title={`Available in ${product.availableColors.join(", ")}`}>
              {product.availableColors.slice(0, 3).map((col, cIdx) => (
                <span
                  key={cIdx}
                  className={`w-2.5 h-2.5 rounded-full border border-brand-border ${
                    cIdx === 0
                      ? "bg-brand-gold"
                      : cIdx === 1
                      ? "bg-brand-maroon"
                      : "bg-emerald-700"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Saree Title */}
          <Link href={`/product/${product.slug}`} className="block group-hover:text-brand-gold transition-colors">
            <h3 className="font-heading text-base sm:text-lg text-brand-text line-clamp-1 leading-snug font-medium">
              {product.name}
            </h3>
          </Link>

          {/* Fabric */}
          <p className="text-[12px] text-brand-textMuted mt-1 line-clamp-1 font-body">
            {product.fabric} • {product.zariType}
          </p>

          {/* Star Rating */}
          <div className="flex items-center gap-1.5 mt-2.5">
            <div className="flex items-center text-brand-gold">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${
                    i < Math.floor(product.rating)
                      ? "fill-brand-gold text-brand-gold"
                      : "text-brand-border"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-brand-textMuted font-body">
              {product.rating} ({product.reviewCount})
            </span>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="mt-4 pt-3.5 border-t border-brand-border flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-heading font-bold text-brand-maroon">
                {formatINR(product.discountPrice || product.price)}
              </span>
              {product.discountPrice && (
                <span className="text-xs text-brand-textMuted line-through font-body">
                  {formatINR(product.price)}
                </span>
              )}
            </div>
            {product.stock <= 5 && (
              <span className="text-[10px] text-brand-maroon font-button font-medium tracking-wider uppercase block mt-0.5">
                Only {product.stock} left
              </span>
            )}
          </div>

          <Link
            href={`/product/${product.slug}`}
            className="text-[11px] uppercase tracking-wider font-button font-semibold text-brand-gold hover:text-brand-maroon flex items-center gap-1 transition-colors group/link"
          >
            View <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
