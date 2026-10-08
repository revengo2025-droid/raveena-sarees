"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
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
  LogOut,
  LifeBuoy,
  Inbox,
  ScrollText,
  ExternalLink,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { getSupportCountsAction } from "@/app/actions/admin-support";
import { MotionProvider } from "@/components/motion/MotionProvider";
import { RouteProgress } from "@/components/motion/RouteProgress";
import { ThemeToggle, type AdminTheme } from "./ThemeToggle";

const THEME_COOKIE = "adm_theme";

type NavItem = { label: string; href: string; icon: typeof Package; badge?: number; adminOnly?: boolean };

export function AdminShell({ children, role, initialTheme = "light" }: { children: React.ReactNode; role: "admin" | "staff"; initialTheme?: AdminTheme }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<AdminTheme>(initialTheme);
  const [counts, setCounts] = useState<{ newMessages: number; openTickets: number }>({ newMessages: 0, openTickets: 0 });

  const handleSignOut = () => {
    logout();
    router.replace("/auth/login");
  };

  // The choice is remembered in a cookie so the server renders the right theme on the very first paint (no flash)
  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: AdminTheme = t === "light" ? "dark" : "light";
      try {
        document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
      } catch {
        /* cookies blocked: the choice simply is not remembered */
      }
      return next;
    });
  }, []);

  // Unread badges: refreshed when the admin moves between pages; a failure just hides them
  useEffect(() => {
    let cancelled = false;
    getSupportCountsAction()
      .then((r) => {
        if (!cancelled && r.success) setCounts({ newMessages: r.newMessages, openTickets: r.openTickets });
      })
      .catch(() => {});
    setSidebarOpen(false);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSidebarOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const navItems: NavItem[] = [
    { label: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Products & Sarees", href: "/admin/products", icon: Package },
    { label: "Featured Festive Drops", href: "/admin/festive-drops", icon: Sparkles },
    { label: "Categories", href: "/admin/categories", icon: Layers },
    { label: "Orders & Shipping", href: "/admin/orders", icon: ShoppingBag },
    { label: "Customer Directory", href: "/admin/customers", icon: Users },
    { label: "Customer Queries", href: "/admin/queries", icon: LifeBuoy, badge: counts.openTickets },
    { label: "Contact Messages", href: "/admin/messages", icon: Inbox, badge: counts.newMessages },
    { label: "Promo Coupons", href: "/admin/coupons", icon: Tag },
    { label: "Review Moderation", href: "/admin/reviews", icon: Star },
    { label: "Website Settings", href: "/admin/settings", icon: Settings },
    { label: "Audit Log", href: "/admin/audit", icon: ScrollText, adminOnly: true },
  ].filter((item: NavItem) => !item.adminOnly || role === "admin");

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const sidebar = (
    <div className="flex h-full flex-col justify-between">
      <div className="min-h-0 overflow-y-auto">
        <div className="p-5 border-b border-adm-line flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/images/logo/raveena-mark.png" alt="Raveena Sarees" width={40} height={40} className="h-10 w-10 object-cover rounded-xl border border-adm-gold/40 shadow-sm" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-serif font-bold text-adm-strong tracking-[0.18em] uppercase">Raveena</span>
              <span className="text-[10px] uppercase tracking-[0.28em] text-adm-gold font-semibold">Admin Studio</span>
            </div>
          </Link>
          <button type="button" onClick={() => setSidebarOpen(false)} aria-label="Close menu" className="lg:hidden text-adm-muted hover:text-adm-strong p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav aria-label="Admin sections" className="p-3 space-y-1">
          {navItems.map((item, i) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <m.div key={item.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.3, ease: "easeOut" }}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3 px-3.5 min-h-[44px] rounded-xl text-[13px] font-medium transition-colors ${
                    active ? "text-adm-strong" : "text-adm-muted hover:text-adm-strong hover:bg-adm-raised"
                  }`}
                >
                  {active && (
                    <m.span
                      layoutId="admin-nav-pill"
                      className="absolute inset-0 rounded-xl bg-adm-gold/12 ring-1 ring-adm-gold/35"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className={`relative w-[18px] h-[18px] ${active ? "text-adm-gold" : ""}`} aria-hidden="true" />
                  <span className="relative flex-1">{item.label}</span>
                  {item.badge ? (
                    <m.span
                      key={item.badge}
                      initial={{ scale: 0.6 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="relative min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#D4AF37] text-black text-[11px] font-bold flex items-center justify-center"
                      aria-label={`${item.badge} need attention`}
                    >
                      {item.badge > 99 ? "99+" : item.badge}
                    </m.span>
                  ) : null}
                </Link>
              </m.div>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-adm-line space-y-1">
        <Link href="/" className="flex items-center gap-2 px-3.5 min-h-[44px] text-xs text-adm-muted hover:text-adm-gold transition-colors">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to storefront
        </Link>
        <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2 px-3.5 min-h-[44px] text-xs text-adm-muted hover:text-adm-danger transition-colors">
          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <MotionProvider>
      <div className="adm-root min-h-screen bg-adm-bg text-adm-text flex font-sans" data-theme={theme}>
        <RouteProgress />
        <a href="#admin-main" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[300] focus:bg-adm-surface focus:text-adm-strong focus:px-4 focus:py-2 focus:rounded-lg">
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 bg-adm-side border-r border-adm-line sticky top-0 h-screen">{sidebar}</aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <m.div key="scrim" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSidebarOpen(false)} aria-hidden="true" />
              <m.aside
                key="drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Admin menu"
                className="fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] bg-adm-side border-r border-adm-line shadow-2xl lg:hidden"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 38 }}
              >
                {sidebar}
              </m.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-30 h-16 bg-adm-side/85 backdrop-blur border-b border-adm-line px-4 sm:px-6 flex items-center justify-between gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} aria-label="Open menu" className="lg:hidden text-adm-muted hover:text-adm-strong p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-adm-muted">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-adm-ok opacity-60 animate-ping" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-adm-ok" />
              </span>
              Store online
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <Link href="/" target="_blank" className="hidden md:inline-flex items-center gap-1.5 px-3 min-h-[40px] bg-adm-surface hover:bg-adm-raised border border-adm-line2 text-adm-text text-xs rounded-full transition-colors">
                View live store <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
              <div className="text-right hidden sm:block leading-tight">
                <span className="text-xs font-semibold text-adm-strong block">{user?.fullName || "Raveena Admin"}</span>
                <span className="text-[10px] text-adm-gold font-semibold">{role === "admin" ? "Administrator" : "Staff"}</span>
              </div>
            </div>
          </header>

          <m.main
            id="admin-main"
            key={pathname}
            className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            {children}
          </m.main>
        </div>
      </div>
    </MotionProvider>
  );
}
