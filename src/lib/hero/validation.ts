// Pure validation shared by the browser (instant feedback) and the server (the real gate).
import {
  HERO_ALT_MAX,
  HERO_BUTTON_MAX,
  HERO_DEFAULT_ALT,
  HERO_DEFAULT_LINK,
  HERO_IDEAL_RATIO,
  HERO_LINK_MAX,
  HERO_MAX_RATIO,
  HERO_MIN_RATIO,
  HERO_MIN_WIDTH,
  HERO_RECOMMENDED_HEIGHT,
  HERO_RECOMMENDED_WIDTH,
} from "./constants";

type Ok<T> = { ok: true } & T;
type Err = { ok: false; error: string };

/** Collapses whitespace and strips control characters. */
export function cleanText(value: unknown): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
}

/**
 * A banner may only point inside this store: one leading slash, no protocol-relative "//", no backslashes or
 * spaces, and never the API or admin areas. Empty input falls back to the shop page.
 */
export function validateBannerLink(input: unknown): Ok<{ value: string }> | Err {
  const raw = typeof input === "string" ? input.trim() : "";
  if (!raw) return { ok: true, value: HERO_DEFAULT_LINK };
  if (raw.length > HERO_LINK_MAX) return { ok: false, error: `The link is too long (max ${HERO_LINK_MAX} characters).` };
  if (!/^\/([^/\\\s]|$)/.test(raw) || /[\\\s\u0000-\u001f\u007f]/.test(raw)) {
    return { ok: false, error: "The link must be a page on this website, starting with a single “/” (for example /shop)." };
  }
  if (/^\/(api|admin)(\/|\?|#|$)/i.test(raw)) {
    return { ok: false, error: "A banner cannot link to the admin or API areas." };
  }
  return { ok: true, value: raw };
}

export interface BannerFields {
  altText: string;
  linkUrl: string;
  buttonText: string | null;
}

export function parseBannerFields(input: { altText?: unknown; linkUrl?: unknown; buttonText?: unknown }): Ok<BannerFields> | Err {
  const altText = cleanText(input.altText) || HERO_DEFAULT_ALT;
  if (altText.length > HERO_ALT_MAX) return { ok: false, error: `The description is too long (max ${HERO_ALT_MAX} characters).` };

  const buttonText = cleanText(input.buttonText);
  if (buttonText.length > HERO_BUTTON_MAX) return { ok: false, error: `The button text is too long (max ${HERO_BUTTON_MAX} characters).` };

  const link = validateBannerLink(input.linkUrl);
  if (!link.ok) return link;

  return { ok: true, altText, linkUrl: link.value, buttonText: buttonText || null };
}

/**
 * Size rules. `error` blocks the upload; `warning` lets it through but tells the admin the picture will be cropped
 * (the hero frame is 2.4:1 and the photo is centred, so an off-ratio banner loses its edges).
 */
export function checkBannerDimensions(width: number, height: number): { error?: string; warning?: string } {
  if (!width || !height) return { error: "The image size could not be read." };
  const ratio = width / height;
  if (width < HERO_MIN_WIDTH) {
    return { error: `The image is too small (${width}px wide). Use at least ${HERO_MIN_WIDTH}px wide; ${HERO_RECOMMENDED_WIDTH}×${HERO_RECOMMENDED_HEIGHT}px is ideal.` };
  }
  if (ratio < HERO_MIN_RATIO || ratio > HERO_MAX_RATIO) {
    return { error: `The shape of this image (${width}×${height}px) is not suitable for a banner. Use a wide image such as ${HERO_RECOMMENDED_WIDTH}×${HERO_RECOMMENDED_HEIGHT}px.` };
  }
  if (Math.abs(ratio - HERO_IDEAL_RATIO) / HERO_IDEAL_RATIO > 0.15) {
    return { warning: `This image is ${width}×${height}px. The banner area is wide (${HERO_RECOMMENDED_WIDTH}×${HERO_RECOMMENDED_HEIGHT}px is ideal), so the top and bottom or sides may be cropped. Check the preview before publishing.` };
  }
  return {};
}
