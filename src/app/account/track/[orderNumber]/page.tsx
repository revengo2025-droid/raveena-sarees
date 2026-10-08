"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2, Clock, ChevronRight, ExternalLink, Loader2, Truck, LifeBuoy, MapPin, AlertTriangle, PackageCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDate, formatINR } from "@/lib/utils";
import { SITE } from "@/lib/site";
import { getMyOrderAction } from "@/app/actions/my-orders";
import { orderStatusLabel, PAYMENT_STATUS_LABELS } from "@/lib/orders/mapper";
import { SHIPMENT_ALERT_STATUSES, SHIPMENT_STATUS_LABELS, type ShipmentStatus } from "@/lib/services/shipping/status";
import type { Order, OrderStatus } from "@/lib/types";

// The normal journey of an order. Every timestamp shown comes from the real status history.
const JOURNEY: { status: OrderStatus; title: string; description: string }[] = [
  { status: "confirmed", title: "Order confirmed", description: "We have received your order." },
  { status: "processing", title: "Processing", description: "Your saree is being checked and prepared." },
  { status: "packed", title: "Packed", description: "Packed and ready for the courier." },
  { status: "shipped", title: "Shipped", description: "Handed over to the courier." },
  { status: "out_for_delivery", title: "Out for delivery", description: "On its way to your address." },
  { status: "delivered", title: "Delivered", description: "Delivered to your address." },
];
const SIDE_STATES: OrderStatus[] = ["cancelled", "return_requested", "returned", "refund_processing", "refunded"];

type Scan = { label: string | null; activity: string | null; location: string | null; at: string | null };

const formatDateTime = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;
  const { user, authReady } = useApp();

  const [order, setOrder] = useState<Order | null>(null);
  const [history, setHistory] = useState<{ status: string; at: string }[]>([]);
  const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [showAllScans, setShowAllScans] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setState("missing");
      return;
    }
    getMyOrderAction(orderNumber).then((res) => {
      if (res.success) {
        setOrder(res.data);
        setHistory(res.history);
        setTrackingUrl(res.trackingUrl);
        setScans(res.scans);
        setState("ready");
      } else setState("missing");
    });
  }, [authReady, user, orderNumber]);

  if (state === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-neutral-500" role="status">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading order…
      </div>
    );
  }

  if (state === "missing" || !order) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h1 className="text-2xl font-serif mb-2">Order not found</h1>
        <p className="text-sm text-neutral-500 mb-6 font-light max-w-sm">
          {user ? "We could not find this order in your account." : "Please sign in to track your order."}
        </p>
        <Link
          href={user ? "/account/orders" : `/auth/login?redirect=${encodeURIComponent(`/account/track/${orderNumber}`)}`}
          className="btn-primary px-6 min-h-[44px] inline-flex items-center text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          {user ? "View all orders" : "Sign in"}
        </Link>
      </div>
    );
  }

  const when = (status: string) => {
    const h = [...history].reverse().find((x) => x.status === status);
    return h ? formatDate(h.at) : "";
  };
  const currentIndex = JOURNEY.findIndex((j) => j.status === order.orderStatus);
  const isSide = SIDE_STATES.includes(order.orderStatus);
  const awaitingPayment = order.orderStatus === "pending";
  // For side states (cancelled/returns) show how far it got by looking at history
  const reachedIndex = isSide
    ? Math.max(-1, ...history.map((h) => JOURNEY.findIndex((j) => j.status === h.status)))
    : currentIndex;
  const a = order.shippingAddress;

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6 font-poppins flex-wrap">
        <Link href="/account" className="hover:text-brand-gold">Account</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/account/orders" className="hover:text-brand-gold">Orders</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brand-gold font-semibold">{order.orderNumber}</span>
      </div>

      <div className="bg-white border border-brand-border rounded-3xl p-5 sm:p-8 space-y-6 shadow-luxury">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-brand-border pb-6">
          <div>
            <h1 className="text-2xl font-serif font-normal">Order {order.orderNumber}</h1>
            <p className="text-xs text-neutral-500 mt-1">Placed {formatDate(order.createdAt)} · {formatINR(order.totalAmount)}</p>
            <p className="text-xs text-neutral-600 mt-1">
              Payment: <strong>{PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}</strong>
            </p>
          </div>
          <div className="sm:text-right space-y-1.5">
            <span className="inline-block px-3 py-1 rounded-full text-xs uppercase font-bold bg-brand-ivory text-brand-maroon border border-brand-gold/40 font-poppins">
              {orderStatusLabel(order.orderStatus)}
            </span>
            {order.estimatedDelivery && (
              <p className="text-xs text-neutral-600">Expected delivery <strong>{formatDate(order.estimatedDelivery)}</strong></p>
            )}
          </div>
        </div>

        {/* Shipment */}
        {(() => {
          const ship = (order.shipmentStatus || null) as ShipmentStatus | null;
          const shipLabel = ship && ship !== "unknown" ? SHIPMENT_STATUS_LABELS[ship] : order.shipmentStatusLabel || null;
          const alert = ship ? SHIPMENT_ALERT_STATUSES.includes(ship) : false;
          return (
            <section aria-label="Shipment" className="rounded-2xl bg-brand-ivory border border-brand-border p-4 sm:p-5 text-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-serif text-base">
                  <Truck className="w-4 h-4 text-brand-gold shrink-0" /> Shipment
                </h2>
                {shipLabel && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-poppins border ${alert ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-white text-brand-maroon border-brand-gold/40"}`}>
                    {shipLabel}
                  </span>
                )}
              </div>
              {order.trackingNumber ? (
                <>
                  <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <dt className="text-neutral-500 text-[10px] uppercase font-poppins">Courier</dt>
                      <dd className="font-semibold mt-0.5">{order.courierPartner || "Assigned"}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500 text-[10px] uppercase font-poppins">Tracking number (AWB)</dt>
                      <dd className="font-mono font-semibold mt-0.5 select-all break-all">{order.trackingNumber}</dd>
                    </div>
                    {order.estimatedDelivery && order.orderStatus !== "delivered" && (
                      <div>
                        <dt className="text-neutral-500 text-[10px] uppercase font-poppins">Expected delivery</dt>
                        <dd className="font-semibold mt-0.5">{formatDate(order.estimatedDelivery)}</dd>
                      </div>
                    )}
                  </dl>
                  {trackingUrl && (
                    <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-maroon underline min-h-[44px]">
                      Open courier tracking <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {alert && (
                    <p className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      There is an issue with this delivery. Our team is following up with the courier; you can also contact us below.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-neutral-600 text-xs">
                  {awaitingPayment
                    ? "Shipment starts once your payment is confirmed."
                    : order.shipmentStatus === "created"
                      ? "Your shipment has been created. The courier and tracking number will appear here as soon as they are assigned."
                      : "Not shipped yet. The courier and tracking number will appear here as soon as it ships."}
                </p>
              )}
            </section>
          );
        })()}

        {/* Timeline */}
        {awaitingPayment ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Your payment has not been confirmed yet. If you were charged, it will be confirmed shortly or refunded by your bank.
          </p>
        ) : (
          <ol className="py-2 space-y-7 relative pl-8 border-l-2 border-brand-border ml-3.5" aria-label="Order progress">
            {JOURNEY.map((step, idx) => {
              const done = reachedIndex >= idx && !(isSide && idx > reachedIndex);
              const current = !isSide && idx === currentIndex;
              const date = when(step.status);
              return (
                <li key={step.status} className="relative" aria-current={current ? "step" : undefined}>
                  <span
                    className={`absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                      done && !current ? "bg-brand-gold text-white border-brand-gold" : current ? "bg-white text-brand-maroon border-brand-maroon" : "bg-brand-ivory text-neutral-400 border-brand-border"
                    }`}
                  >
                    {done && !current ? <CheckCircle2 className="w-4 h-4" /> : current ? <Clock className="w-4 h-4" /> : <span className="text-[11px] font-bold">{idx + 1}</span>}
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className={`font-serif text-base font-semibold ${done || current ? "text-brand-text" : "text-neutral-400"}`}>{step.title}</h2>
                    {date && <span className="text-[11px] text-brand-maroon font-semibold font-poppins">{date}</span>}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{step.description}</p>
                </li>
              );
            })}
          </ol>
        )}

        {/* Courier updates (real scans reported by the courier via Shiprocket) */}
        {scans.length > 0 && (
          <section aria-label="Courier updates" className="space-y-3">
            <h2 className="font-serif text-base flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-brand-gold" /> Courier updates
            </h2>
            <ol className="space-y-3">
              {(showAllScans ? scans : scans.slice(0, 5)).map((sc, i) => (
                <li key={i} className="flex gap-3 text-xs">
                  <span className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${i === 0 ? "bg-brand-maroon" : "bg-brand-gold/50"}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-text">{sc.activity || sc.label}</p>
                    <p className="text-neutral-500 flex flex-wrap gap-x-3">
                      {sc.at && <span>{formatDateTime(sc.at)}</span>}
                      {sc.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {sc.location}
                        </span>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {scans.length > 5 && (
              <button type="button" onClick={() => setShowAllScans((v) => !v)} className="text-xs font-semibold text-brand-maroon underline min-h-[44px]">
                {showAllScans ? "Show fewer updates" : `Show all ${scans.length} updates`}
              </button>
            )}
          </section>
        )}

        {/* Items and price breakdown */}
        <section aria-label="Items in this order" className="pt-6 border-t border-brand-border space-y-3">
          <h2 className="font-serif text-base">Items</h2>
          <ul className="divide-y divide-brand-border">
            {order.items.map((it, i) => (
              <li key={`${it.productId}-${i}`} className="py-3 flex items-center gap-3 text-xs">
                {it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt="" width={48} height={56} loading="lazy" className="w-12 h-14 rounded-lg object-cover border border-brand-border shrink-0" />
                ) : (
                  <span className="w-12 h-14 rounded-lg bg-brand-ivory border border-brand-border shrink-0" aria-hidden="true" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.productName}</p>
                  <p className="text-neutral-500">
                    {it.selectedColor ? `${it.selectedColor} · ` : ""}Qty {it.quantity} × {formatINR(it.price)}
                  </p>
                </div>
                <span className="font-semibold text-sm">{formatINR(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="text-xs space-y-1.5 max-w-xs ml-auto">
            <div className="flex justify-between"><dt className="text-neutral-500">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
            {order.discountAmount > 0 && <div className="flex justify-between"><dt className="text-neutral-500">Discount</dt><dd>- {formatINR(order.discountAmount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-neutral-500">Shipping</dt><dd>{order.shippingFee > 0 ? formatINR(order.shippingFee) : "Free"}</dd></div>
            {order.giftWrapFee > 0 && <div className="flex justify-between"><dt className="text-neutral-500">Gift wrap</dt><dd>{formatINR(order.giftWrapFee)}</dd></div>}
            <div className="flex justify-between text-sm font-semibold border-t border-brand-border pt-1.5"><dt>Total</dt><dd className="text-brand-maroon">{formatINR(order.totalAmount)}</dd></div>
          </dl>
        </section>

        {isSide && (
          <p className="text-sm bg-brand-ivory border border-brand-border rounded-xl px-4 py-3">
            <strong>{orderStatusLabel(order.orderStatus)}</strong>
            {when(order.orderStatus) ? ` on ${when(order.orderStatus)}` : ""}. Need help? Email{" "}
            <a href={`mailto:${SITE.email}`} className="underline text-brand-maroon">{SITE.email}</a>.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-brand-border text-xs">
          <div className="space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-poppins block">Delivery address</span>
            <p className="font-bold font-poppins text-sm">{a.name}</p>
            <p className="text-neutral-600">{[a.houseNumber, a.street, a.locality].filter(Boolean).join(", ")}</p>
            <p className="text-neutral-600">{a.city}, {a.state} - <strong>{a.pincode}</strong></p>
          </div>
          <div className="sm:text-right space-y-2 font-poppins">
            <Link href={`/checkout/success?orderNumber=${order.orderNumber}`} className="inline-flex items-center gap-1.5 px-4 min-h-[44px] bg-brand-ivory hover:bg-white border border-brand-gold/60 text-brand-maroon font-semibold text-xs rounded-full shadow-sm">
              Order summary
            </Link>
            <p>
              <a href={`https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent(`Hello, I need help with order ${order.orderNumber}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-brand-maroon min-h-[44px]">
                <LifeBuoy className="w-4 h-4" /> Need help with this order?
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
