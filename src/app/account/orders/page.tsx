"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package, Truck, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import { orderStatusLabel } from "@/lib/orders/mapper";
import { formatINR, formatDate } from "@/lib/utils";
import { AccountShell } from "@/components/account/AccountShell";
import { statusTone } from "@/components/account/orderStatusTone";
import type { Order } from "@/lib/types";

const FILTERS: { id: string; label: string; match: (o: Order) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "active", label: "In progress", match: (o) => ["pending", "confirmed", "processing", "packed"].includes(o.orderStatus) },
  { id: "shipped", label: "On the way", match: (o) => o.orderStatus === "shipped" || o.orderStatus === "out_for_delivery" },
  { id: "delivered", label: "Delivered", match: (o) => o.orderStatus === "delivered" },
  { id: "closed", label: "Cancelled & returns", match: (o) => ["cancelled", "return_requested", "returned", "refund_processing", "refunded"].includes(o.orderStatus) },
];

const PAYMENT_LABEL: Record<Order["paymentStatus"], string> = { paid: "Paid", pending: "Payment pending", failed: "Payment failed", refunded: "Refunded" };

export default function OrdersPage() {
  return (
    <AccountShell title="My orders" description="Track deliveries and view your order summaries." signInRedirect="/account/orders">
      <OrdersContent />
    </AccountShell>
  );
}

function OrdersContent() {
  const { orders } = useApp();
  const [filter, setFilter] = useState("all");
  const active = FILTERS.find((f) => f.id === filter) || FILTERS[0];
  const shown = orders.filter(active.match);

  return (
    <>
      <div role="group" aria-label="Filter orders" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 font-poppins">
        {FILTERS.map((f) => {
          const count = orders.filter(f.match).length;
          const on = f.id === filter;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 min-h-[44px] px-4 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                on ? "bg-brand-maroon text-white border-brand-maroon" : "bg-white text-neutral-700 border-brand-border hover:border-brand-gold"
              }`}
            >
              {f.label} <span className={on ? "text-white/80" : "text-neutral-500"}>({count})</span>
            </button>
          );
        })}
      </div>

      <p className="sr-only" aria-live="polite">
        Showing {shown.length} {shown.length === 1 ? "order" : "orders"}
      </p>

      {shown.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-brand-border rounded-3xl p-10 text-center">
          <Package className="w-10 h-10 text-brand-gold mx-auto mb-3" aria-hidden="true" />
          <p className="text-base font-serif">{orders.length === 0 ? "No orders yet" : `No orders in "${active.label}"`}</p>
          <p className="text-sm text-neutral-600 mt-1">{orders.length === 0 ? "When you place an order it will appear here." : "Try another filter above."}</p>
          {orders.length === 0 && (
            <Link href="/shop" className="btn-primary inline-flex mt-5 px-6 min-h-[48px] text-xs rounded-full font-poppins font-semibold shadow-md">
              Explore sarees
            </Link>
          )}
        </div>
      ) : (
        <ul className="space-y-5">
          {shown.map((order) => (
            <li key={order.id}>
              <article aria-labelledby={`ord-${order.id}`} className="bg-white border border-brand-border rounded-3xl shadow-card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-brand-ivory border-b border-brand-border">
                  <div>
                    <h2 id={`ord-${order.id}`} className="text-sm font-semibold">
                      Order <span className="font-mono">{order.orderNumber}</span>
                    </h2>
                    <p className="text-xs text-neutral-600">Placed on {formatDate(order.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusTone(order.orderStatus)}`}>{orderStatusLabel(order.orderStatus)}</span>
                    <span className="text-base font-serif font-bold text-brand-maroon">{formatINR(order.totalAmount)}</span>
                  </div>
                </header>

                <ul className="divide-y divide-brand-border px-5 sm:px-6">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="py-4 flex items-center gap-4">
                      <img src={item.imageUrl} alt="" className="w-16 h-20 object-cover rounded-xl border border-brand-border shrink-0" />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-serif font-semibold truncate">{item.productName}</p>
                        <p className="text-xs text-neutral-600 mt-0.5">
                          {item.selectedColor && <>Shade: {item.selectedColor} · </>}Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-brand-maroon shrink-0">{formatINR(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <footer className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t border-brand-border">
                  <div className="text-xs text-neutral-600 space-y-0.5">
                    {order.trackingNumber ? (
                      <p className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-brand-gold" aria-hidden="true" /> {order.courierPartner || "Courier"} · <span className="font-mono">{order.trackingNumber}</span>
                      </p>
                    ) : (
                      <p>Not shipped yet</p>
                    )}
                    <p>
                      {order.estimatedDelivery ? (
                        <>
                          Expected by <strong className="text-brand-text">{formatDate(order.estimatedDelivery)}</strong>
                        </>
                      ) : (
                        PAYMENT_LABEL[order.paymentStatus] || order.paymentStatus
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 font-poppins">
                    <Link
                      href={`/account/track/${order.orderNumber}`}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-brand-border hover:border-brand-gold text-xs font-semibold"
                    >
                      <Truck className="w-4 h-4 text-brand-gold" aria-hidden="true" /> Track<span className="sr-only"> order {order.orderNumber}</span>
                    </Link>
                    <Link
                      href={`/checkout/success?orderNumber=${encodeURIComponent(order.orderNumber)}`}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-full border border-brand-gold/60 text-brand-maroon hover:bg-brand-goldPale text-xs font-semibold"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" /> Order summary<span className="sr-only"> for {order.orderNumber}</span>
                    </Link>
                  </div>
                </footer>
              </article>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
