"use client";

import React from "react";
import Link from "next/link";
import {
  DollarSign,
  ShoppingBag,
  Package,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
  CheckCircle,
  Truck,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { products, orders, categories, coupons, updateOrderStatus } = useApp();

  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const lowStockProducts = products.filter((p) => p.stock <= 5);

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
            Atelier Executive Overview
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time sales performance, handloom inventory, and order dispatch status.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/products"
            className="px-4 py-2 bg-[#D4AF37] hover:bg-[#F5DE88] text-black font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors shadow-md"
          >
            <Package className="w-3.5 h-3.5" /> Manage Sarees
          </Link>
          <Link
            href="/admin/orders"
            className="px-4 py-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333] text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
          >
            <Truck className="w-3.5 h-3.5" /> Order Fulfillment
          </Link>
        </div>
      </div>

      {/* 2. Key Metrics 4-Col Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider">Gross Sales</span>
            <div className="p-2 bg-[#1C1C1C] text-[#D4AF37] rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-[#F5DE88] block">
            {formatINR(totalRevenue)}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-green-400">
            <TrendingUp className="w-3 h-3" /> +18.4% this festive season
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider">Total Orders</span>
            <div className="p-2 bg-[#1C1C1C] text-blue-400 rounded-lg">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{totalOrdersCount}</span>
          <span className="text-[11px] text-gray-400">100% fulfilled via BlueDart</span>
        </div>

        {/* Average Order Value */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider">Average Order</span>
            <div className="p-2 bg-[#1C1C1C] text-[#D4AF37] rounded-lg">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{formatINR(avgOrderValue)}</span>
          <span className="text-[11px] text-gray-400">Premium Bridal Silk Trousseau</span>
        </div>

        {/* Active Saree Inventory */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider">Active Sarees</span>
            <div className="p-2 bg-[#1C1C1C] text-emerald-400 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{products.length} SKUs</span>
          <span className="text-[11px] text-gray-400">Across {categories.length} Handloom Weaves</span>
        </div>
      </div>

      {/* 3. Sales Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart Visualization */}
        <div className="lg:col-span-2 bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white">
              Festive Revenue Trajectory (₹ Lakhs)
            </h2>
            <span className="text-xs text-[#D4AF37]">Hyderabad & Pan-India</span>
          </div>

          {/* Simple Clean Bar Visualizer */}
          <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {[
              { label: "Oct", val: 45, amount: "₹4.5L" },
              { label: "Nov", val: 68, amount: "₹6.8L" },
              { label: "Dec", val: 92, amount: "₹9.2L" },
              { label: "Jan", val: 78, amount: "₹7.8L" },
              { label: "Feb", val: 115, amount: "₹11.5L" },
              { label: "Mar (Proj)", val: 140, amount: "₹14.0L" },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                <span className="text-[10px] text-gray-400 group-hover:text-[#F5DE88]">
                  {bar.amount}
                </span>
                <div className="w-full bg-[#1A1A1A] rounded-t-lg h-36 flex items-end overflow-hidden p-1">
                  <div
                    className="w-full bg-gradient-to-t from-[#AA820A] to-[#D4AF37] rounded-t transition-all duration-500 group-hover:brightness-125"
                    style={{ height: `${(bar.val / 140) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-300 font-medium">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Low Stock Alerts
            </h2>
            <span className="text-xs text-amber-400 font-bold">{lowStockProducts.length}</span>
          </div>

          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-[#1C1C1C]">
            {lowStockProducts.map((p) => (
              <div key={p.id} className="pt-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-500">{p.sku}</p>
                </div>
                <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded font-bold text-[11px] shrink-0">
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>

          <Link
            href="/admin/products"
            className="block text-center text-xs text-[#D4AF37] hover:underline pt-2"
          >
            Adjust Loom Stock &rarr;
          </Link>
        </div>
      </div>

      {/* 4. Recent Orders Table with 1-Click Status Update */}
      <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white">
            Recent Orders & Dispatch Status
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs text-[#D4AF37] hover:underline uppercase tracking-wider font-semibold"
          >
            View All ({orders.length}) &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 bg-[#161616] border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Order Number</th>
                <th className="py-3 px-4">Patron</th>
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {orders.slice(0, 5).map((ord) => (
                <tr key={ord.id} className="hover:bg-[#141414] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-white">
                    {ord.orderNumber}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-white font-medium">{ord.customerName}</p>
                    <p className="text-[10px] text-gray-500">{ord.customerPhone}</p>
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">
                    {ord.shippingAddress.city}, {ord.shippingAddress.state}
                  </td>
                  <td className="py-3.5 px-4 text-gray-300">
                    {ord.items.length} Saree(s)
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#F5DE88]">
                    {formatINR(ord.totalAmount)}
                  </td>
                  <td className="py-3.5 px-4 uppercase text-gray-400 text-[10px]">
                    {ord.paymentMethod} ({ord.paymentStatus})
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded text-[10px] uppercase font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
                      {ord.orderStatus.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={ord.orderStatus}
                      onChange={(e) => updateOrderStatus(ord.id, e.target.value as any)}
                      className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-[#D4AF37]"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
