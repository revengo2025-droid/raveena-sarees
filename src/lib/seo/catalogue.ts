import { getPublicCatalogue } from "@/lib/products/public";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "@/lib/mockData";
import type { SareeProduct } from "@/lib/types";

/** Server-side product list for SEO surfaces: live database catalogue when available, else the bundled starter catalogue. */
export async function getSeoProducts(): Promise<SareeProduct[]> {
  const live = await getPublicCatalogue();
  return live?.products ?? INITIAL_PRODUCTS;
}

export async function getSeoProductBySlug(slug: string): Promise<SareeProduct | undefined> {
  return (await getSeoProducts()).find((p) => p.slug === slug);
}

export function getSeoCategoryBySlug(slug: string) {
  return INITIAL_CATEGORIES.find((c) => c.slug === slug);
}

export const absoluteUrl = (siteUrl: string, path: string) =>
  /^https?:\/\//i.test(path) ? path : `${siteUrl}${path.startsWith("/") ? "" : "/"}${path}`;
