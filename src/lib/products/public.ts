import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import type { SareeProduct } from "@/lib/types";
import { mapProductRow } from "@/lib/products/mapper";

export interface PublicCatalogue {
  products: SareeProduct[];
  /** Product ids for the two Featured Festive Drops slots, in slot order (1 then 2). */
  featuredDropIds: string[];
}

/**
 * Cookie-free, cacheable read of the public catalogue (RLS exposes active products only).
 * Returns null when Supabase is not configured or the catalogue has not been imported yet,
 * in which case the app falls back to the bundled starter catalogue.
 * Tagged "catalogue" so admin saves refresh it immediately.
 */
export const getPublicCatalogue = unstable_cache(
  async (): Promise<PublicCatalogue | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes("placeholder-project")) return null;

    try {
      const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const [productsRes, dropsRes] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true).order("created_at", { ascending: false }),
        supabase.from("featured_drops").select("slot, product_id").order("slot", { ascending: true }),
      ]);
      if (productsRes.error || !productsRes.data || productsRes.data.length === 0) return null;

      return {
        products: productsRes.data.map(mapProductRow),
        featuredDropIds: (dropsRes.data || []).map((d: { product_id: string }) => d.product_id),
      };
    } catch {
      return null;
    }
  },
  ["public-catalogue-v1"],
  { revalidate: 60, tags: ["catalogue"] }
);
