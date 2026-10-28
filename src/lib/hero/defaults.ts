import { HERO_SLIDES } from "@/lib/mockData";
import type { HeroBanner } from "./types";

/** Shown whenever the admin has no active uploaded banner (or the database is unavailable), so the hero is never blank. */
export const DEFAULT_HERO_BANNERS: HeroBanner[] = HERO_SLIDES.map((s) => ({
  id: s.id,
  imageUrl: s.imageUrl,
  alt: s.title,
  linkUrl: s.linkUrl,
  buttonText: s.buttonText,
}));
