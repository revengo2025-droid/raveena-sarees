import { describe, expect, it } from "vitest";
import { checkBannerDimensions, parseBannerFields, validateBannerLink } from "@/lib/hero/validation";
import { isRenderableBannerUrl, mapHeroRow } from "@/lib/hero/mapper";
import { DEFAULT_HERO_BANNERS } from "@/lib/hero/defaults";
import { findOccasionOption, occasionMatches, occasionText } from "@/lib/occasions";
import { addedLabel, budgetTiers, latestDrop, rankTrending, trendingScore } from "@/lib/trending";
import type { SareeProduct } from "@/lib/types";

describe("hero banner links", () => {
  it("accepts internal paths and defaults an empty link to the shop", () => {
    for (const ok of ["/", "/shop", "/category/silk-sarees", "/shop?sort=newest", "/product/abc#reviews"]) {
      expect(validateBannerLink(ok)).toEqual({ ok: true, value: ok });
    }
    expect(validateBannerLink("")).toEqual({ ok: true, value: "/shop" });
    expect(validateBannerLink("   ")).toEqual({ ok: true, value: "/shop" });
    // Surrounding whitespace is trimmed, not rejected
    expect(validateBannerLink(" /shop\n")).toEqual({ ok: true, value: "/shop" });
  });

  it("rejects anything that could leave the site or reach private areas", () => {
    for (const bad of [
      "//evil.com",
      "https://evil.com",
      "javascript:alert(1)",
      "shop",
      "/\\evil.com",
      "/ shop",
      "/sh\nop",
      "/admin",
      "/admin/orders",
      "/api/admin/hero-banners",
      "/" + "a".repeat(250),
    ]) {
      expect(validateBannerLink(bad).ok, bad).toBe(false);
    }
  });
});

describe("hero banner fields", () => {
  it("fills a default description, trims text and turns an empty button into null", () => {
    const r = parseBannerFields({ altText: "  ", linkUrl: "/shop", buttonText: "   " });
    expect(r).toEqual({ ok: true, altText: "Raveena Sarees collection", linkUrl: "/shop", buttonText: null });
    const r2 = parseBannerFields({ altText: "Festive\n  edit", linkUrl: "/category/silk-sarees", buttonText: "Shop now" });
    expect(r2).toEqual({ ok: true, altText: "Festive edit", linkUrl: "/category/silk-sarees", buttonText: "Shop now" });
  });

  it("enforces length limits", () => {
    expect(parseBannerFields({ altText: "a".repeat(201) }).ok).toBe(false);
    expect(parseBannerFields({ buttonText: "b".repeat(41) }).ok).toBe(false);
    expect(parseBannerFields({ linkUrl: "https://evil.com" }).ok).toBe(false);
  });
});

describe("hero banner image size rules", () => {
  it("passes the recommended size", () => {
    expect(checkBannerDimensions(1920, 800)).toEqual({});
    expect(checkBannerDimensions(2400, 1000)).toEqual({});
  });

  it("blocks images that are too small or the wrong shape", () => {
    expect(checkBannerDimensions(800, 333).error).toMatch(/too small/);
    expect(checkBannerDimensions(1920, 1920).error).toMatch(/not suitable/);
    expect(checkBannerDimensions(1200, 1800).error).toMatch(/not suitable/);
    expect(checkBannerDimensions(5000, 800).error).toMatch(/not suitable/);
    expect(checkBannerDimensions(0, 0).error).toBeTruthy();
  });

  it("warns, but allows, a usable image that will be cropped", () => {
    const r = checkBannerDimensions(1600, 1000);
    expect(r.error).toBeUndefined();
    expect(r.warning).toMatch(/cropped/);
  });
});

describe("hero banner rendering safety", () => {
  it("only renders local files and Supabase Storage images", () => {
    expect(isRenderableBannerUrl("/images/hero/hero-banner-2.png")).toBe(true);
    expect(isRenderableBannerUrl("https://abcd.supabase.co/storage/v1/object/public/hero-banners/x.webp")).toBe(true);
    expect(isRenderableBannerUrl("https://evil.com/x.png")).toBe(false);
    expect(isRenderableBannerUrl("http://abcd.supabase.co/x.png")).toBe(false);
    expect(isRenderableBannerUrl("//evil.com/x.png")).toBe(false);
    expect(isRenderableBannerUrl("")).toBe(false);
    expect(isRenderableBannerUrl(null)).toBe(false);
  });

  it("drops a row with a bad image instead of crashing the page", () => {
    expect(mapHeroRow({ id: "1", public_url: "https://evil.com/x.png" })).toBeNull();
    expect(mapHeroRow({ id: "2", public_url: "https://abcd.supabase.co/a.webp", alt_text: "", link_url: "", button_text: "" })).toEqual({
      id: "2",
      imageUrl: "https://abcd.supabase.co/a.webp",
      alt: "Raveena Sarees collection",
      linkUrl: "/shop",
      buttonText: null,
    });
  });

  it("always has built-in banners to fall back on", () => {
    expect(DEFAULT_HERO_BANNERS.length).toBeGreaterThan(0);
    expect(DEFAULT_HERO_BANNERS.every((b) => isRenderableBannerUrl(b.imageUrl) && b.linkUrl.startsWith("/"))).toBe(true);
    // The retired Dussehra banner must not come back through the defaults
    expect(DEFAULT_HERO_BANNERS.some((b) => /hero-banner-1/.test(b.imageUrl))).toBe(false);
  });
});

describe("occasion matching", () => {
  it("matches free-text product occasions to the shop filter options", () => {
    expect(occasionMatches("Wedding / Temple Puja / Reception", "Daily Classic / Puja")).toBe(true);
    expect(occasionMatches("Cocktail Party / Reception", "Evening Party")).toBe(true);
    expect(occasionMatches("Bridal Muhurtham / Grand Wedding / Sangeet", "Bridal / Wedding")).toBe(true);
    expect(occasionMatches("Wedding / Grand Festive / Reception", "Grand Festive")).toBe(true);
    expect(occasionMatches("Cocktail Party / Reception", "Bridal / Wedding")).toBe(false);
    expect(occasionMatches("", "Reception")).toBe(false);
    expect(occasionMatches(undefined, "Reception")).toBe(false);
  });

  it("only accepts known options from the URL", () => {
    expect(findOccasionOption("bridal / wedding")).toBe("Bridal / Wedding");
    expect(findOccasionOption("<script>")).toBeNull();
    expect(findOccasionOption("")).toBeNull();
    expect(findOccasionOption(null)).toBeNull();
  });
});

const product = (over: Partial<SareeProduct>): SareeProduct => ({
  id: "p",
  sku: "S",
  name: "Saree",
  slug: "saree",
  categoryId: "c",
  categoryName: "Silk",
  description: "",
  price: 2000,
  stock: 5,
  fabric: "Silk",
  zariType: "",
  weaveType: "",
  sareeLength: "5.5 Meters",
  blouseIncluded: true,
  blouseLength: "",
  occasion: "Wedding",
  careInstructions: "",
  availableColors: [],
  primaryColor: "",
  images: ["/a.png"],
  rating: 0,
  reviewCount: 0,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("trending ranking", () => {
  it("ranks bestsellers above plain items and keeps in-stock items first", () => {
    const plain = product({ id: "plain" });
    const best = product({ id: "best", isBestseller: true });
    const soldOutBest = product({ id: "sold", isBestseller: true, stock: 0 });
    const ranked = rankTrending([plain, soldOutBest, best]).map((p) => p.id);
    expect(ranked).toEqual(["best", "plain", "sold"]);
  });

  it("uses reviews only in proportion to how many there are", () => {
    const oneReview = product({ rating: 5, reviewCount: 1 });
    const manyReviews = product({ rating: 5, reviewCount: 40 });
    expect(trendingScore(manyReviews)).toBeGreaterThan(trendingScore(oneReview));
    expect(trendingScore(manyReviews)).toBeLessThanOrEqual(5);
  });

  it("breaks ties by newest and respects the limit", () => {
    const older = product({ id: "older", createdAt: "2026-01-01T00:00:00Z" });
    const newer = product({ id: "newer", createdAt: "2026-06-01T00:00:00Z" });
    expect(rankTrending([older, newer], 1).map((p) => p.id)).toEqual(["newer"]);
  });
});

describe("future drops", () => {
  it("lists the newest sarees first", () => {
    const list = [
      product({ id: "a", createdAt: "2026-01-01T00:00:00Z" }),
      product({ id: "c", createdAt: "2026-03-01T00:00:00Z" }),
      product({ id: "b", createdAt: "2026-02-01T00:00:00Z" }),
    ];
    expect(latestDrop(list, 2).map((p) => p.id)).toEqual(["c", "b"]);
  });

  it("labels how long ago a saree was added", () => {
    const now = new Date("2026-10-28T12:00:00Z").getTime();
    expect(addedLabel("2026-10-28T01:00:00Z", now)).toBe("Added today");
    expect(addedLabel("2026-10-27T01:00:00Z", now)).toBe("Added yesterday");
    expect(addedLabel("2026-10-23T12:00:00Z", now)).toBe("Added 5 days ago");
    expect(addedLabel("2026-10-07T12:00:00Z", now)).toBe("Added 3 weeks ago");
    expect(addedLabel("2026-06-01T12:00:00Z", now)).toBe("Added 4 months ago");
    expect(addedLabel("not a date", now)).toBe("");
  });
});

describe("occasion text from collection and tags", () => {
  it("lets a saree with a blank occasion still match through its collection", () => {
    const p = product({ occasion: "Not specified", categoryName: "Wedding Sarees", tags: ["silk"] });
    expect(occasionMatches(occasionText(p), "Bridal / Wedding")).toBe(true);
    expect(occasionMatches(occasionText(p), "Evening Party")).toBe(false);
    expect(occasionMatches(occasionText(product({ occasion: "", categoryName: "Party Wear Sarees" })), "Evening Party")).toBe(true);
  });
});

describe("budget tiers", () => {
  const priced = (...prices: number[]) => prices.map((n, i) => product({ id: `p${i}`, price: n }));

  it("adapts to a catalogue where everything is under 2000", () => {
    const tiers = budgetTiers(priced(699, 799, 850, 999, 1099, 1299, 1599));
    expect(tiers.length).toBeGreaterThanOrEqual(2);
    expect(tiers.length).toBeLessThanOrEqual(4);
    // Every step adds sarees, and the last one covers the whole catalogue
    for (let i = 1; i < tiers.length; i++) expect(tiers[i].count).toBeGreaterThan(tiers[i - 1].count);
    expect(tiers[tiers.length - 1].count).toBe(7);
    expect(tiers[tiers.length - 1].limit).toBe(2000);
  });

  it("uses the discounted price and never lists a step with no sarees", () => {
    const list = [product({ id: "a", price: 3000, discountPrice: 900 }), product({ id: "b", price: 4800 })];
    const tiers = budgetTiers(list);
    expect(tiers.map((t) => t.limit)).toEqual([1000, 5000]);
    expect(tiers.every((t) => t.count > 0)).toBe(true);
  });

  it("is empty when prices are too uniform or there are no sarees", () => {
    expect(budgetTiers([])).toEqual([]);
    expect(budgetTiers(priced(1000, 1000)).length).toBeLessThan(2);
  });

  it("thins a wide price range to four steps", () => {
    const tiers = budgetTiers(priced(400, 700, 900, 1400, 1900, 2900, 4900, 9000));
    expect(tiers).toHaveLength(4);
  });
});
