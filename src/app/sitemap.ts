import { MetadataRoute } from "next";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "@/lib/mockData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://ravinasarees.in";

  const staticPages = [
    "",
    "/shop",
    "/about",
    "/contact",
    "/faq",
    "/shipping-policy",
    "/return-policy",
    "/privacy-policy",
    "/terms",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const categoryPages = INITIAL_CATEGORIES.map((cat) => ({
    url: `${baseUrl}/category/${cat.slug}`,
    lastModified: new Date().toISOString(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const productPages = INITIAL_PRODUCTS.map((p) => ({
    url: `${baseUrl}/product/${p.slug}`,
    lastModified: p.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
