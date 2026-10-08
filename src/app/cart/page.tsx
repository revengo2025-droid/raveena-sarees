"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Gift,
  Tag,
  CheckCircle,
  Truck,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { getCurrentUserAction } from "@/app/actions/auth";
import { LOGIN_FOR_CHECKOUT } from "@/lib/auth/roles";

export default function CartPage() {
  const router = useRouter();
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
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

  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  const [checkingOut, setCheckingOut] = useState(false);
  const handleProceedToCheckout = async () => {
    if (checkingOut) return;
    setCheckingOut(true);
    try {
      // Ask the server whether this browser really has a signed-in customer (the in-memory state can be stale)
      const session = await getCurrentUserAction().catch(() => null);
      if (!user || (session && !session.success)) {
        showToast("Please sign in to continue to checkout. Your bag is saved.", "info");
        router.push(LOGIN_FOR_CHECKOUT);
        return;
      }
      router.push("/checkout");
    } finally {
      setCheckingOut(false);
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((cartSubtotal / freeShippingThreshold) * 100)
  );
  const remainingForFree = Math.max(0, freeShippingThreshold - cartSubtotal);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const res = await applyCoupon(couponCode);
    if (!res.success) {
      setCouponError(res.message);
    } else {
      setCouponCode("");
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-[70vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <div className="w-20 h-20 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mb-6 text-brand-gold shadow-sm">
          <ShoppingBag className="w-10 h-10 opacity-70" />
        </div>
        <h1 className="text-3xl font-serif text-brand-text mb-2">Your Bag is Empty</h1>
        <p className="text-xs sm:text-sm text-neutral-500 max-w-md mb-8 font-light leading-relaxed">
          Explore our handcrafted heirloom Kanjivaram, Banarasi, and bridal sarees to start building your royal trousseau.
        </p>
        <Link
          href="/shop"
          className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md font-poppins"
        >
          Discover Royal Sarees
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-brand-border pb-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            Royal Shopping Bag ({cart.reduce((a, b) => a + b.quantity, 0)})
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-light">
            Review your chosen silk drapes and trousseau selections.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-xs text-neutral-400 hover:text-red-500 flex items-center gap-1 font-poppins transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> Empty Bag
        </button>
      </div>

      {/* 2. Free Shipping Banner */}
      <div className="bg-brand-ivory border border-brand-border rounded-2xl p-4 mb-8 shadow-sm">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-neutral-700 flex items-center gap-2 font-light">
            <Truck className="w-4 h-4 text-brand-gold" />
            {remainingForFree > 0 ? (
              <>
                Add <strong className="text-brand-maroon font-semibold">{formatINR(remainingForFree)}</strong> more to unlock <strong>free shipping</strong>
              </>
            ) : (
              <strong className="text-brand-gold font-semibold">You have unlocked free shipping!</strong>
            )}
          </span>
          <span className="text-[11px] text-neutral-500 font-semibold font-mono">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-gold to-brand-maroon transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3. Grid: Item Table & Order Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items Column (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={`${item.product.id}-${item.selectedColor}`}
              className="bg-white border border-brand-border hover:border-brand-gold/60 rounded-3xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 transition-all shadow-card hover:shadow-luxury"
            >
              {/* Image */}
              <div className="relative w-24 sm:w-28 aspect-[3/4] rounded-2xl overflow-hidden border border-brand-border shrink-0 shadow-sm">
                <Image src={item.product.images[0]} alt={item.product.name} fill sizes="112px" className="object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-[10px] text-brand-gold uppercase tracking-widest font-semibold block font-poppins">
                  {item.product.categoryName}
                </span>
                <Link
                  href={`/product/${item.product.slug}`}
                  className="font-serif text-base sm:text-lg text-brand-text hover:text-brand-maroon transition-colors line-clamp-1"
                >
                  {item.product.name}
                </Link>
                <p className="text-xs text-neutral-500 font-light">
                  Shade: <strong className="text-brand-text font-medium">{item.selectedColor}</strong> • SKU: {item.product.sku}
                </p>
                <p className="text-[11px] text-neutral-400 italic">
                  {item.product.fabric} • {item.product.zariType}
                </p>
              </div>

              {/* Quantity Stepper & Price */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-3">
                <div className="text-right">
                  <span className="text-base sm:text-lg font-bold font-serif text-brand-maroon block">
                    {formatINR(
                      (item.product.discountPrice || item.product.price) * item.quantity
                    )}
                  </span>
                  {item.quantity > 1 && (
                    <span className="text-[10px] text-neutral-400">
                      ({formatINR(item.product.discountPrice || item.product.price)} each)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-brand-border rounded-full bg-brand-ivory px-2 py-0.5">
                    <button
                      onClick={() =>
                        updateCartQuantity(item.product.id, item.quantity - 1, item.selectedColor)
                      }
                      className="p-1 text-neutral-500 hover:text-brand-text"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-3 text-xs font-bold text-brand-text">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateCartQuantity(item.product.id, item.quantity + 1, item.selectedColor)
                      }
                      className="p-1 text-neutral-500 hover:text-brand-text"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id, item.selectedColor)}
                    className="text-neutral-400 hover:text-red-500 p-1.5 transition-colors"
                    aria-label="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Continue Shopping Link */}
          <div className="pt-4">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-brand-maroon hover:text-brand-gold font-semibold transition-colors font-poppins"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Continue Browsing Sarees
            </Link>
          </div>
        </div>

        {/* Order Summary Column (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Gift Box Card */}
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-5 space-y-3 shadow-card">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
                className="mt-0.5 accent-brand-gold"
              />
              <div className="text-xs">
                <span className="font-semibold text-brand-text flex items-center gap-1.5 font-poppins">
                  <Gift className="w-4 h-4 text-brand-gold" /> Royal Bridal Gift Box (+₹150)
                </span>
                <p className="text-[11px] text-neutral-500 mt-0.5 font-light">
                  Hand-crafted gold foil box with velvet lining & handwritten calligraphy note.
                </p>
              </div>
            </label>

            {giftWrap && (
              <textarea
                rows={2}
                placeholder="Enter personal blessing or note for the recipient..."
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl p-2.5 text-xs text-brand-text placeholder-neutral-400 focus:outline-none focus:border-brand-gold resize-none"
              />
            )}
          </div>

          {/* Coupon Code Engine */}
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-5 space-y-3 shadow-card">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-text font-poppins">
              Apply Promo Voucher
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>
                    <strong>{appliedCoupon.code}</strong> (-{formatINR(cartDiscount)})
                  </span>
                </div>
                <button
                  onClick={removeCoupon}
                  className="text-xs text-neutral-500 hover:text-red-600 font-semibold font-poppins"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="e.g. RAVEENA10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="w-full bg-white border border-brand-border rounded-full py-2 pl-9 pr-3 text-xs text-brand-text placeholder-neutral-400 uppercase focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 bg-brand-gold hover:bg-brand-maroon text-white text-xs font-semibold rounded-full transition-colors font-poppins shadow-sm"
                  >
                    Apply
                  </button>
                </div>
                {couponError && <p className="text-[11px] text-red-600 pl-3">{couponError}</p>}
                <div className="text-[10px] text-neutral-500 pt-1 font-mono">
                  Available: <code className="text-brand-maroon font-bold">RAVEENA10</code> (10% off) | <code className="text-brand-maroon font-bold">BRIDAL2026</code> (₹3000 off)
                </div>
              </form>
            )}
          </div>

          {/* Price Breakdown */}
          <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-3.5 shadow-luxury">
            <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text border-b border-brand-border pb-3">
              Order Cost Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600 font-light">
                <span>Bag Subtotal</span>
                <span>{formatINR(cartSubtotal)}</span>
              </div>

              {cartDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Festive Discount</span>
                  <span>-{formatINR(cartDiscount)}</span>
                </div>
              )}

              {giftWrap && (
                <div className="flex justify-between text-brand-gold font-medium">
                  <span>Bridal Packaging</span>
                  <span>+{formatINR(giftWrapFee)}</span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600 font-light">
                <span>Shipping</span>
                <span>
                  {cartSubtotal >= freeShippingThreshold ? (
                    <span className="text-emerald-700 font-semibold font-poppins">FREE</span>
                  ) : (
                    formatINR(250)
                  )}
                </span>
              </div>

              <div className="flex justify-between text-neutral-400 text-[11px] font-light">
                <span>Taxes & GST (Included)</span>
                <span>12% Silk Handloom GST</span>
              </div>
            </div>

            <div className="pt-3 border-t border-brand-border flex justify-between items-baseline">
              <span className="text-base font-bold text-brand-text">Grand Total</span>
              <span className="text-2xl font-bold font-serif text-brand-maroon">
                {formatINR(cartTotal)}
              </span>
            </div>

            {/* Checkout Button */}
            <button
              onClick={handleProceedToCheckout}
              className="btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 mt-4 font-poppins"
            >
              Proceed to Secure Checkout <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center pt-2">
              <span className="text-[10px] text-neutral-500 flex items-center justify-center gap-1 font-poppins">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-gold" />
                256-Bit SSL Encrypted Razorpay Gateway
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
