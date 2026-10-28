import type { AdminHeroBanner, HeroBanner } from "./types";

/**
 * next/image refuses hosts that are not whitelisted in next.config.js and would crash the whole page, so a row
 * pointing anywhere else is dropped instead of rendered. Allowed: local /public files and Supabase Storage.
 */
export function isRenderableBannerUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const configured = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : "";
    return u.hostname === configured || u.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function mapHeroRow(r: any): HeroBanner | null {
  if (!r || !isRenderableBannerUrl(r.public_url)) return null;
  return {
    id: String(r.id),
    imageUrl: r.public_url,
    alt: r.alt_text || "Raveena Sarees collection",
    linkUrl: r.link_url || "/shop",
    buttonText: r.button_text || null,
  };
}

export function mapAdminHeroRow(r: any): AdminHeroBanner {
  return {
    id: String(r.id),
    imageUrl: r.public_url,
    alt: r.alt_text || "",
    linkUrl: r.link_url || "/shop",
    buttonText: r.button_text || null,
    position: Number(r.position),
    isActive: Boolean(r.is_active),
    width: r.width ?? null,
    height: r.height ?? null,
    fileSize: r.file_size ?? null,
    originalFilename: r.original_filename ?? null,
    updatedAt: r.updated_at,
  };
}
