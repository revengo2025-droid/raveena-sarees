export const HERO_BANNER_BUCKET = "hero-banners";
/** Hard cap on hero banners; also enforced by the database (position 1..5, unique). */
export const MAX_HERO_BANNERS = 5;
/** Recommended artwork size: 2.4:1, matches the storefront hero frame so nothing is cropped. */
export const HERO_RECOMMENDED_WIDTH = 1920;
export const HERO_RECOMMENDED_HEIGHT = 800;
export const HERO_IDEAL_RATIO = HERO_RECOMMENDED_WIDTH / HERO_RECOMMENDED_HEIGHT;
/** Outside this range the hero would crop the picture badly, so the upload is refused. */
export const HERO_MIN_RATIO = 1.5;
export const HERO_MAX_RATIO = 3.6;
/** A banner this narrow looks soft on desktop screens. */
export const HERO_MIN_WIDTH = 1000;
/** Stored width cap (the storefront serves resized copies through next/image). */
export const HERO_STORED_MAX_WIDTH = 2400;
export const HERO_WEBP_QUALITY = 85;
export const HERO_DEFAULT_LINK = "/shop";
export const HERO_DEFAULT_ALT = "Raveena Sarees collection";
export const HERO_ALT_MAX = 200;
export const HERO_BUTTON_MAX = 40;
export const HERO_LINK_MAX = 200;
