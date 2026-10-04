"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ShoppingBag,
  Heart,
  User,
  Search,
  Menu,
  X,
  LogOut,
  Settings,
  ArrowRight,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const {
    cart,
    wishlist,
    setIsCartDrawerOpen,
    categories,
    products,
    user,
    logout,
    login,
  } = useApp();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Cart total items count
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Handle click outside for search and user dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter products for search autocomplete
  const searchResults = searchQuery.trim()
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.fabric.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.occasion.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/shop?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const navLinks = [
    { label: "All Sarees", href: "/shop" },
    { label: "Silk Sarees", href: "/category/silk-sarees" },
    { label: "Party Wear", href: "/category/party-wear-sarees" },
    { label: "Designer", href: "/category/designer-sarees" },
    { label: "Bridal", href: "/category/wedding-sarees" },
    { label: "Our Story", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <div className="sticky top-0 sm:top-2.5 z-50 w-full sm:px-4 lg:px-6 pointer-events-none transition-all duration-500">
      <header
        className={`pointer-events-auto max-w-7xl mx-auto transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative ${
          isScrolled
            ? "glass-dock-scrolled rounded-none sm:rounded-2xl lg:rounded-3xl"
            : "glass-dock rounded-none sm:rounded-2xl lg:rounded-3xl"
        }`}
      >
        {/* Specular golden & white refraction light lines */}
        <div className="absolute inset-x-6 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none opacity-90" />
        <div className="absolute inset-x-8 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#C8A24D]/40 to-transparent pointer-events-none opacity-75" />

        <div className="px-4 sm:px-6 lg:px-7">
          <nav
            className={`flex items-center justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isScrolled ? "h-14 md:h-[64px]" : "h-16 md:h-[72px]"
            }`}
          >
            {/* Left: Logo */}
            <Link href="/" className="group flex items-center select-none shrink-0 py-1">
              <img
                src="/images/logo/raveena-logo-light.png"
                alt="Raveena Sarees"
                className={`w-auto object-contain transition-all duration-500 ease-out group-hover:scale-105 ${
                  isScrolled ? "h-8 sm:h-9 md:h-10" : "h-9 sm:h-10 md:h-11"
                }`}
              />
            </Link>

            {/* Center: Nav Links (Desktop) */}
            <div className="hidden lg:flex items-center gap-1.5 xl:gap-2">
              {navLinks.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`relative px-4 py-1.5 rounded-full text-[13px] font-body font-medium tracking-wide transition-all duration-300 ${
                      isActive
                        ? "glass-nav-link-active font-semibold"
                        : "glass-nav-link text-brand-text hover:text-brand-gold"
                    }`}
                  >
                    {link.label}
                    {isActive && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-brand-gold rounded-full shadow-[0_0_8px_rgba(200,162,77,0.9)]" />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right: Action Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Search */}
              <div className="relative" ref={searchRef}>
                <button
                  onClick={() => setIsSearchOpen(!isSearchOpen)}
                  className="glass-orb-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-brand-text hover:text-brand-gold focus:outline-none"
                  aria-label="Search Sarees"
                >
                  <Search className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                </button>

                {isSearchOpen && (
                  <div className="absolute right-0 top-12 sm:top-14 w-80 sm:w-96 glass-dropdown rounded-2xl z-50 animate-fadeIn overflow-hidden">
                    <div className="p-4">
                      <form onSubmit={handleSearchSubmit} className="relative">
                        <input
                          type="text"
                          placeholder="Search Kanjivaram, Banarasi, Silk..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                          className="w-full bg-white/50 backdrop-blur-xl border border-white/80 rounded-full py-2.5 pl-10 pr-4 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-gold focus:bg-white/75 focus:ring-2 focus:ring-brand-gold/15 transition-all font-body shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]"
                        />
                        <Search className="w-4 h-4 text-brand-gold absolute left-3.5 top-3" />
                      </form>

                      {searchResults.length > 0 && (
                        <div className="mt-3 divide-y divide-black/[0.06] pt-1">
                          <p className="text-[10px] uppercase tracking-widest text-brand-gold font-semibold pb-2 font-button">
                            Results
                          </p>
                          {searchResults.map((item) => (
                            <Link
                              key={item.id}
                              href={`/product/${item.slug}`}
                              className="flex items-center gap-3 py-2.5 hover:bg-black/[0.04] px-2 rounded-lg transition-colors group"
                            >
                              <img
                                src={item.images[0]}
                                alt={item.name}
                                className="w-10 h-12 object-cover rounded-lg border border-white/80 group-hover:border-brand-gold/60 transition-colors shadow-sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-heading text-brand-text truncate group-hover:text-brand-gold transition-colors">
                                  {item.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-sm text-brand-gold font-semibold font-body">
                                    {formatINR(item.discountPrice || item.price)}
                                  </span>
                                  <span className="text-[11px] text-brand-textMuted">
                                    • {item.fabric}
                                  </span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="glass-orb-btn relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-brand-text hover:text-brand-gold"
                aria-label="View Wishlist"
              >
                <Heart className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-brand-gold text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-button shadow-sm border border-white">
                    {wishlist.length}
                  </span>
                )}
              </Link>

              {/* User */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="glass-orb-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-brand-text hover:text-brand-gold focus:outline-none"
                  aria-label="User Account"
                >
                  <User className="w-4 h-4 sm:w-[17px] sm:h-[17px]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-12 sm:top-14 w-64 glass-dropdown rounded-2xl z-50 animate-fadeIn overflow-hidden">
                    <div className="py-3 px-3 divide-y divide-black/[0.06]">
                      {user ? (
                        <>
                          <div className="pb-3 px-1">
                            <p className="text-sm font-heading font-semibold text-brand-text">{user.fullName}</p>
                            <p className="text-xs text-brand-textMuted truncate font-body">{user.email}</p>
                            <span className="inline-block mt-1.5 text-[9px] uppercase font-bold tracking-widest px-2.5 py-0.5 bg-brand-goldPale text-brand-gold rounded-full border border-brand-gold/30 font-button">
                              {user.role === "admin" ? "Administrator" : "Member"}
                            </span>
                          </div>
                          <div className="py-2 text-sm space-y-0.5">
                            <Link href="/account" className="block px-3 py-2 text-brand-textSecondary hover:bg-black/[0.04] hover:text-brand-gold rounded-lg transition-colors font-body">
                              My Account
                            </Link>
                            <Link href="/account/orders" className="block px-3 py-2 text-brand-textSecondary hover:bg-black/[0.04] hover:text-brand-gold rounded-lg transition-colors font-body">
                              Orders
                            </Link>
                            <Link href="/account/addresses" className="block px-3 py-2 text-brand-textSecondary hover:bg-black/[0.04] hover:text-brand-gold rounded-lg transition-colors font-body">
                              Addresses
                            </Link>
                            {user.role === "admin" && (
                              <Link href="/admin" className="flex items-center gap-2 px-3 py-2 text-brand-gold bg-brand-goldPale hover:bg-brand-gold/20 rounded-lg font-medium transition-colors font-body">
                                <Settings className="w-3.5 h-3.5" />
                                Admin Panel
                              </Link>
                            )}
                          </div>
                          <div className="pt-2">
                            <button
                              onClick={() => { logout(); setUserDropdownOpen(false); }}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors font-body"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              Sign Out
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="p-2 space-y-2.5">
                          <p className="text-sm text-brand-textSecondary leading-relaxed font-body">
                            Sign in for wishlist & personalized recommendations.
                          </p>
                          <Link
                            href="/auth/login"
                            onClick={() => setUserDropdownOpen(false)}
                            className="btn-primary block w-full text-center !py-2.5 !text-[11px]"
                          >
                            Sign In
                          </Link>
                          <Link
                            href="/auth/register"
                            onClick={() => setUserDropdownOpen(false)}
                            className="btn-secondary block w-full text-center !py-2 !text-[10px]"
                          >
                            Create Account
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="glass-bag-btn relative flex items-center gap-1.5 text-white pl-4 pr-3 py-2 rounded-full group ml-1"
                aria-label="Open Shopping Bag"
              >
                <span className="text-[11px] font-button font-semibold tracking-wider uppercase hidden sm:inline text-white/95">
                  Bag
                </span>
                <ShoppingBag className="w-4 h-4" />
                {cartItemCount > 0 && (
                  <span className="bg-brand-maroon text-white font-bold text-[9px] w-4.5 h-4.5 min-w-[18px] min-h-[18px] rounded-full flex items-center justify-center font-button shadow-sm border-2 border-white ml-0.5">
                    {cartItemCount}
                  </span>
                )}
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden glass-orb-btn w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-brand-text hover:text-brand-gold focus:outline-none ml-1"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* ─── MOBILE MENU DRAWER ─── */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/60 bg-white/80 backdrop-blur-3xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] rounded-b-2xl sm:rounded-b-3xl animate-fadeIn">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="space-y-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-4 py-3 text-sm font-body font-medium rounded-xl transition-all ${
                        isActive
                          ? "glass-nav-link-active font-semibold"
                          : "text-brand-text hover:text-brand-gold hover:bg-white/40"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
              <div className="pt-4 mt-4 border-t border-black/[0.06] flex items-center gap-4">
                <a href="tel:+918688472300" className="text-sm text-brand-textMuted font-body hover:text-brand-gold transition-colors">
                  📞 +91 86884 72300
                </a>
              </div>
            </div>
          </div>
        )}
      </header>
    </div>
  );
};
