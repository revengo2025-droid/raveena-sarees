"use client";

import React from "react";
import Link from "next/link";
import {
  User,
  Package,
  Heart,
  MapPin,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";

export default function AccountPage() {
  const { user, orders, wishlist, savedAddresses, logout, login } = useApp();

  if (!user) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <div className="w-16 h-16 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mb-4 text-brand-gold shadow-sm">
          <User className="w-8 h-8 opacity-70" />
        </div>
        <h1 className="text-2xl font-serif text-brand-text mb-2">Patron Sign In Required</h1>
        <p className="text-xs text-neutral-500 max-w-sm mb-6 font-light">
          Sign in to access your saved order history, download tax invoices, and view saved addresses.
        </p>
        <div className="flex gap-3 font-poppins">
          <Link
            href="/auth/login"
            className="btn-primary px-6 py-2.5 text-xs rounded-full font-semibold shadow-md"
          >
            Sign In / Register
          </Link>
          <button
            onClick={() => login("ananya.reddy@example.com", "customer")}
            className="px-5 py-2.5 bg-brand-ivory border border-brand-border text-brand-maroon hover:text-brand-gold text-xs font-semibold rounded-full shadow-sm"
          >
            Demo Sign In
          </button>
        </div>
      </div>
    );
  }

  const totalSpent = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* 1. Profile Header */}
      <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 shadow-card">
        <div className="flex items-center gap-4">
          <img
            src={user.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80"}
            alt={user.fullName}
            className="w-16 h-16 rounded-full object-cover border-2 border-brand-gold shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-serif text-brand-text font-semibold">
                {user.fullName}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 bg-white text-brand-maroon border border-brand-border rounded-full font-poppins shadow-sm">
                {user.role === "admin" ? "Royal Admin" : "Privilege Member"}
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5 font-light">{user.email} • {user.phone}</p>
            <p className="text-[11px] text-brand-gold font-medium mt-1 font-poppins">Patron since {user.joinedDate}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="px-4 py-2 bg-white hover:bg-red-50 text-neutral-600 hover:text-red-600 border border-brand-border text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors font-poppins shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* 2. Quick Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <Link
          href="/account/orders"
          className="p-6 bg-white border border-brand-border hover:border-brand-gold rounded-3xl transition-all shadow-card hover:shadow-luxury group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2 font-poppins">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Orders</span>
            <Package className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-bold font-serif text-brand-text block">{orders.length}</span>
          <span className="text-xs text-brand-maroon font-serif font-bold mt-1 block">Lifetime Spend: {formatINR(totalSpent)}</span>
        </Link>

        <Link
          href="/wishlist"
          className="p-6 bg-white border border-brand-border hover:border-brand-gold rounded-3xl transition-all shadow-card hover:shadow-luxury group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2 font-poppins">
            <span className="text-xs uppercase tracking-wider font-semibold">Wishlisted Sarees</span>
            <Heart className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-bold font-serif text-brand-text block">{wishlist.length}</span>
          <span className="text-xs text-neutral-500 mt-1 block font-light">View saved bridal favourites</span>
        </Link>

        <Link
          href="/account/addresses"
          className="p-6 bg-white border border-brand-border hover:border-brand-gold rounded-3xl transition-all shadow-card hover:shadow-luxury group"
        >
          <div className="flex items-center justify-between text-neutral-500 mb-2 font-poppins">
            <span className="text-xs uppercase tracking-wider font-semibold">Saved Addresses</span>
            <MapPin className="w-5 h-5 text-brand-gold group-hover:scale-110 transition-transform" />
          </div>
          <span className="text-2xl font-bold font-serif text-brand-text block">{savedAddresses.length}</span>
          <span className="text-xs text-neutral-500 mt-1 block font-light">Manage delivery addresses</span>
        </Link>
      </div>

      {/* 3. Recent Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <h2 className="text-lg font-serif text-brand-text font-semibold">Recent Orders</h2>
          <Link
            href="/account/orders"
            className="text-xs text-brand-maroon hover:text-brand-gold uppercase tracking-wider font-semibold font-poppins"
          >
            View All ({orders.length}) &rarr;
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="bg-brand-ivory p-8 rounded-3xl text-center border border-brand-border shadow-card">
            <p className="text-xs text-neutral-500 font-light">No orders placed yet.</p>
            <Link
              href="/shop"
              className="btn-primary inline-block mt-3 px-5 py-2 text-xs rounded-full font-poppins font-semibold shadow-md"
            >
              Shop New Arrivals
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 3).map((order) => (
              <div
                key={order.id}
                className="bg-white border border-brand-border hover:border-brand-gold/50 rounded-3xl p-5 space-y-4 transition-all shadow-card hover:shadow-luxury"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-brand-border pb-3">
                  <div>
                    <span className="text-neutral-500">Order: </span>
                    <strong className="text-brand-text font-mono font-bold">{order.orderNumber}</strong>
                    <span className="text-neutral-400 ml-2 font-light">({formatDate(order.createdAt)})</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-brand-ivory text-brand-maroon border border-brand-border font-poppins">
                      {order.orderStatus.replace("_", " ")}
                    </span>
                    <span className="font-bold font-serif text-brand-maroon text-sm">
                      {formatINR(order.totalAmount)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {order.items.map((it, idx) => (
                      <img
                        key={idx}
                        src={it.imageUrl}
                        alt={it.productName}
                        className="w-14 h-16 object-cover rounded-xl border border-brand-border shadow-sm"
                      />
                    ))}
                    <div className="text-xs">
                      <p className="text-brand-text font-medium">{order.items[0]?.productName}</p>
                      {order.items.length > 1 && (
                        <p className="text-[11px] text-neutral-500 font-light">
                          + {order.items.length - 1} other saree(s)
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-poppins">
                    <Link
                      href={`/account/track/${order.orderNumber}`}
                      className="px-4 py-2 bg-brand-ivory hover:bg-white border border-brand-border text-brand-text text-xs font-semibold rounded-full shadow-sm transition-colors"
                    >
                      Track Order
                    </Link>
                    <Link
                      href={`/checkout/success?orderNumber=${order.orderNumber}`}
                      className="px-4 py-2 bg-white hover:bg-brand-ivory border border-brand-gold/60 text-brand-maroon text-xs font-semibold rounded-full shadow-sm transition-colors"
                    >
                      Tax Invoice
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
