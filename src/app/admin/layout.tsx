"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  Star,
  Settings,
  ArrowLeft,
  Menu,
  X,
  Sparkles,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useApp } from "@/lib/store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, login } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Products & Sarees", href: "/admin/products", icon: Package },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Orders & Shipping", href: "/admin/orders", icon: ShoppingBag },
    { label: "Customer Directory", href: "/admin/customers", icon: Users },
    { label: "Promo Coupons", href: "/admin/coupons", icon: Tag },
    { label: "Review Moderation", href: "/admin/reviews", icon: Star },
    { label: "Website Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#060606] text-gray-200 flex font-sans">
      {/* 1. Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 2. Admin Sidebar */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-[#0D0D0D] border-r border-[#222] flex flex-col justify-between transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-[#1F1F1F] flex items-center justify-between">
            <Link href="/admin" className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-serif font-bold text-white tracking-widest uppercase">
                  Ravina
                </span>
                <span className="text-lg font-serif font-light text-[#D4AF37] tracking-wider uppercase">
                  Admin
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-[0.25em] text-gray-500">
                Atelier Control Panel
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20"
                      : "text-gray-400 hover:text-white hover:bg-[#161616]"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Back to Store link */}
        <div className="p-4 border-t border-[#1F1F1F] space-y-2">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-2 text-xs text-gray-400 hover:text-[#D4AF37] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
          </Link>
          <div className="text-[10px] text-gray-600 px-3.5">
            Ravina Sarees v1.0.0 • Telangana
          </div>
        </div>
      </aside>

      {/* 3. Main Admin Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-[#0B0B0B] border-b border-[#1F1F1F] px-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-400 hover:text-white p-2"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-300 font-medium">
              Flagship Atelier Online (Marthadi, Telangana)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-block px-3 py-1.5 bg-[#181818] hover:bg-[#222] border border-[#333] text-gray-300 hover:text-white text-xs rounded-lg"
            >
              View Live Store &rarr;
            </Link>
            <div className="text-right">
              <span className="text-xs font-semibold text-white block">
                {user?.fullName || "Admin Ravina"}
              </span>
              <span className="text-[10px] text-[#D4AF37]">Super Administrator</span>
            </div>
          </div>
        </header>

        {/* Page Children */}
        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
