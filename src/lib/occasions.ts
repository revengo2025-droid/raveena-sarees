// Occasion matching shared by the shop filter and the homepage "Shop by Occasion" tiles, so a tile's count and
// picture always agree with what the shop shows after the click.

/** The filter options offered on the shop page. */
export const OCCASION_OPTIONS = ["Bridal / Wedding", "Grand Festive", "Evening Party", "Reception", "Daily Classic / Puja"] as const;

/**
 * Product occasions are free text such as "Wedding / Temple Puja / Reception" or "Cocktail Party / Reception", so an
 * option matches on each of its "/"-separated parts and on the last word of each part (len >= 4): "Evening Party"
 * also matches "Cocktail Party", and "Daily Classic / Puja" matches "Temple Puja".
 */
export function occasionTokens(option: string): string[] {
  const out = new Set<string>();
  for (const part of option.toLowerCase().split(/[/,&]/)) {
    const phrase = part.trim();
    if (!phrase) continue;
    out.add(phrase);
    const last = phrase.split(/\s+/).pop() || "";
    if (last.length >= 4) out.add(last);
  }
  return Array.from(out);
}

/**
 * What a product says about where it is worn: its occasion text, plus its collection name and tags. Many catalogue
 * entries leave the occasion blank, but a saree in the "Wedding Sarees" collection is still a wedding saree.
 */
export function occasionText(p: { occasion?: string; categoryName?: string; tags?: string[] }): string {
  return [p.occasion, p.categoryName, ...(p.tags || [])].filter(Boolean).join(" ");
}

export function occasionMatches(productOccasion: string | undefined, option: string): boolean {
  const hay = (productOccasion || "").toLowerCase();
  if (!hay) return false;
  return occasionTokens(option).some((t) => hay.includes(t));
}

/** Maps a ?occasion= URL value onto one of the shop's filter options (case-insensitive), or null. */
export function findOccasionOption(raw: string | null | undefined): string | null {
  const v = (raw || "").trim().toLowerCase();
  if (!v) return null;
  return OCCASION_OPTIONS.find((o) => o.toLowerCase() === v) || null;
}
