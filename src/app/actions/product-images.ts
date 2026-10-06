"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { mapImageRow } from "@/lib/products/mapper";
import { normaliseImageOrder, removeStorageObjects, syncProductImages } from "@/lib/products/images";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function loadImage(imageId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("product_images").select("*").eq("id", imageId).maybeSingle();
  return { admin, image: data };
}

export async function listProductImagesAction(productId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (!UUID_RE.test(productId)) return { success: false as const, error: "Invalid product." };
  const { data, error } = await createAdminClient()
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });
  if (error) return { success: false as const, error: GENERIC_ERROR };
  return { success: true as const, data: (data || []).map(mapImageRow) };
}

export async function deleteProductImageAction(imageId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (!UUID_RE.test(imageId)) return { success: false as const, error: "Invalid image." };
  try {
    const { admin, image } = await loadImage(imageId);
    if (!image) return { success: false as const, error: "Image not found." };

    const { error } = await admin.from("product_images").delete().eq("id", imageId);
    if (error) return { success: false as const, error: GENERIC_ERROR };
    await removeStorageObjects(admin, [image.storage_path]);

    await normaliseImageOrder(admin, image.product_id);
    await syncProductImages(admin, image.product_id);
    console.info(`[image-delete] image=${imageId} by=${auth.userId}`);
    return { success: true as const };
  } catch (err) {
    console.error("[image-delete] failed:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}

export async function setPrimaryImageAction(imageId: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (!UUID_RE.test(imageId)) return { success: false as const, error: "Invalid image." };
  try {
    const { admin, image } = await loadImage(imageId);
    if (!image) return { success: false as const, error: "Image not found." };

    const { data: rows } = await admin
      .from("product_images")
      .select("id")
      .eq("product_id", image.product_id)
      .order("display_order", { ascending: true });
    const ordered = [imageId, ...(rows || []).map((r) => r.id).filter((id) => id !== imageId)];

    await admin.from("product_images").update({ is_primary: false }).eq("product_id", image.product_id);
    await admin.from("product_images").update({ is_primary: true }).eq("id", imageId);
    await normaliseImageOrder(admin, image.product_id, ordered);
    await syncProductImages(admin, image.product_id);
    return { success: true as const };
  } catch (err) {
    console.error("[image-primary] failed:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}

export async function reorderProductImagesAction(productId: string, orderedIds: string[]) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (!UUID_RE.test(productId) || !Array.isArray(orderedIds) || !orderedIds.every((id) => UUID_RE.test(id))) {
    return { success: false as const, error: "Invalid request." };
  }
  try {
    const admin = createAdminClient();
    await normaliseImageOrder(admin, productId, orderedIds);
    await syncProductImages(admin, productId);
    return { success: true as const };
  } catch (err) {
    console.error("[image-reorder] failed:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}

export async function updateImageAltTextAction(imageId: string, altText: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  if (!UUID_RE.test(imageId)) return { success: false as const, error: "Invalid image." };
  const { error } = await createAdminClient()
    .from("product_images")
    .update({ alt_text: altText.trim().slice(0, 200) || null })
    .eq("id", imageId);
  if (error) return { success: false as const, error: GENERIC_ERROR };
  return { success: true as const };
}
