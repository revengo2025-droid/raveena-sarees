"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, ShoppingBag, Store, User } from "lucide-react";
import { useApp } from "@/lib/store";

/** Fixed bottom navigation, mobile only (hidden from the lg breakpoint up). */
export function MobileBottomNav() {
  const pathname = usePathname() || "/";
  const { cart, wishlist } = useApp();
  const cartCount = cart.reduce((n, item) => n + item.quantity, 0);

  const items = [
    {
      label: "Shop",
      href: "/shop",
      icon: Store,
      active: pathname.startsWith("/shop") || pathname.startsWith("/category") || pathname.startsWith("/product"),
      count: 0,
    },
    { label: "Wishlist", href: "/wishlist", icon: Heart, active: pathname.startsWith("/wishlist"), count: wishlist.length },
    { label: "Cart", href: "/cart", icon: ShoppingBag, active: pathname.startsWith("/cart"), count: cartCount },
    {
      label: "Account",
      href: "/account",
      icon: User,
      active: pathname.startsWith("/account") || pathname.startsWith("/auth"),
      count: 0,
    },
  ];

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-brand-border shadow-[0_-4px_18px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-4 max-w-xl mx-auto">
        {items.map(({ label, href, icon: Icon, active, count }) => (
          <li key={label}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-[11px] font-body font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold ${
                active ? "text-brand-maroon" : "text-brand-textMuted hover:text-brand-gold"
              }`}
            >
              <span className="relative">
                <Icon className={`w-[22px] h-[22px] ${active ? "stroke-[2.25]" : ""}`} aria-hidden="true" />
                {count > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand-maroon text-white text-[9px] font-bold flex items-center justify-center border border-white"
                    aria-label={`${count} items`}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </span>
              <span>{label}</span>
              {active && <span className="absolute top-0 inset-x-6 h-0.5 rounded-full bg-brand-gold" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
