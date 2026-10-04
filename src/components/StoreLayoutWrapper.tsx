"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { QuickViewModal } from "@/components/QuickViewModal";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ToastContainer } from "@/components/ToastContainer";

export function StoreLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

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
      <Navbar />
      <main className="flex-1 relative">{children}</main>
      <Footer />
      <CartDrawer />
      <QuickViewModal />
      <WhatsAppButton />
      <ToastContainer />
    </>
  );
}
