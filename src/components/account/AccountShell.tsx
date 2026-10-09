"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, MapPin, UserRound, LifeBuoy, Heart, LogOut, ChevronRight, UserCircle2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { Sk, SkeletonLabel } from "@/components/ui/Skeletons";

const NAV = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/settings", label: "Profile & Settings", icon: UserRound },
  { href: "/account/support", label: "Help & Support", icon: LifeBuoy },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
] as const;

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

interface Props {
  /** Page heading (the only h1 on the page). */
  title: string;
  /** One line under the heading. */
  description?: string;
  /** Buttons shown next to the heading (e.g. "Add address"). */
  actions?: React.ReactNode;
  /** Where to come back to after signing in. */
  signInRedirect?: string;
  children: React.ReactNode;
}

/**
 * Shared frame for every "My account" page: a profile card, the account navigation and the page heading.
 * Keyboard and screen-reader friendly: the navigation is a labelled landmark, the current page is marked with
 * aria-current, every target is at least 44px, and nothing relies on colour alone.
 */
export function AccountShell({ title, description, actions, signInRedirect = "/account", children }: Props) {
  const { user, authReady, logout } = useApp();
  const pathname = usePathname() || "";

  if (!authReady) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" aria-busy="true">
        <SkeletonLabel text="Loading your account" />
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          <Sk className="h-72 rounded-3xl hidden lg:block" />
          <div className="space-y-4">
            <Sk className="h-10 w-1/2 rounded-xl" />
            <Sk className="h-40 rounded-3xl" />
            <Sk className="h-40 rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center text-brand-text">
        <div className="w-16 h-16 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mb-4 text-brand-gold">
          <UserCircle2 className="w-8 h-8" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-serif mb-2">Please sign in</h1>
        <p className="text-sm text-neutral-600 max-w-sm mb-6">Sign in to see your orders, saved addresses and account settings.</p>
        <div className="flex flex-wrap items-center justify-center gap-3 font-poppins">
          <Link href={`/auth/login?redirect=${encodeURIComponent(signInRedirect)}`} className="btn-primary px-6 min-h-[44px] text-xs rounded-full font-semibold shadow-md">
            Sign In
          </Link>
          <Link href="/auth/register" className="px-6 min-h-[44px] inline-flex items-center bg-white border border-brand-border hover:border-brand-gold text-xs font-semibold rounded-full">
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  const isCurrent = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const currentLabel = NAV.find((n) => isCurrent(n.href, "exact" in n ? n.exact : false))?.label;

  return (
    <div className="bg-brand-ivory/40 min-h-screen text-brand-text font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6 lg:gap-8 items-start">
          {/* Sidebar: profile card + navigation */}
          <aside className="lg:sticky lg:top-24 space-y-4">
            <div className="relative overflow-hidden rounded-3xl bg-maroon-gradient text-white p-5 shadow-card">
              <div aria-hidden="true" className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
              <div aria-hidden="true" className="absolute -right-2 bottom-0 w-20 h-20 rounded-full bg-brand-gold/20" />
              <div className="relative flex items-center gap-3">
                <div aria-hidden="true" className="w-14 h-14 shrink-0 rounded-full bg-gold-gradient flex items-center justify-center text-lg font-serif font-semibold ring-2 ring-white/40">
                  {initialsOf(user.fullName)}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-lg leading-tight truncate">{user.fullName}</p>
                  <p className="text-xs text-white/80 truncate">{user.email}</p>
                  {user.joinedDate && <p className="text-[11px] text-brand-goldLight mt-0.5">Member since {user.joinedDate}</p>}
                </div>
              </div>
            </div>

            <nav aria-label="My account" className="bg-white border border-brand-border rounded-3xl p-2 shadow-card">
              {/* Mobile: one swipeable row. Desktop: a vertical list. */}
              <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-0.5 px-0.5 snap-x">
                {NAV.map((item) => {
                  const active = isCurrent(item.href, "exact" in item ? item.exact : false);
                  const Icon = item.icon;
                  return (
                    <li key={item.href} className="snap-start shrink-0">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-2xl text-sm whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold ${
                          active ? "bg-brand-goldPale text-brand-maroon font-semibold" : "text-neutral-700 hover:bg-brand-ivory hover:text-brand-maroon"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-brand-maroon" : "text-brand-gold"}`} aria-hidden="true" />
                        <span>{item.label}</span>
                        {active && <ChevronRight className="w-4 h-4 ml-auto hidden lg:block" aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
                <li className="snap-start shrink-0 lg:border-t lg:border-brand-border lg:mt-1 lg:pt-1">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 min-h-[44px] px-3.5 rounded-2xl text-sm whitespace-nowrap text-neutral-700 hover:bg-red-50 hover:text-red-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                  >
                    <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" /> Sign out
                  </button>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Page content */}
          <div className="min-w-0 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-1.5 font-poppins">
                  <ol className="flex items-center gap-1.5">
                    <li>
                      <Link href="/account" className="hover:text-brand-maroon underline-offset-2 hover:underline">My account</Link>
                    </li>
                    {currentLabel && currentLabel !== "Overview" && (
                      <>
                        <li aria-hidden="true">/</li>
                        <li aria-current="page" className="text-brand-text">{currentLabel}</li>
                      </>
                    )}
                  </ol>
                </nav>
                <h1 className="text-2xl sm:text-3xl font-serif text-brand-text">{title}</h1>
                {description && <p className="text-sm text-neutral-600 mt-1">{description}</p>}
              </div>
              {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
