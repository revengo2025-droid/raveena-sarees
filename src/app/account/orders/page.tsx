"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Package, Truck, Printer } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";

export default function OrdersPage() {
  const { orders } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === "all") return true;
    return o.orderStatus === filterStatus;
  });

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      {/* Breadcrumb & Header */}
      <div className="mb-8 border-b border-brand-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1 font-poppins">
            <Link href="/account" className="hover:text-brand-gold">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-brand-gold font-semibold">Order History</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            My Saree Orders & Tax Invoices
          </h1>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto font-poppins">
          {["all", "confirmed", "processing", "shipped", "delivered"].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap ${
                filterStatus === st
                  ? "bg-brand-gold text-white shadow-sm"
                  : "bg-brand-ivory text-neutral-600 hover:text-brand-text border border-brand-border"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-brand-ivory border border-brand-border rounded-3xl p-12 text-center shadow-card">
          <Package className="w-12 h-12 text-brand-gold mx-auto mb-3 opacity-70" />
          <h3 className="text-lg font-serif text-brand-text mb-1 font-semibold">No Orders Found</h3>
          <p className="text-xs text-neutral-500 mb-6 font-light">
            You do not have any orders matching the &quot;{filterStatus}&quot; status.
          </p>
          <Link
            href="/shop"
            className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
          >
            Explore Royal Sarees
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white border border-brand-border rounded-3xl p-6 space-y-6 shadow-card hover:shadow-luxury transition-all"
            >
              {/* Top Order Meta */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-neutral-500 text-[11px] block font-poppins">Order Number</span>
                  <span className="font-mono font-bold text-brand-text text-sm">{order.orderNumber}</span>
                  <p className="text-neutral-400 text-[11px] font-light">Placed on {formatDate(order.createdAt)}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-neutral-500 text-[11px] block font-poppins">Courier Partner</span>
                  <span className="text-brand-text font-medium flex items-center gap-1">
                    <Truck className="w-3.5 h-3.5 text-brand-gold" /> {order.courierPartner}
                  </span>
                  <span className="text-[11px] font-mono text-brand-maroon">AWB: {order.trackingNumber}</span>
                </div>

                <div className="space-y-0.5 sm:text-right">
                  <span className="text-neutral-500 text-[11px] block font-poppins">Total Amount</span>
                  <span className="text-base font-bold font-serif text-brand-maroon block">
                    {formatINR(order.totalAmount)}
                  </span>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 font-poppins">
                    {order.orderStatus.replace("_", " ")}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="divide-y divide-brand-border">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-16 h-20 object-cover rounded-xl border border-brand-border shadow-sm"
                      />
                      <div className="text-xs space-y-1">
                        <h4 className="font-serif text-sm font-semibold text-brand-text">
                          {item.productName}
                        </h4>
                        <p className="text-neutral-500 font-light">
                          SKU: {item.sku} • Shade: <strong className="text-brand-text font-medium">{item.selectedColor}</strong> • Qty: {item.quantity}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold font-serif text-brand-maroon">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-brand-border font-poppins">
                <div className="text-xs text-neutral-500 font-light">
                  Estimated Delivery: <strong className="text-brand-text font-medium">{order.estimatedDelivery}</strong>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/account/track/${order.orderNumber}`}
                    className="px-4 py-2 bg-brand-ivory hover:bg-white border border-brand-border hover:border-brand-gold text-brand-text text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5 text-brand-gold" /> Track Live Shipment
                  </Link>

                  <Link
                    href={`/checkout/success?orderNumber=${order.orderNumber}`}
                    className="px-4 py-2 bg-white hover:bg-brand-ivory border border-brand-gold/60 text-brand-maroon text-xs font-semibold rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" /> View Invoice
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
