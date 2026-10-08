"use server";

import { audit } from "@/lib/security/audit";
import { revalidateTag, unstable_cache } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { OFFER_CACHE_TAG, OFFER_SETTINGS_KEY, offerPopupSchema, type OfferPopupInput, type PublicOffer } from "@/lib/offers/popup";

type StoredOffer = OfferPopupInput & { updatedAt?: string };

async function readStoredOffer(): Promise<StoredOffer | null> {
  const { data } = await createAdminClient().from("store_settings").select("value, updated_at").eq("key", OFFER_SETTINGS_KEY).maybeSingle();
  if (!data?.value) return null;
  return { ...(data.value as OfferPopupInput), updatedAt: data.updated_at };
}

/** True when the coupon exists, is active and not expired (so the popup never advertises a dead code). */
async function couponIsLive(code: string): Promise<boolean> {
  const { data } = await createAdminClient().from("coupons").select("is_active, expires_at").eq("code", code).maybeSingle();
  return Boolean(data?.is_active && (!data.expires_at || new Date(data.expires_at) > new Date()));
}

const loadActiveOffer = unstable_cache(
  async (): Promise<PublicOffer | null> => {
    try {
      const o = await readStoredOffer();
      if (!o || !o.enabled) return null;
      const now = Date.now();
      if (o.startsAt && new Date(o.startsAt).getTime() > now) return null;
      if (o.endsAt && new Date(o.endsAt).getTime() <= now) return null;
      if (o.couponCode && !(await couponIsLive(o.couponCode))) return null;
      return {
        title: o.title,
        message: o.message,
        couponCode: o.couponCode || null,
        ctaLabel: o.ctaLabel || null,
        ctaUrl: o.ctaUrl || null,
        terms: o.terms || null,
        endsAt: o.endsAt || null,
        version: o.updatedAt || "1",
      };
    } catch {
      return null;
    }
  },
  ["active-offer-popup"],
  { revalidate: 300, tags: [OFFER_CACHE_TAG] }
);

/** Public: the currently running offer, or null. Nothing is shown unless an admin configured a real offer. */
export async function getActiveOfferAction(): Promise<PublicOffer | null> {
  return loadActiveOffer();
}

export async function getOfferSettingsAction() {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  return { success: true as const, data: await readStoredOffer() };
}

export async function saveOfferSettingsAction(values: unknown) {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false as const, error: auth.error };
  const parsed = offerPopupSchema.safeParse(values);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message || "Please check the offer details." };
  const offer = parsed.data;
  if (offer.enabled && offer.couponCode && !(await couponIsLive(offer.couponCode))) {
    return { success: false as const, error: `Coupon ${offer.couponCode} does not exist or is not active. Create it under Promo Coupons first.` };
  }

  const { error } = await createAdminClient()
    .from("store_settings")
    .upsert({ key: OFFER_SETTINGS_KEY, value: offer, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { success: false as const, error: "Could not save the offer." };
  revalidateTag(OFFER_CACHE_TAG);
  await audit({ action: "settings.offer_popup", actorId: auth.userId, entityType: "store_settings", entityId: OFFER_SETTINGS_KEY, meta: { enabled: offer.enabled } });
  return { success: true as const };
}
