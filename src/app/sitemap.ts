import { MetadataRoute } from "next";
import { INITIAL_CATEGORIES } from "@/lib/mockData";
import { SITE } from "@/lib/site";
import { getSeoProducts } from "@/lib/seo/catalogue";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const products = await getSeoProducts();

  const pages: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
    { path: "", priority: 1, changeFrequency: "daily" },
    { path: "/shop", priority: 0.9, changeFrequency: "daily" },
    { path: "/about", priority: 0.5, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.6, changeFrequency: "monthly" },
    { path: "/faq", priority: 0.6, changeFrequency: "monthly" },
    { path: "/shipping-policy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/return-policy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/refund-policy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/cancellation-policy", priority: 0.4, changeFrequency: "monthly" },
    { path: "/privacy-policy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
    { path: "/cookie-policy", priority: 0.3, changeFrequency: "monthly" },
    { path: "/grievance-redressal", priority: 0.3, changeFrequency: "monthly" },
  ];

  return [
    ...pages.map((p) => ({ url: `${base}${p.path}`, changeFrequency: p.changeFrequency, priority: p.priority })),
    ...INITIAL_CATEGORIES.map((c) => ({
      url: `${base}/category/${c.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((p) => ({
      url: `${base}/product/${p.slug}`,
      ...(p.createdAt && !Number.isNaN(Date.parse(p.createdAt)) && { lastModified: new Date(p.createdAt) }),
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  ];
}
