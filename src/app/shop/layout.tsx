import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Shop Sarees",
  description: `Browse all sarees at ${SITE.name}. Filter by category, fabric, colour, occasion and price.`,
  alternates: { canonical: "/shop" },
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
