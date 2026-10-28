// Ranking helpers for the homepage "Trending Now" and "Future Drops" sections. Uses only fields that already exist on
// the catalogue (bestseller / featured / new-arrival flags, rating, review count, created date): nothing is invented.
import type { SareeProduct } from "@/lib/types";

/** Higher is more popular. Flags set in the admin dashboard count most; real reviews add a bounded boost. */
export function trendingScore(p: SareeProduct): number {
  const flags = (p.isBestseller ? 4 : 0) + (p.isFeatured ? 2 : 0) + (p.isNewArrival ? 1.5 : 0);
  const reviewWeight = Math.min(Math.max(p.reviewCount || 0, 0), 20) / 20;
  const reviews = Math.min(Math.max(p.rating || 0, 0), 5) * reviewWeight;
  return flags + reviews;
}

const time = (iso: string) => {
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** Top `limit` sarees, in-stock first, ties broken by newest. */
export function rankTrending(products: SareeProduct[], limit = 8): SareeProduct[] {
  return [...products]
    .sort((a, b) => {
      const stock = Number(b.stock > 0) - Number(a.stock > 0);
      if (stock !== 0) return stock;
      const score = trendingScore(b) - trendingScore(a);
      if (score !== 0) return score;
      return time(b.createdAt) - time(a.createdAt);
    })
    .slice(0, limit);
}

/** The most recently added sarees. */
export function latestDrop(products: SareeProduct[], limit = 3): SareeProduct[] {
  return [...products].sort((a, b) => time(b.createdAt) - time(a.createdAt)).slice(0, limit);
}

/** "Added today" / "Added 3 days ago" / "Added 2 weeks ago". Pass `now` in so it can run after hydration. */
export function addedLabel(iso: string, now: number): string {
  const t = time(iso);
  if (!t) return "";
  const days = Math.max(0, Math.floor((now - t) / 86_400_000));
  if (days === 0) return "Added today";
  if (days === 1) return "Added yesterday";
  if (days < 14) return `Added ${days} days ago`;
  if (days < 60) return `Added ${Math.floor(days / 7)} weeks ago`;
  return `Added ${Math.floor(days / 30)} months ago`;
}

export const effectivePrice = (p: SareeProduct) => p.discountPrice || p.price;

const PRICE_LADDER = [500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 15000, 25000];

/**
 * Up to four "Under ₹X" price steps that suit the actual catalogue: only steps that add sarees, stopping at the
 * first step that covers everything, thinned evenly if there are more than four. Fewer than two means the prices are
 * too uniform for budget steps to be useful.
 */
export function budgetTiers(products: SareeProduct[]): { limit: number; count: number }[] {
  const prices = products.map(effectivePrice).filter((n) => n > 0);
  const total = prices.length;
  const steps: { limit: number; count: number }[] = [];
  let previous = 0;
  for (const limit of PRICE_LADDER) {
    const count = prices.filter((n) => n <= limit).length;
    if (count > previous) {
      steps.push({ limit, count });
      previous = count;
    }
    if (count === total) break;
  }
  if (steps.length <= 4) return steps;
  return [0, 1, 2, 3].map((i) => steps[Math.round((i * (steps.length - 1)) / 3)]);
}
