import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_HERO_BANNERS } from "./defaults";
import { mapHeroRow } from "./mapper";
import type { HeroBanner } from "./types";

/**
 * Cookie-free, cacheable read of the active hero banners (RLS exposes active rows only).
 * Returns null when Supabase is not configured or the query fails (for example migration 010 has not been run).
 * Tagged "hero-banners" so an admin save refreshes the storefront immediately.
 */
export const getPublicHeroBanners = unstable_cache(
  async (): Promise<HeroBanner[] | null> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key || url.includes("placeholder-project")) return null;

    try {
      const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("id, public_url, alt_text, link_url, button_text, position")
        .eq("is_active", true)
        .order("position", { ascending: true });
      if (error || !data) return null;
      return data.map(mapHeroRow).filter((b): b is HeroBanner => b !== null);
    } catch {
      return null;
    }
  },
  ["public-hero-banners-v1"],
  { revalidate: 60, tags: ["hero-banners"] }
);

/** The banners the homepage should show: the admin's active uploads, or the built-in banners when there are none. */
export async function getHomeHeroBanners(): Promise<HeroBanner[]> {
  const uploaded = await getPublicHeroBanners().catch(() => null);
  return uploaded && uploaded.length > 0 ? uploaded : DEFAULT_HERO_BANNERS;
}
