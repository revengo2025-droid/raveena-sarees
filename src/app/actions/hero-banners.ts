"use server";

import { audit } from "@/lib/security/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { HERO_BANNER_BUCKET } from "@/lib/hero/constants";
import { mapAdminHeroRow } from "@/lib/hero/mapper";
import { revalidateHeroBanners } from "@/lib/hero/revalidate";
import { parseBannerFields } from "@/lib/hero/validation";
import type { AdminHeroBanner } from "@/lib/hero/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERIC_ERROR = "Something went wrong. Please try again.";
const SETUP_ERROR = "Hero banners are not set up yet. Run migration 010 in Supabase, then refresh this page.";
const COLUMNS = "id, position, public_url, storage_path, alt_text, link_url, button_text, is_active, width, height, file_size, original_filename, updated_at";

type Fail = { success: false; error: string };

function isMissingSetup(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return ["42P01", "42883", "PGRST205", "PGRST202"].includes(error.code || "") || /homepage_banners.*(does not exist|schema cache)/i.test(error.message || "");
}

/** Every banner (active and hidden) in display order, for the dashboard. */
export async function getHeroBannersAdminAction(): Promise<{ success: true; banners: AdminHeroBanner[] } | Fail> {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const { data, error } = await createAdminClient().from("homepage_banners").select(COLUMNS).order("position", { ascending: true });
    if (error) {
      if (isMissingSetup(error)) return { success: false, error: SETUP_ERROR };
      console.error("[hero-banners] load failed:", error.message);
      return { success: false, error: GENERIC_ERROR };
    }
    return { success: true, banners: (data || []).map(mapAdminHeroRow) };
  } catch (err) {
    console.error("[hero-banners] load error:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Edits a banner's text, link and visibility. The picture itself is replaced through the upload endpoint. */
export async function updateHeroBannerAction(
  id: string,
  input: { altText: string; linkUrl: string; buttonText: string; isActive: boolean }
): Promise<{ success: true; banner: AdminHeroBanner } | Fail> {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { success: false, error: "Invalid banner." };

  const parsed = parseBannerFields(input || {});
  if (!parsed.ok) return { success: false, error: parsed.error };

  try {
    const { data, error } = await createAdminClient()
      .from("homepage_banners")
      .update({
        alt_text: parsed.altText,
        link_url: parsed.linkUrl,
        button_text: parsed.buttonText,
        is_active: Boolean(input?.isActive),
        updated_by: auth.userId,
      })
      .eq("id", id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) {
      if (isMissingSetup(error)) return { success: false, error: SETUP_ERROR };
      console.error("[hero-banners] update failed:", error.message);
      return { success: false, error: "Could not save the changes. Please try again." };
    }
    if (!data) return { success: false, error: "That banner no longer exists. Refresh the page." };

    revalidateHeroBanners();
    await audit({ action: "settings.hero_banners", actorId: auth.userId, entityType: "hero_banner", entityId: id, meta: { op: "update", active: Boolean(input?.isActive) } });
    return { success: true, banner: mapAdminHeroRow(data) };
  } catch (err) {
    console.error("[hero-banners] update error:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Moves a banner one place earlier or later. Positions are rewritten atomically by save_homepage_banner_order(). */
export async function moveHeroBannerAction(id: string, direction: "up" | "down"): Promise<{ success: true } | Fail> {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (typeof id !== "string" || !UUID_RE.test(id) || (direction !== "up" && direction !== "down")) {
    return { success: false, error: "Invalid request." };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("homepage_banners").select("id").order("position", { ascending: true });
    if (error) {
      if (isMissingSetup(error)) return { success: false, error: SETUP_ERROR };
      return { success: false, error: GENERIC_ERROR };
    }
    const ids = (data || []).map((r) => r.id as string);
    const from = ids.indexOf(id);
    if (from === -1) return { success: false, error: "That banner no longer exists. Refresh the page." };
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return { success: true }; // already at the end: nothing to do

    [ids[from], ids[to]] = [ids[to], ids[from]];
    const { error: rpcError } = await admin.rpc("save_homepage_banner_order", { p_ids: ids });
    if (rpcError) {
      console.error("[hero-banners] reorder failed:", rpcError.message);
      return { success: false, error: "Could not change the order. Please try again." };
    }

    revalidateHeroBanners();
    await audit({ action: "settings.hero_banners", actorId: auth.userId, entityType: "hero_banner", entityId: id, meta: { op: "move", direction } });
    return { success: true };
  } catch (err) {
    console.error("[hero-banners] move error:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/** Deletes a banner and its stored picture, then closes the gap in the order. */
export async function deleteHeroBannerAction(id: string): Promise<{ success: true } | Fail> {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false, error: auth.error };
  if (typeof id !== "string" || !UUID_RE.test(id)) return { success: false, error: "Invalid banner." };

  try {
    const admin = createAdminClient();
    const { data: row, error: findError } = await admin.from("homepage_banners").select("id, storage_path").eq("id", id).maybeSingle();
    if (findError) {
      if (isMissingSetup(findError)) return { success: false, error: SETUP_ERROR };
      return { success: false, error: GENERIC_ERROR };
    }
    if (!row) return { success: true }; // already gone

    const { error } = await admin.from("homepage_banners").delete().eq("id", id);
    if (error) {
      console.error("[hero-banners] delete failed:", error.message);
      return { success: false, error: "Could not delete the banner. Please try again." };
    }

    // The row is gone, so a storage or renumber hiccup must not turn into a user-facing failure.
    const { error: storageError } = await admin.storage.from(HERO_BANNER_BUCKET).remove([row.storage_path]);
    if (storageError) console.error("[hero-banners] storage remove failed:", storageError.message);
    const { error: orderError } = await admin.rpc("save_homepage_banner_order", { p_ids: [] });
    if (orderError) console.error("[hero-banners] renumber failed:", orderError.message);

    revalidateHeroBanners();
    await audit({ action: "settings.hero_banners", actorId: auth.userId, entityType: "hero_banner", entityId: id, meta: { op: "delete" } });
    return { success: true };
  } catch (err) {
    console.error("[hero-banners] delete error:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}
