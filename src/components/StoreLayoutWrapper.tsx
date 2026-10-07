"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { QuickViewModal } from "@/components/QuickViewModal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ToastContainer } from "@/components/ToastContainer";
import { OfferPopup } from "@/components/OfferPopup";

export function StoreLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const isCheckout = pathname?.startsWith("/checkout");

  if (isAdminRoute) {
    return (
      <>
        {children}
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:text-brand-maroon focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" className="flex-1 relative">
        {children}
      </main>
      <Footer />
      {/* Spacer so the fixed mobile bottom bar never covers the footer */}
      {!isCheckout && <div className="lg:hidden h-[calc(56px+env(safe-area-inset-bottom))]" aria-hidden="true" />}
      <CartDrawer />
      <QuickViewModal />
      <WhatsAppButton />
      {!isCheckout && <MobileBottomNav />}
      <OfferPopup />
      <ToastContainer />
    </>
  );
}
