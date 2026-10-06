"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, Loader2, MapPin, PackageSearch, Printer, Truck, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";
import { SITE } from "@/lib/site";
import { getMyOrderAction } from "@/app/actions/my-orders";
import { orderStatusLabel, PAYMENT_STATUS_LABELS } from "@/lib/orders/mapper";
import { ProductCard } from "@/components/ProductCard";
import type { Order } from "@/lib/types";

const POLL_MS = 3000;
const MAX_POLLS = 8;

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const verifyingHint = searchParams.get("verifying") === "1";
  const { products, user, authReady } = useApp();

  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const polls = useRef(0);

  const load = useCallback(async () => {
    if (!orderNumber) {
      setState("missing");
      return;
    }
    const res = await getMyOrderAction(orderNumber);
    if (res.success) {
      setOrder(res.data);
      setState("ready");
    } else {
      setState("missing");
    }
  }, [orderNumber]);

  useEffect(() => {
    if (authReady) load();
  }, [authReady, load]);

  // Online payments are confirmed by the server / Razorpay webhook: keep checking briefly
  const awaitingPayment =
    !!order && order.paymentMethod !== "cod" && order.paymentStatus === "pending" && order.orderStatus === "pending";
  useEffect(() => {
    if (!awaitingPayment || polls.current >= MAX_POLLS) return;
    const t = setTimeout(() => {
      polls.current += 1;
      load();
    }, POLL_MS);
    return () => clearTimeout(t);
  }, [awaitingPayment, order, load]);

  // "You may also like": real products, same category first, never what was just bought
  const recommendations = useMemo(() => {
    if (!order) return [];
    const bought = new Set(order.items.map((i) => i.sku));
    const category = products.find((p) => p.sku === order.items[0]?.sku)?.categoryName;
    const pool = products.filter((p) => !bought.has(p.sku) && p.stock > 0);
    const same = pool.filter((p) => p.categoryName === category);
    return [...same, ...pool.filter((p) => !same.includes(p))].slice(0, 4);
  }, [order, products]);

  if (!authReady || state === "loading") {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-neutral-500" role="status">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
        <p className="text-sm">Loading your order…</p>
      </div>
    );
  }

  if (!user || state === "missing" || !order) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h1 className="text-2xl font-serif mb-2">We could not find that order</h1>
        <p className="text-sm text-neutral-500 mb-6 font-light max-w-sm">
          {user
            ? "It may belong to a different account, or the link is incorrect. Your orders are listed in your account."
            : "Please sign in to view your order."}
        </p>
        <Link href={user ? "/account/orders" : `/auth/login?redirect=${encodeURIComponent(`/checkout/success?orderNumber=${orderNumber ?? ""}`)}`} className="btn-primary px-6 min-h-[44px] inline-flex items-center text-xs rounded-full font-poppins font-semibold shadow-md">
          {user ? "My Orders" : "Sign In"}
        </Link>
      </div>
    );
  }

  const paymentLabel = PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus;
  const isCod = order.paymentMethod === "cod";
  const confirmed = isCod || order.paymentStatus === "paid";
  const returnRelated = ["return_requested", "returned", "refund_processing", "refunded"].includes(order.orderStatus);
  const a = order.shippingAddress;

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      <style>{`
        @keyframes rs-pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.08) } 100% { transform: scale(1); opacity: 1 } }
        @keyframes rs-draw { to { stroke-dashoffset: 0 } }
        .rs-pop { animation: rs-pop .5s cubic-bezier(.16,1,.3,1) both }
        .rs-draw { stroke-dasharray: 26; stroke-dashoffset: 26; animation: rs-draw .45s .25s ease-out forwards }
        @media (prefers-reduced-motion: reduce) { .rs-pop, .rs-draw { animation: none; stroke-dashoffset: 0; opacity: 1 } }
      `}</style>

      {/* 1. Confirmation */}
      <section className="text-center space-y-4 mb-8" aria-live="polite">
        {confirmed ? (
          <div className="rs-pop w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-200 flex items-center justify-center mx-auto shadow-md">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path className="rs-draw" d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </div>
        ) : (
          <div className="w-20 h-20 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center mx-auto">
            <Loader2 className="w-9 h-9 text-amber-600 animate-spin" aria-hidden="true" />
          </div>
        )}

        <h1 className="text-3xl sm:text-4xl font-serif font-normal">
          {confirmed ? "Order Confirmed" : "Confirming your payment"}
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 font-light">
          {confirmed ? <>Thank you for shopping with {SITE.name}</> : "This usually takes a few seconds. You do not need to pay again."}
        </p>

        <div className="inline-block bg-brand-ivory border border-brand-gold/40 rounded-2xl px-6 py-3">
          <span className="block text-[10px] uppercase tracking-widest text-neutral-500 font-poppins">Order Number</span>
          <span className="block text-xl sm:text-2xl font-mono font-bold text-brand-maroon select-all">{order.orderNumber}</span>
        </div>

        {!confirmed && (awaitingPayment || verifyingHint) && polls.current >= MAX_POLLS && (
          <p role="alert" className="flex items-start gap-2 max-w-md mx-auto text-left text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
            We have not received the payment confirmation yet. If money was debited, it will be reflected shortly or refunded by your bank. Contact us on {SITE.phoneDisplay} with order {order.orderNumber} if this continues.
          </p>
        )}
      </section>

      {/* 2. Track your order */}
      <section aria-labelledby="track-heading" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-7 shadow-card mb-8">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 id="track-heading" className="text-sm font-serif font-bold uppercase tracking-widest flex items-center gap-2">
            <PackageSearch className="w-4 h-4 text-brand-gold" /> Track Your Order
          </h2>
          <Link href={`/account/track/${order.orderNumber}`} className="btn-primary px-5 min-h-[44px] inline-flex items-center text-xs rounded-full font-poppins font-semibold shadow-md">
            Track Order
          </Link>
        </div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex justify-between sm:block"><dt className="text-neutral-500 text-xs">Order number</dt><dd className="font-mono font-semibold">{order.orderNumber}</dd></div>
          <div className="flex justify-between sm:block"><dt className="text-neutral-500 text-xs">Payment</dt><dd className="font-semibold">{isCod ? "Cash on delivery" : paymentLabel}</dd></div>
          <div className="flex justify-between sm:block"><dt className="text-neutral-500 text-xs">Order status</dt><dd className="font-semibold">{orderStatusLabel(order.orderStatus)}</dd></div>
          <div className="flex justify-between sm:block">
            <dt className="text-neutral-500 text-xs">Shipment</dt>
            <dd className="font-semibold">
              {order.trackingNumber ? (
                <span className="inline-flex items-center gap-1.5"><Truck className="w-4 h-4 text-brand-gold" /> {order.courierPartner || "Courier"} · <span className="font-mono">{order.trackingNumber}</span></span>
              ) : (
                <span className="font-normal text-neutral-600">Not shipped yet. Tracking details appear here once it ships.</span>
              )}
            </dd>
          </div>
          {order.estimatedDelivery && (
            <div className="flex justify-between sm:block"><dt className="text-neutral-500 text-xs">Expected delivery</dt><dd className="font-semibold">{formatDate(order.estimatedDelivery)}</dd></div>
          )}
          <div className="flex justify-between sm:block">
            <dt className="text-neutral-500 text-xs">Return / refund</dt>
            <dd className="font-semibold">
              {returnRelated ? orderStatusLabel(order.orderStatus) : <span className="font-normal text-neutral-600">None. You can request a return within {SITE.returnWindowDays} days of delivery.</span>}
            </dd>
          </div>
        </dl>
      </section>

      {/* 3. You may also like */}
      {recommendations.length > 0 && (
        <section aria-labelledby="also-like" className="mb-8">
          <h2 id="also-like" className="text-xl sm:text-2xl font-serif font-normal mb-4">You may also like</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {recommendations.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* 4. Continue shopping */}
      <div className="text-center mb-10">
        <Link href="/shop" className="btn-primary px-10 min-h-[52px] inline-flex items-center text-xs font-bold uppercase tracking-widest rounded-full shadow-md font-poppins">
          Continue Shopping
        </Link>
      </div>

      {/* 5. Order summary (printable) */}
      <section aria-labelledby="summary-heading" className="bg-brand-ivory border border-brand-border rounded-3xl p-5 sm:p-8 space-y-6 print:bg-white print:border-none print:p-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="summary-heading" className="text-lg font-serif">Order summary</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Placed on {formatDate(order.createdAt)}</p>
          </div>
          <button onClick={() => window.print()} className="no-print px-4 min-h-[44px] bg-white hover:bg-brand-ivory border border-brand-border hover:border-brand-gold text-xs font-semibold rounded-full inline-flex items-center gap-2 shadow-sm">
            <Printer className="w-4 h-4 text-brand-gold" /> Print
          </button>
        </div>

        <div className="text-xs space-y-1">
          <p className="text-[10px] uppercase font-bold text-neutral-500 font-poppins flex items-center gap-1"><MapPin className="w-3 h-3" /> Delivering to</p>
          <p className="font-semibold text-sm">{a.name}</p>
          <p className="text-neutral-600">{[a.houseNumber, a.street, a.locality].filter(Boolean).join(", ")}</p>
          {a.landmark && <p className="text-neutral-500">Landmark: {a.landmark}</p>}
          <p className="text-neutral-600">{a.city}, {a.state} - {a.pincode}</p>
          <p className="text-neutral-500">Mobile: {order.customerPhone}</p>
        </div>

        <ul className="divide-y divide-brand-border">
          {order.items.map((item, i) => (
            <li key={i} className="py-3 flex items-center justify-between gap-4 text-xs">
              <div>
                <p className="font-semibold">{item.productName}</p>
                <p className="text-neutral-500">SKU {item.sku}{item.selectedColor ? ` • ${item.selectedColor}` : ""} • Qty {item.quantity}</p>
              </div>
              <span className="font-bold font-serif text-brand-maroon">{formatINR(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="border-t border-brand-border pt-4 ml-auto max-w-xs space-y-1.5 text-xs">
          <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          {order.discountAmount > 0 && <div className="flex justify-between text-emerald-700"><span>Discount{order.appliedCoupon ? ` (${order.appliedCoupon})` : ""}</span><span>-{formatINR(order.discountAmount)}</span></div>}
          {order.giftWrapFee > 0 && <div className="flex justify-between text-neutral-600"><span>Gift packaging</span><span>+{formatINR(order.giftWrapFee)}</span></div>}
          <div className="flex justify-between text-neutral-600"><span>Shipping</span><span>{order.shippingFee === 0 ? "Free" : formatINR(order.shippingFee)}</span></div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-brand-border"><span>{isCod ? "Total (pay on delivery)" : "Total"}</span><span className="font-serif text-brand-maroon">{formatINR(order.totalAmount)}</span></div>
        </div>

        <p className="text-[11px] text-neutral-500 text-center">
          Questions? Email <a href={`mailto:${SITE.email}`} className="text-brand-maroon underline">{SITE.email}</a> or WhatsApp{" "}
          <a href={`https://wa.me/${SITE.whatsappNumber}`} className="text-brand-maroon underline">{SITE.phoneDisplay}</a>.
        </p>
      </section>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-brand-gold"><Loader2 className="w-6 h-6 animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
