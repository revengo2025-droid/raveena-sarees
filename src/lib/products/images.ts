import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_IMAGE_BUCKET } from "@/lib/images/constants";
import { revalidatePath, revalidateTag } from "next/cache";

/**
 * Rebuilds the denormalised products.images array (primary first, then display order)
 * so the storefront keeps reading a single column. product_images stays the source of truth.
 */
export async function syncProductImages(admin: SupabaseClient, productId: string): Promise<string[]> {
  const { data } = await admin
    .from("product_images")
    .select("public_url")
    .eq("product_id", productId)
    .order("is_primary", { ascending: false })
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  const urls = (data || []).map((r: { public_url: string }) => r.public_url);
  await admin.from("products").update({ images: urls }).eq("id", productId);
  revalidateCatalogue();
  return urls;
}

export function revalidateCatalogue() {
  try {
    revalidateTag("catalogue");
    revalidatePath("/", "layout");
  } catch {
    // Not in a request scope (e.g. scripts); safe to ignore.
  }
}

/** Re-numbers display_order 0..n-1 and guarantees exactly one primary (the first image). */
export async function normaliseImageOrder(admin: SupabaseClient, productId: string, orderedIds?: string[]) {
  const { data } = await admin
    .from("product_images")
    .select("id, is_primary, display_order, created_at")
    .eq("product_id", productId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });
  const rows = data || [];
  const ids = orderedIds
    ? [...orderedIds.filter((id) => rows.some((r) => r.id === id)), ...rows.filter((r) => !orderedIds.includes(r.id)).map((r) => r.id)]
    : rows.map((r) => r.id);

  await Promise.all(ids.map((id, i) => admin.from("product_images").update({ display_order: i }).eq("id", id)));

  const primary = rows.find((r) => r.is_primary)?.id ?? ids[0];
  if (primary) {
    await admin.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await admin.from("product_images").update({ is_primary: true }).eq("id", primary);
  }
}

export async function removeStorageObjects(admin: SupabaseClient, paths: (string | null)[]) {
  const real = paths.filter((p): p is string => Boolean(p));
  if (real.length === 0) return;
  const { error } = await admin.storage.from(PRODUCT_IMAGE_BUCKET).remove(real);
  if (error) console.error("[image-storage] remove failed:", error.message);
}
