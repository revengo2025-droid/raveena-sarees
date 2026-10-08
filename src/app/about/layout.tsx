import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Our Story",
  description: `The story of ${SITE.name}: a Telangana-based saree store for weddings, festivals and everyday elegance, and how we choose what we sell.`,
  alternates: { canonical: "/about" },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
