"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, ShoppingBag, Star } from "lucide-react";
import { SareeProduct } from "@/lib/types";
import { useApp } from "@/lib/store";
import { formatINR, calculateDiscountPercentage } from "@/lib/utils";

interface ProductCardProps {
  product: SareeProduct;
  /** Set on the first row of a page so the browser loads those images eagerly. */
  priority?: boolean;
}

// 2 columns on mobile, 2-3 on tablet, 3-4 on desktop (see the grids that render this card)
const IMAGE_SIZES = "(min-width: 1280px) 24vw, (min-width: 1024px) 31vw, (min-width: 640px) 48vw, 50vw";

export const ProductCard: React.FC<ProductCardProps> = ({ product, priority = false }) => {
  const { addToCart, toggleWishlist, isInWishlist, setQuickViewProduct } = useApp();
  const [isHovered, setIsHovered] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const discountPercent = calculateDiscountPercentage(product.price, product.discountPrice);
  const inStock = product.stock > 0;
  const primary = product.images[0];
  const secondary = product.images[1];

  return (
    <article
      // The title link is stretched over the whole card (after:inset-0), so a tap anywhere opens the
      // product. Buttons sit above it (z-10+), which avoids nested interactive elements.
      className="luxury-card-elevated group relative flex flex-col h-full overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-brand-ivory rounded-t-card">
        {primary ? (
          <Image
            src={primary}
            alt={product.name}
            fill
            sizes={IMAGE_SIZES}
            priority={priority}
            className={`object-cover object-center transition-all duration-700 ease-luxury motion-reduce:transition-none ${
              isHovered && secondary ? "opacity-0 scale-105" : "opacity-100 scale-100 group-hover:scale-105"
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-brand-textMuted text-xs">No photo</div>
        )}
        {secondary && (
          <Image
            src={secondary}
            alt=""
            fill
            sizes={IMAGE_SIZES}
            loading="lazy"
            className={`hidden sm:block object-cover object-center transition-all duration-700 ease-luxury motion-reduce:transition-none ${
              isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
            }`}
          />
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-[5] pointer-events-none">
          {product.isBestseller && (
            <span className="bg-brand-gold text-white font-button font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-gold">
              Bestseller
            </span>
          )}
          {product.isNewArrival && !product.isBestseller && (
            <span className="bg-white text-brand-text font-button font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-soft border border-brand-border">
              New
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-brand-maroon text-white font-button font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
              {discountPercent}% Off
            </span>
          )}
          {!inStock && (
            <span className="bg-neutral-800 text-white font-button font-semibold text-[9px] sm:text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
              Sold out
            </span>
          )}
        </div>

        {/* Wishlist (44px touch target on mobile) */}
        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-pressed={isWishlisted}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={`absolute top-1.5 right-1.5 sm:top-3 sm:right-3 w-10 h-10 sm:w-auto sm:h-auto sm:p-2.5 flex items-center justify-center rounded-full border transition-all duration-300 z-10 shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
            isWishlisted
              ? "bg-brand-maroon border-brand-maroon text-white"
              : "bg-white/90 backdrop-blur-sm border-brand-border text-brand-textMuted hover:text-brand-maroon hover:border-brand-maroon"
          }`}
        >
          <Heart className={`w-4 h-4 ${isWishlisted ? "fill-white" : ""}`} />
        </button>

        {/* Quick actions (hover devices only) */}
        <div className="absolute inset-x-3 bottom-3 hidden sm:group-hover:flex items-center gap-2 z-10 animate-fadeIn">
          <button
            type="button"
            onClick={() => setQuickViewProduct(product)}
            className="flex-1 py-2.5 px-3 bg-white/95 backdrop-blur-sm hover:bg-white text-brand-text text-[11px] font-button font-semibold uppercase tracking-wider rounded-full border border-brand-border hover:border-brand-gold flex items-center justify-center gap-1.5 transition-all shadow-card"
          >
            <Eye className="w-3.5 h-3.5 text-brand-gold" />
            Quick View
          </button>
          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!inStock}
            className="p-2.5 bg-brand-gold hover:bg-brand-maroon disabled:bg-neutral-400 text-white rounded-full shadow-gold transition-all hover:scale-105"
            aria-label={`Add ${product.name} to bag`}
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-2.5 sm:p-5 flex flex-col flex-1 justify-between bg-white">
        <div className="min-w-0">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-brand-gold font-button font-semibold mb-1 truncate">
            {product.categoryName}
          </p>

          <h3 className="font-heading text-[13px] sm:text-lg text-brand-text leading-snug font-medium line-clamp-2 sm:line-clamp-1 min-h-[2.4em] sm:min-h-0 break-words">
            <Link
              href={`/product/${product.slug}`}
              className="after:absolute after:inset-0 after:z-[1] group-hover:text-brand-gold transition-colors focus:outline-none focus-visible:after:ring-2 focus-visible:after:ring-brand-gold focus-visible:after:ring-inset"
            >
              {product.name}
            </Link>
          </h3>

          <p className="hidden sm:block text-[12px] text-brand-textMuted mt-1 line-clamp-1 font-body">
            {[product.fabric, product.zariType].filter(Boolean).join(" • ")}
          </p>

          {/* Stars only once real reviews exist */}
          {product.reviewCount > 0 && (
            <div className="flex items-center gap-1 mt-1.5 sm:mt-2.5">
              <div className="flex items-center text-brand-gold" aria-hidden="true">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${
                      i < Math.floor(product.rating) ? "fill-brand-gold text-brand-gold" : "text-brand-border"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] sm:text-[11px] text-brand-textMuted font-body">
                {product.rating} ({product.reviewCount})
              </span>
            </div>
          )}
        </div>

        {/* Price + mobile add-to-bag */}
        <div className="mt-2 sm:mt-4 pt-2 sm:pt-3.5 border-t border-brand-border flex items-end justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="text-[15px] sm:text-lg font-heading font-bold text-brand-maroon">
                {formatINR(product.discountPrice || product.price)}
              </span>
              {product.discountPrice && (
                <span className="text-[10px] sm:text-xs text-brand-textMuted line-through font-body">
                  {formatINR(product.price)}
                </span>
              )}
            </div>
            {inStock && product.stock <= 5 && (
              <span className="text-[9px] sm:text-[10px] text-brand-maroon font-button font-medium tracking-wider uppercase block mt-0.5">
                Only {product.stock} left
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => addToCart(product)}
            disabled={!inStock}
            aria-label={`Add ${product.name} to bag`}
            className="sm:hidden relative z-10 shrink-0 w-10 h-10 -mr-1 -mb-1 flex items-center justify-center rounded-full bg-brand-gold active:bg-brand-maroon disabled:bg-neutral-300 text-white shadow-gold"
          >
            <ShoppingBag className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
};
