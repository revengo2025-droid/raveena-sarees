"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Gift,
  Tag,
  CheckCircle,
  Truck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export const CartDrawer: React.FC = () => {
  const router = useRouter();
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateCartQuantity,
    removeFromCart,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    freeShippingThreshold,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    giftWrap,
    setGiftWrap,
    giftMessage,
    setGiftMessage,
    giftWrapFee,
    user,
    showToast,
  } = useApp();

  const [couponInput, setCouponInput] = useState("");
  const [couponError, setCouponError] = useState("");

  if (!isCartDrawerOpen) return null;

  // Calculate free shipping progress
  const progressPercent = Math.min(100, Math.round((cartSubtotal / freeShippingThreshold) * 100));
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - cartSubtotal);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const res = applyCoupon(couponInput);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponInput("");
    }
  };

  const handleProceedToCheckout = () => {
    setIsCartDrawerOpen(false);
    if (!user) {
      showToast("Please sign in or create an account to proceed to checkout.", "info");
      router.push("/auth/login?redirect=/checkout");
      return;
    }
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Semi-transparent Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-brand-border shadow-luxury flex flex-col text-brand-text">
          {/* 1. Header */}
          <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between bg-brand-ivory">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-brand-gold/15 border border-brand-gold/30 flex items-center justify-center text-brand-gold">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-serif uppercase tracking-[0.18em] text-brand-text font-semibold">
                Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
              </h2>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="text-neutral-500 hover:text-brand-text p-2 rounded-full hover:bg-black/5 transition-colors"
              aria-label="Close Bag"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Free Shipping Progress Bar */}
          <div className="bg-white px-6 py-3.5 border-b border-brand-border">
            <div className="flex items-center justify-between text-[11px] mb-2 font-light">
              <span className="text-neutral-700 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-brand-gold" />
                {remainingForFreeShipping > 0 ? (
                  <>
                    Add <strong className="text-brand-maroon font-semibold">{formatINR(remainingForFreeShipping)}</strong> more for <strong>Complimentary Express Air</strong>
                  </>
                ) : (
                  <strong className="text-brand-gold font-semibold">✨ You have unlocked Complimentary Express Air Courier!</strong>
                )}
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden border border-brand-border/60">
              <div
                className="h-full bg-gradient-to-r from-brand-gold to-brand-maroon transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* 3. Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-brand-border">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mb-4 text-brand-gold">
                  <ShoppingBag className="w-7 h-7 opacity-70" />
                </div>
                <h3 className="font-serif text-lg text-brand-text mb-1">Your Bag is Empty</h3>
                <p className="text-xs text-neutral-500 max-w-xs mb-6 font-light leading-relaxed">
                  Discover our pure Kanjivaram, Banarasi, and bridal heirlooms crafted by master artisans.
                </p>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    router.push("/shop");
                  }}
                  className="btn-primary px-7 py-3 text-[11px] font-bold uppercase tracking-[0.2em] rounded-full shadow-md font-poppins"
                >
                  Explore Masterpieces
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={`${item.product.id}-${item.selectedColor}`} className="py-4 flex gap-4">
                  {/* Thumbnail */}
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-20 h-24 object-cover rounded-xl border border-brand-border shrink-0 shadow-sm"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          href={`/product/${item.product.slug}`}
                          onClick={() => setIsCartDrawerOpen(false)}
                          className="text-xs font-serif font-medium text-brand-text hover:text-brand-maroon line-clamp-1 leading-snug transition-colors"
                        >
                          {item.product.name}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.product.id, item.selectedColor)}
                          className="text-neutral-400 hover:text-red-500 transition-colors p-1"
                          aria-label="Remove Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <p className="text-[10px] text-neutral-500 mt-0.5 uppercase tracking-wider font-poppins">
                        Shade: <span className="text-brand-text font-medium">{item.selectedColor}</span>
                      </p>
                      <p className="text-[9px] text-neutral-400 font-mono mt-0.5">
                        {item.product.fabric}
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Quantity Stepper */}
                      <div className="flex items-center border border-brand-border rounded-full bg-brand-ivory px-1.5 py-0.5">
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity - 1, item.selectedColor)
                          }
                          className="p-1 text-neutral-500 hover:text-brand-text"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 text-xs font-semibold text-brand-text">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateCartQuantity(item.product.id, item.quantity + 1, item.selectedColor)
                          }
                          className="p-1 text-neutral-500 hover:text-brand-text"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Price */}
                      <span className="text-xs font-serif font-bold text-brand-maroon">
                        {formatINR(
                          (item.product.discountPrice || item.product.price) * item.quantity
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 4. Footer & Actions */}
          {cart.length > 0 && (
            <div className="border-t border-brand-border bg-brand-ivory p-6 space-y-4">
              {/* Gift Wrap Option */}
              <div className="bg-white p-3.5 rounded-2xl border border-brand-border shadow-sm">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-brand-text">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="accent-brand-gold rounded"
                  />
                  <Gift className="w-4 h-4 text-brand-gold" />
                  <span className="flex-1 text-[11px] font-light">
                    Luxury Bridal Velvet Box & Calligraphy Note (+₹150)
                  </span>
                </label>

                {giftWrap && (
                  <input
                    type="text"
                    placeholder="Enter wedding blessing or personal note..."
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    className="mt-2.5 w-full bg-brand-ivory border border-brand-border rounded-full px-4 py-2 text-xs text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold"
                  />
                )}
              </div>

              {/* Promo Code Box */}
              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-full text-xs">
                  <div className="flex items-center gap-2 text-emerald-800 pl-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[11px]">
                      Code <strong>{appliedCoupon.code}</strong> Applied! (-{formatINR(cartDiscount)})
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-neutral-500 hover:text-red-600 text-[10px] uppercase tracking-wider font-semibold pr-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      placeholder="Privilege Code (e.g. RAVINA10)"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-full py-2.5 pl-9 pr-24 text-xs text-brand-text placeholder-neutral-400 uppercase focus:outline-none focus:border-brand-gold"
                    />
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <button
                      type="submit"
                      className="absolute right-1 px-4 py-1.5 bg-brand-gold hover:bg-brand-maroon text-white text-[10px] font-bold uppercase tracking-wider rounded-full transition-colors font-poppins"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-red-600 pl-3">{couponError}</p>}
                </form>
              )}

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t border-brand-border pt-3.5 font-light">
                <div className="flex justify-between text-neutral-600">
                  <span>Bag Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Privilege Savings</span>
                    <span>-{formatINR(cartDiscount)}</span>
                  </div>
                )}
                {giftWrap && (
                  <div className="flex justify-between text-brand-gold font-medium">
                    <span>Bridal Velvet Box</span>
                    <span>+{formatINR(giftWrapFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600">
                  <span>Insured Air Delivery</span>
                  <span>
                    {cartSubtotal >= freeShippingThreshold ? (
                      <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[10px]">COMPLIMENTARY</span>
                    ) : (
                      formatINR(250)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-base font-serif font-bold text-brand-text pt-2.5 border-t border-brand-border">
                  <span>Total Due</span>
                  <span className="text-brand-maroon">{formatINR(cartTotal)}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={handleProceedToCheckout}
                className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-[0.2em] rounded-full shadow-md flex items-center justify-center gap-2 font-poppins"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-500 pt-1 font-poppins">
                <Link
                  href="/cart"
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="hover:text-brand-maroon underline"
                >
                  View Full Bag
                </Link>
                <span>🔒 256-bit Encrypted Checkout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
