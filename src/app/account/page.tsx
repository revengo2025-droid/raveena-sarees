"use client";

import React from "react";
import Link from "next/link";
import { Package, Heart, MapPin, Truck, CheckCircle2, Circle, ArrowRight, Pencil, ShoppingBag, LifeBuoy, Home, Briefcase } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";
import { orderStatusLabel } from "@/lib/orders/mapper";
import { IN_PROGRESS_ORDER_STATUSES } from "@/lib/support/constants";
import { AccountShell } from "@/components/account/AccountShell";
import { statusTone } from "@/components/account/orderStatusTone";

const IN_PROGRESS = new Set<string>(IN_PROGRESS_ORDER_STATUSES);

export default function AccountPage() {
  const { user } = useApp();
  return (
    <AccountShell title={`Namaste, ${(user?.fullName || "").split(" ")[0] || "there"}`} description="Everything about your orders and account, in one place.">
      <Overview />
    </AccountShell>
  );
}

function Overview() {
  const { user, orders, wishlist, savedAddresses } = useApp();
  if (!user) return null;
  const active = orders.filter((o) => IN_PROGRESS.has(o.orderStatus));
  const paidTotal = orders.filter((o) => o.paymentStatus === "paid").reduce((sum, o) => sum + o.totalAmount, 0);
  const defaultAddress = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];

  const checklist = [
    { done: user.fullName.trim().length >= 2, label: "Add your full name", href: "/account/settings" },
    { done: Boolean(user.phone), label: "Add a mobile number for delivery updates", href: "/account/settings" },
    { done: savedAddresses.length > 0, label: "Save a delivery address", href: "/account/addresses?new=1" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = Math.round((doneCount / checklist.length) * 100);

  const stats = [
    { href: "/account/orders", label: "Orders", value: orders.length, note: paidTotal ? `${formatINR(paidTotal)} spent` : "No orders yet", icon: Package },
    { href: "/account/orders", label: "In progress", value: active.length, note: active.length ? "On their way to you" : "Nothing pending", icon: Truck },
    { href: "/wishlist", label: "Wishlist", value: wishlist.length, note: "Saved favourites", icon: Heart },
    { href: "/account/addresses", label: "Addresses", value: savedAddresses.length, note: "For faster checkout", icon: MapPin },
  ];

  return (
    <>
      {/* Stats */}
      <section aria-labelledby="stats-h">
        <h2 id="stats-h" className="sr-only">Account summary</h2>
        <ul className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className="group block h-full bg-white border border-brand-border hover:border-brand-gold rounded-3xl p-4 sm:p-5 shadow-card hover:shadow-cardHover transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-semibold text-neutral-600 font-poppins">{s.label}</span>
                    <span className="w-9 h-9 rounded-full bg-brand-goldPale flex items-center justify-center text-brand-maroon group-hover:scale-110 transition-transform motion-reduce:transition-none">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                  <p className="text-3xl font-serif mt-2">{s.value}</p>
                  <p className="text-xs text-neutral-600 mt-0.5 truncate">{s.note}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Profile completeness (hidden once everything is done) */}
      {doneCount < checklist.length && (
        <section aria-labelledby="complete-h" className="bg-white border border-brand-gold/40 rounded-3xl p-5 sm:p-6 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="complete-h" className="text-lg font-serif">Complete your profile</h2>
            <span className="text-sm font-semibold text-brand-maroon">{percent}% done</span>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="mt-3 h-2 rounded-full bg-brand-cream overflow-hidden"
          >
            <div className="h-full bg-gold-gradient rounded-full transition-all motion-reduce:transition-none" style={{ width: `${percent}%` }} />
          </div>
          <ul className="mt-4 space-y-1">
            {checklist.map((c) => (
              <li key={c.label}>
                {c.done ? (
                  <p className="flex items-center gap-2.5 min-h-[40px] text-sm text-neutral-500">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span><span className="sr-only">Done: </span><s>{c.label}</s></span>
                  </p>
                ) : (
                  <Link href={c.href} className="flex items-center gap-2.5 min-h-[44px] text-sm text-brand-text hover:text-brand-maroon group">
                    <Circle className="w-5 h-5 text-brand-gold shrink-0" aria-hidden="true" />
                    <span className="underline-offset-2 group-hover:underline">{c.label}</span>
                    <ArrowRight className="w-4 h-4 ml-auto text-brand-gold" aria-hidden="true" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* Recent orders */}
        <section aria-labelledby="recent-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 id="recent-h" className="text-lg font-serif">Recent orders</h2>
            {orders.length > 0 && (
              <Link href="/account/orders" className="inline-flex items-center gap-1 min-h-[44px] text-xs font-semibold text-brand-maroon hover:text-brand-gold font-poppins uppercase tracking-wider">
                View all<span className="sr-only"> {orders.length} orders</span> <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            )}
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-brand-ivory border border-dashed border-brand-border">
              <ShoppingBag className="w-10 h-10 text-brand-gold mx-auto mb-3" aria-hidden="true" />
              <p className="text-sm text-neutral-700">You have not placed an order yet.</p>
              <Link href="/shop" className="btn-primary inline-flex mt-4 px-6 min-h-[44px] text-xs rounded-full font-poppins font-semibold shadow-md">
                Explore sarees
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-brand-border">
              {orders.slice(0, 3).map((order) => (
                <li key={order.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex -space-x-3 shrink-0" aria-hidden="true">
                    {order.items.slice(0, 3).map((it, idx) => (
                      <img key={idx} src={it.imageUrl} alt="" className="w-12 h-14 object-cover rounded-xl border-2 border-white shadow-sm" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {order.items[0]?.productName}
                      {order.items.length > 1 && <span className="text-neutral-500 font-normal"> + {order.items.length - 1} more</span>}
                    </p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      <span className="font-mono">{order.orderNumber}</span> · {formatDate(order.createdAt)} · <strong className="text-brand-maroon">{formatINR(order.totalAmount)}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusTone(order.orderStatus)}`}>{orderStatusLabel(order.orderStatus)}</span>
                    <Link
                      href={`/account/track/${order.orderNumber}`}
                      className="inline-flex items-center min-h-[44px] px-4 rounded-full border border-brand-border hover:border-brand-gold text-xs font-semibold font-poppins"
                    >
                      Track<span className="sr-only"> order {order.orderNumber}</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          {/* Personal details */}
          <section aria-labelledby="details-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 id="details-h" className="text-lg font-serif">Personal details</h2>
              <Link href="/account/settings" className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs font-semibold text-brand-maroon hover:text-brand-gold">
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Edit<span className="sr-only"> personal details</span>
              </Link>
            </div>
            <dl className="space-y-2.5 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Name</dt>
                <dd className="font-medium">{user.fullName}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Email</dt>
                <dd className="font-medium break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Mobile</dt>
                <dd className="font-medium">{user.phone ? `+91 ${user.phone}` : <span className="text-neutral-500 font-normal">Not added</span>}</dd>
              </div>
              {user.secondaryPhone && (
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-neutral-500">Secondary mobile</dt>
                  <dd className="font-medium">+91 {user.secondaryPhone}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* Default address */}
          <section aria-labelledby="addr-h" className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 shadow-card">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 id="addr-h" className="text-lg font-serif">Delivery address</h2>
              <Link href="/account/addresses" className="inline-flex items-center gap-1 min-h-[44px] px-2 text-xs font-semibold text-brand-maroon hover:text-brand-gold">
                Manage<span className="sr-only"> addresses</span> <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>
            {defaultAddress ? (
              <div className="text-sm text-neutral-700 space-y-1">
                <p className="flex items-center gap-2 font-semibold text-brand-text">
                  {defaultAddress.type === "Office" ? <Briefcase className="w-4 h-4 text-brand-gold" aria-hidden="true" /> : defaultAddress.type === "Other" ? <MapPin className="w-4 h-4 text-brand-gold" aria-hidden="true" /> : <Home className="w-4 h-4 text-brand-gold" aria-hidden="true" />}
                  {defaultAddress.name}
                  {defaultAddress.isDefault && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-goldPale text-brand-maroon font-bold">Default</span>}
                </p>
                <p>{[defaultAddress.houseNumber, defaultAddress.street, defaultAddress.locality].filter(Boolean).join(", ")}</p>
                <p>
                  {defaultAddress.city}, {defaultAddress.state} – {defaultAddress.pincode}
                </p>
              </div>
            ) : (
              <Link href="/account/addresses?new=1" className="flex items-center justify-center gap-2 min-h-[56px] rounded-2xl border-2 border-dashed border-brand-border hover:border-brand-gold text-sm font-semibold text-brand-maroon">
                <MapPin className="w-4 h-4" aria-hidden="true" /> Add your first address
              </Link>
            )}
          </section>

          {/* Help */}
          <Link
            href="/account/support"
            className="flex items-center gap-3 bg-brand-goldPale/60 border border-brand-gold/30 rounded-3xl p-5 hover:border-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
          >
            <LifeBuoy className="w-6 h-6 text-brand-maroon shrink-0" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold">Need help with an order?</span>
              <span className="block text-xs text-neutral-600">Raise a query and we will reply by email.</span>
            </span>
            <ArrowRight className="w-4 h-4 ml-auto text-brand-maroon" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </>
  );
}
