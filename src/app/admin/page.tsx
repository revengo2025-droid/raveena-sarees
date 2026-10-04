"use client";

import React, { useState, useMemo } from "react";
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
  Eye,
  Star,
  Layers,
  BarChart3,
  Calendar,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  IndianRupee,
  UserPlus,
  ShoppingCart,
  Heart,
  Tag,
  Percent,
  MapPin,
  Phone,
  Mail,
  Globe,
  RefreshCw,
  Filter,
  Download,
  Search,
  MoreHorizontal,
  ChevronRight,
  Zap,
  Award,
  MessageSquare,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { products, orders, categories, coupons, reviews, updateOrderStatus } = useApp();
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("all");

  // ═══ CRM ANALYTICS ═══
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrdersCount = orders.length;
  const avgOrderValue = totalOrdersCount > 0 ? Math.round(totalRevenue / totalOrdersCount) : 0;
  const lowStockProducts = products.filter((p) => p.stock <= 5);
  const totalProductsInStock = products.reduce((sum, p) => sum + p.stock, 0);
  const activeProducts = products.filter((p) => p.stock > 0).length;
  const totalReviews = reviews.length;
  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : "5.0";
  const pendingOrders = orders.filter((o) => o.orderStatus === "confirmed" || o.orderStatus === "processing");
  const shippedOrders = orders.filter((o) => o.orderStatus === "shipped" || o.orderStatus === "out_for_delivery");
  const deliveredOrders = orders.filter((o) => o.orderStatus === "delivered");
  const cancelledOrders = orders.filter((o) => o.orderStatus === "cancelled");
  const codOrders = orders.filter((o) => o.paymentMethod === "cod");
  const prepaidOrders = orders.filter((o) => o.paymentMethod !== "cod");
  const activeCoupons = coupons.filter((c) => c.isActive);

  // Revenue by Month (simulated from orders)
  const monthlyRevData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const currentMonth = now.getMonth();
    // Build last 6 months data
    return Array.from({ length: 6 }, (_, i) => {
      const mIdx = (currentMonth - 5 + i + 12) % 12;
      const monthOrders = orders.filter((o) => {
        const d = new Date(o.createdAt);
        return d.getMonth() === mIdx;
      });
      const rev = monthOrders.reduce((s, o) => s + o.totalAmount, 0);
      return {
        label: months[mIdx],
        revenue: rev,
        orders: monthOrders.length,
      };
    });
  }, [orders]);

  const maxRevenue = Math.max(...monthlyRevData.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...monthlyRevData.map((d) => d.orders), 1);

  // Top Selling Products
  const productSales = useMemo(() => {
    const salesMap: Record<string, { quantity: number; revenue: number; name: string; image: string }> = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!salesMap[item.productId]) {
          salesMap[item.productId] = { quantity: 0, revenue: 0, name: item.productName, image: item.imageUrl };
        }
        salesMap[item.productId].quantity += item.quantity;
        salesMap[item.productId].revenue += item.price * item.quantity;
      });
    });
    return Object.entries(salesMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [orders]);

  // Unique Customers from orders
  const uniqueCustomers = useMemo(() => {
    const custMap: Record<string, { name: string; email: string; phone: string; city: string; state: string; orders: number; totalSpend: number; lastOrder: string }> = {};
    orders.forEach((o) => {
      const key = o.customerEmail || o.customerPhone;
      if (!custMap[key]) {
        custMap[key] = {
          name: o.customerName,
          email: o.customerEmail,
          phone: o.customerPhone,
          city: o.shippingAddress.city,
          state: o.shippingAddress.state,
          orders: 0,
          totalSpend: 0,
          lastOrder: o.createdAt,
        };
      }
      custMap[key].orders += 1;
      custMap[key].totalSpend += o.totalAmount;
      if (new Date(o.createdAt) > new Date(custMap[key].lastOrder)) {
        custMap[key].lastOrder = o.createdAt;
      }
    });
    return Object.values(custMap).sort((a, b) => b.totalSpend - a.totalSpend);
  }, [orders]);

  // Order Status Distribution for donut chart
  const statusDistribution = [
    { label: "Confirmed", count: orders.filter((o) => o.orderStatus === "confirmed").length, color: "bg-blue-400" },
    { label: "Processing", count: orders.filter((o) => o.orderStatus === "processing").length, color: "bg-yellow-400" },
    { label: "Shipped", count: orders.filter((o) => o.orderStatus === "shipped").length, color: "bg-amber-400" },
    { label: "Out for Delivery", count: orders.filter((o) => o.orderStatus === "out_for_delivery").length, color: "bg-orange-400" },
    { label: "Delivered", count: deliveredOrders.length, color: "bg-green-400" },
    { label: "Cancelled", count: cancelledOrders.length, color: "bg-red-400" },
  ].filter((s) => s.count > 0);

  return (
    <div className="space-y-8 font-sans">
      {/* ═══════════ 1. HEADER & QUICK ACTIONS ═══════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
            CRM Dashboard & Analytics
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Real-time business intelligence, customer relationship management, and operations hub.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex bg-[#1A1A1A] rounded-xl border border-[#333] overflow-hidden">
            {(["today", "week", "month", "all"] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  timeRange === range
                    ? "bg-[#D4AF37] text-black"
                    : "text-gray-400 hover:text-white hover:bg-[#222]"
                }`}
              >
                {range === "all" ? "All Time" : range}
              </button>
            ))}
          </div>

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

      {/* ═══════════ 2. KEY PERFORMANCE METRICS ═══════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-[#1A1508] to-[#0E0E0E] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-2 col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider">Total Revenue</span>
            <div className="p-2 bg-[#D4AF37]/20 text-[#D4AF37] rounded-lg">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-bold text-[#F5DE88] block">
            {formatINR(totalRevenue)}
          </span>
          <div className="flex items-center gap-1 text-[11px] text-green-400">
            <ArrowUpRight className="w-3 h-3" /> {orders.length > 0 ? `${orders.length} order${orders.length === 1 ? '' : 's'} recorded` : "Real-time ledger"}
          </div>
        </div>

        {/* Total Orders */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Orders</span>
            <div className="p-1.5 bg-[#1C1C1C] text-blue-400 rounded-lg">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{totalOrdersCount}</span>
          <span className="text-[10px] text-gray-500">BlueDart Express</span>
        </div>

        {/* Average Order Value */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">AOV</span>
            <div className="p-1.5 bg-[#1C1C1C] text-[#D4AF37] rounded-lg">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{formatINR(avgOrderValue)}</span>
          <span className="text-[10px] text-gray-500">Per Order</span>
        </div>

        {/* Active SKUs */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">SKUs</span>
            <div className="p-1.5 bg-[#1C1C1C] text-emerald-400 rounded-lg">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{activeProducts}</span>
          <span className="text-[10px] text-gray-500">{totalProductsInStock} total units</span>
        </div>

        {/* Customer Count */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span className="uppercase font-bold tracking-wider text-[10px]">Patrons</span>
            <div className="p-1.5 bg-[#1C1C1C] text-purple-400 rounded-lg">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <span className="text-2xl font-bold text-white block">{uniqueCustomers.length}</span>
          <span className="text-[10px] text-gray-500">Unique Buyers</span>
        </div>
      </div>

      {/* ═══════════ 3. REVENUE CHART + ORDER STATUS + QUICK STATS ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white">
                Revenue & Order Trend
              </h2>
              <p className="text-[10px] text-gray-500 mt-0.5">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-4 text-[10px]">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-[#AA820A] to-[#D4AF37]" /> Revenue</span>
              <span className="flex items-center gap-1.5 text-gray-400"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/50" /> Orders</span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6">
            {monthlyRevData.map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                {/* Floating Tooltip */}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 border border-brand-gold/40 text-white rounded-lg px-2.5 py-1 text-center shadow-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 whitespace-nowrap">
                  <span className="text-[10px] text-[#F5DE88] font-bold block">
                    {formatINR(bar.revenue)}
                  </span>
                  <span className="text-[9px] text-gray-400">{bar.orders} orders placed</span>
                </div>

                {/* Dual Bars Container */}
                <div className="w-full bg-[#161616] rounded-t-xl h-44 flex items-end justify-center gap-1.5 p-1.5 border border-[#262626]">
                  {/* Revenue Bar */}
                  <div
                    className="w-1/2 bg-gradient-to-t from-[#8E6C0C] via-[#B8923D] to-[#E3C36B] rounded-t-sm transition-all duration-700 group-hover:brightness-125 animate-bar-rise"
                    style={{ height: `${bar.revenue === 0 ? 0 : Math.max((bar.revenue / maxRevenue) * 100, 6)}%` }}
                    title={`Revenue: ${formatINR(bar.revenue)}`}
                  />
                  {/* Orders Bar */}
                  <div
                    className="w-1/2 bg-gradient-to-t from-blue-900 via-blue-600 to-cyan-400 rounded-t-sm transition-all duration-700 opacity-80 group-hover:opacity-100 animate-bar-rise"
                    style={{ height: `${bar.orders === 0 ? 0 : Math.max((bar.orders / maxOrders) * 100, 6)}%` }}
                    title={`Orders: ${bar.orders}`}
                  />
                </div>
                <span className="text-[11px] text-gray-300 font-medium">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Funnel & Status Breakdown */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-5">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#D4AF37]" /> Order Pipeline
          </h2>

          {/* Status Funnel */}
          <div className="space-y-3">
            {[
              { label: "Pending Action", count: pendingOrders.length, color: "from-yellow-500 to-amber-600", icon: Clock },
              { label: "In Transit", count: shippedOrders.length, color: "from-blue-500 to-cyan-600", icon: Truck },
              { label: "Delivered", count: deliveredOrders.length, color: "from-green-500 to-emerald-600", icon: CheckCircle },
              { label: "Cancelled", count: cancelledOrders.length, color: "from-red-500 to-rose-600", icon: AlertTriangle },
            ].map((stage) => {
              const percent = totalOrdersCount > 0 ? (stage.count / totalOrdersCount) * 100 : 0;
              const Icon = stage.icon;
              return (
                <div key={stage.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 flex items-center gap-1.5">
                      <Icon className="w-3 h-3" /> {stage.label}
                    </span>
                    <span className="text-white font-bold">{stage.count}</span>
                  </div>
                  <div className="w-full h-2 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${stage.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.max(percent, stage.count > 0 ? 8 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Split */}
          <div className="pt-4 border-t border-[#1F1F1F] space-y-3">
            <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Payment Split</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#161616] rounded-xl p-3 text-center">
                <span className="text-[10px] text-gray-500 block">Prepaid</span>
                <span className="text-lg font-bold text-green-400">{prepaidOrders.length}</span>
              </div>
              <div className="bg-[#161616] rounded-xl p-3 text-center">
                <span className="text-[10px] text-gray-500 block">COD</span>
                <span className="text-lg font-bold text-amber-400">{codOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="pt-3 border-t border-[#1F1F1F] flex items-center justify-between text-xs">
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block">Reviews</span>
              <span className="font-bold text-white">{totalReviews}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block">Avg Rating</span>
              <span className="font-bold text-[#F5DE88] flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" /> {avgRating}
              </span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-gray-500 block">Coupons</span>
              <span className="font-bold text-white">{activeCoupons.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════ 4. CRM CUSTOMER INSIGHTS + TOP PRODUCTS ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CRM Customer Table */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" /> Customer CRM
            </h2>
            <Link
              href="/admin/customers"
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
            >
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {uniqueCustomers.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">
              <UserPlus className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              No customer data yet. Orders will populate customer profiles automatically.
            </div>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {uniqueCustomers.slice(0, 5).map((cust, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-[#141414] rounded-xl hover:bg-[#181818] transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#AA820A] flex items-center justify-center text-black font-bold text-xs shrink-0">
                    {cust.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{cust.name}</p>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" /> {cust.city}, {cust.state}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#F5DE88] block">{formatINR(cust.totalSpend)}</span>
                    <span className="text-[10px] text-gray-500">{cust.orders} order{cust.orders > 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products Performance */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-4">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-[#D4AF37]" /> Product Performance
            </h2>
            <Link
              href="/admin/products"
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 font-semibold"
            >
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {products.map((p) => {
              const salesData = productSales.find((s) => s.id === p.id);
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-xl hover:bg-[#181818] transition-colors">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-12 h-14 object-cover rounded-lg border border-[#2E2E2E] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium line-clamp-1">{p.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500">{p.sku}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        p.stock <= 3
                          ? "bg-red-950/80 text-red-300 border border-red-800"
                          : p.stock <= 6
                          ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                          : "bg-green-950/80 text-green-300 border border-green-800"
                      }`}>
                        {p.stock} units
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-[#F5DE88] block">
                      {formatINR(p.discountPrice || p.price)}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Star className="w-2.5 h-2.5 fill-[#D4AF37] text-[#D4AF37]" />
                      {p.rating} ({p.reviewCount})
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════ 5. INVENTORY ALERTS + CATEGORY OVERVIEW + COUPONS ═══════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" /> Inventory Alerts
            </h2>
            <span className="text-xs text-amber-400 font-bold bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-800">
              {lowStockProducts.length}
            </span>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-6 text-center text-gray-500 text-xs">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
              All products are well-stocked. No alerts.
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-[#1C1C1C]">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="pt-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-500">{p.sku}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-bold text-[11px] shrink-0 ${
                    p.stock <= 2
                      ? "bg-red-950/80 text-red-300 border border-red-800"
                      : "bg-amber-950/80 text-amber-300 border border-amber-800"
                  }`}>
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          )}

          <Link
            href="/admin/products"
            className="block text-center text-xs text-[#D4AF37] hover:underline pt-2"
          >
            Manage Inventory &rarr;
          </Link>
        </div>

        {/* Category Overview */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" /> Categories
            </h2>
            <Link href="/admin/categories" className="text-[10px] text-[#D4AF37] hover:underline font-semibold">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {categories.map((cat) => {
              const catProducts = products.filter((p) => p.categoryId === cat.id);
              return (
                <div key={cat.id} className="flex items-center gap-3 p-3 bg-[#141414] rounded-xl">
                  <img
                    src={cat.imageUrl}
                    alt={cat.name}
                    className="w-10 h-10 object-cover rounded-lg border border-[#2E2E2E]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{cat.name}</p>
                    <p className="text-[10px] text-gray-500">{catProducts.length} saree{catProducts.length !== 1 ? "s" : ""}</p>
                  </div>
                  {cat.featured && (
                    <span className="text-[9px] text-[#F5DE88] bg-[#D4AF37]/10 px-1.5 py-0.5 rounded border border-[#D4AF37]/30 font-bold">
                      Featured
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Coupons */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-emerald-400" /> Active Coupons
            </h2>
            <Link href="/admin/coupons" className="text-[10px] text-[#D4AF37] hover:underline font-semibold">
              Create
            </Link>
          </div>

          <div className="space-y-3">
            {coupons.filter((c) => c.isActive).slice(0, 4).map((c) => (
              <div key={c.id} className="p-3 bg-[#141414] rounded-xl border border-[#D4AF37]/20">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#F5DE88] bg-[#1C1C1C] px-2.5 py-0.5 rounded border border-[#333]">
                    {c.code}
                  </span>
                  <span className="text-[10px] text-green-400 font-bold">Active</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 line-clamp-1">{c.description}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {c.discountType === "percentage" ? `${c.discountValue}% OFF` : `${formatINR(c.discountValue)} OFF`}
                  {" · "}Min order: {formatINR(c.minOrderValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════ 6. RECENT ORDERS TABLE ═══════════ */}
      <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#222] pb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-[#D4AF37]" /> Recent Orders & Dispatch
          </h2>
          <Link
            href="/admin/orders"
            className="text-xs text-[#D4AF37] hover:underline uppercase tracking-wider font-semibold flex items-center gap-1"
          >
            View All ({orders.length}) <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="py-12 text-center text-gray-500 text-xs">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-600" />
            <p className="text-sm text-gray-400 font-medium mb-1">No orders yet</p>
            <p>Orders from your storefront will appear here for tracking and fulfillment.</p>
          </div>
        ) : (
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
                {orders.slice(0, 10).map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#141414] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-white">{ord.orderNumber}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(ord.createdAt)}</p>
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
                    <td className="py-3.5 px-4">
                      <span className="uppercase text-[10px] text-gray-400">
                        {ord.paymentMethod}
                      </span>
                      <span className={`ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        ord.paymentStatus === "paid"
                          ? "bg-green-950/80 text-green-300"
                          : ord.paymentStatus === "pending"
                          ? "bg-amber-950/80 text-amber-300"
                          : "bg-red-950/80 text-red-300"
                      }`}>
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${
                        ord.orderStatus === "delivered"
                          ? "bg-green-950/60 text-green-300 border border-green-800"
                          : ord.orderStatus === "cancelled"
                          ? "bg-red-950/60 text-red-300 border border-red-800"
                          : "bg-amber-950/60 text-amber-300 border border-amber-800"
                      }`}>
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
        )}
      </div>

      {/* ═══════════ 7. RECENT REVIEWS + QUICK LINKS ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reviews */}
        <div className="lg:col-span-2 bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#D4AF37]" /> Latest Customer Reviews
            </h2>
            <Link href="/admin/reviews" className="text-xs text-[#D4AF37] hover:underline font-semibold">
              Moderate All
            </Link>
          </div>

          {reviews.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 text-center">No reviews yet.</p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {reviews.slice(0, 4).map((rev) => {
                const product = products.find((p) => p.id === rev.productId);
                return (
                  <div key={rev.id} className="p-4 bg-[#141414] rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{rev.userName}</span>
                        <span className="text-[10px] text-gray-500">{rev.userCity}</span>
                      </div>
                      <div className="flex items-center text-[#D4AF37]">
                        {[...Array(rev.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-[#D4AF37]" />
                        ))}
                      </div>
                    </div>
                    {rev.title && <p className="text-xs text-white font-medium">{rev.title}</p>}
                    <p className="text-[11px] text-gray-400 line-clamp-2">{rev.comment}</p>
                    {product && (
                      <p className="text-[10px] text-gray-500 italic">
                        on: {product.name.slice(0, 50)}...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Admin Links */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-white">
            Quick Actions
          </h2>

          <div className="space-y-2">
            {[
              { label: "Add New Saree", href: "/admin/products", icon: Package, desc: "Upload new handloom product" },
              { label: "Process Orders", href: "/admin/orders", icon: Truck, desc: "Manage dispatch & AWB tracking" },
              { label: "Create Coupon", href: "/admin/coupons", icon: Tag, desc: "New festive discount code" },
              { label: "Moderate Reviews", href: "/admin/reviews", icon: Star, desc: "Approve customer testimonials" },
              { label: "Add Category", href: "/admin/categories", icon: Layers, desc: "New saree weave category" },
              { label: "Store Settings", href: "/admin/settings", icon: Globe, desc: "Brand & shipping config" },
              { label: "View Live Store", href: "/", icon: Eye, desc: "Preview customer storefront" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href + action.label}
                  href={action.href}
                  target={action.label === "View Live Store" ? "_blank" : undefined}
                  className="flex items-center gap-3 p-3 bg-[#141414] hover:bg-[#1A1A1A] rounded-xl transition-colors group border border-transparent hover:border-[#D4AF37]/20"
                >
                  <div className="p-2 bg-[#1C1C1C] rounded-lg text-[#D4AF37] group-hover:bg-[#D4AF37]/20 transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium group-hover:text-[#F5DE88] transition-colors">{action.label}</p>
                    <p className="text-[10px] text-gray-500">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#D4AF37] ml-auto shrink-0 transition-colors" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
