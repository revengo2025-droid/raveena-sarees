import { z } from "zod";

/** Offer popup configuration, stored in store_settings under key "offer_popup". */
export const offerPopupSchema = z
  .object({
    enabled: z.boolean(),
    title: z.string().trim().min(3, "Add a short headline").max(80),
    message: z.string().trim().min(5, "Describe the offer").max(240),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{0,30}$/, "Coupon codes use letters, numbers, - and _")
      .optional()
      .or(z.literal("")),
    ctaLabel: z.string().trim().max(30).optional().or(z.literal("")),
    // Same-site path ("/shop") or an https URL
    ctaUrl: z
      .string()
      .trim()
      .max(300)
      .refine((v) => v === "" || (/^\/(?!\/)/.test(v) && !/[\s<>"']/.test(v)) || /^https:\/\/[^\s<>"']+$/.test(v), "Use a path like /shop or an https:// link")
      .optional()
      .or(z.literal("")),
    terms: z.string().trim().max(160).optional().or(z.literal("")),
    startsAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
    endsAt: z.string().datetime({ offset: true }).optional().or(z.literal("")),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: "The end date must be after the start date",
    path: ["endsAt"],
  });

export type OfferPopupInput = z.infer<typeof offerPopupSchema>;

/** What the storefront receives. `version` changes on every save so a new offer is shown again. */
export interface PublicOffer {
  title: string;
  message: string;
  couponCode: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  terms: string | null;
  endsAt: string | null;
  version: string;
}

export const OFFER_SETTINGS_KEY = "offer_popup";
export const OFFER_CACHE_TAG = "offer-popup";
export const OFFER_DELAY_MS = 10_000;
