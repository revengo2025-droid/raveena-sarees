"use server";

import { audit } from "@/lib/security/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { INITIAL_PRODUCTS } from "@/lib/mockData";
import { mapImageRow, mapProductRow, type AdminProduct } from "@/lib/products/mapper";
import { revalidateCatalogue } from "@/lib/products/images";

const GENERIC_ERROR = "Something went wrong. Please try again.";

function isConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  return Boolean(url) && !url.includes("placeholder-project") && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Every product (including hidden ones) with its image rows, for the admin catalogue. */
export async function getAdminProductsAction(): Promise<
  { success: true; data: AdminProduct[] } | { success: false; error: string; notConfigured?: boolean }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!isConfigured()) {
    return { success: false, error: "Supabase is not configured on the server.", notConfigured: true };
  }

  try {
    const admin = createAdminClient();
    const [productsRes, imagesRes] = await Promise.all([
      admin.from("products").select("*").order("created_at", { ascending: false }),
      admin.from("product_images").select("*").order("display_order", { ascending: true }),
    ]);
    if (productsRes.error) return { success: false, error: GENERIC_ERROR };

    const imagesByProduct = new Map<string, ReturnType<typeof mapImageRow>[]>();
    for (const row of imagesRes.data || []) {
      const list = imagesByProduct.get(row.product_id) || [];
      list.push(mapImageRow(row));
      imagesByProduct.set(row.product_id, list);
    }

    return {
      success: true,
      data: (productsRes.data || []).map((row) => ({
        ...mapProductRow(row),
        isActive: Boolean(row.is_active),
        imageRows: imagesByProduct.get(row.id) || [],
      })),
    };
  } catch (err) {
    console.error("[catalogue] admin list failed:", err);
    return { success: false, error: GENERIC_ERROR };
  }
}

/**
 * One-time (re-runnable) import of the bundled starter catalogue into Supabase, so it can be
 * managed from the dashboard. Existing products (matched by SKU) are never overwritten.
 * Ratings / review counts are NOT imported: they start at zero until real reviews exist.
 */
export async function importStarterCatalogueAction() {
  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return { success: false as const, error: auth.error };
  await audit({ action: "catalogue.import", actorId: auth.userId, entityType: "catalogue" });
  if (!isConfigured()) return { success: false as const, error: "Supabase is not configured on the server." };

  try {
    const admin = createAdminClient();
    const { data: existing } = await admin.from("products").select("sku");
    const have = new Set((existing || []).map((r: { sku: string }) => r.sku));
    const fresh = INITIAL_PRODUCTS.filter((p) => !have.has(p.sku));

    let imported = 0;
    if (fresh.length > 0) {
      const { data, error } = await admin
        .from("products")
        .insert(
          fresh.map((p) => ({
            sku: p.sku,
            name: p.name,
            slug: p.slug,
            category_id: null,
            category_name: p.categoryName,
            description: p.description,
            price: p.price,
            discount_price: p.discountPrice ?? null,
            stock: p.stock,
            fabric: p.fabric,
            zari_type: p.zariType,
            weave_type: p.weaveType,
            saree_length: p.sareeLength,
            blouse_included: p.blouseIncluded,
            blouse_length: p.blouseLength,
            occasion: p.occasion,
            care_instructions: p.careInstructions,
            available_colors: p.availableColors,
            primary_color: p.primaryColor,
            images: p.images,
            rating: 0,
            review_count: 0,
            is_featured: Boolean(p.isFeatured),
            is_bestseller: Boolean(p.isBestseller),
            is_new_arrival: Boolean(p.isNewArrival),
            is_active: true,
          }))
        )
        .select("id");
      if (error) {
        console.error("[catalogue] import failed:", error.message);
        return { success: false as const, error: `Import failed: ${error.message}` };
      }
      imported = data?.length || 0;
    }

    // Backfill product_images rows for any product that has an images[] array but no image rows
    const [{ data: prods }, { data: imgRows }] = await Promise.all([
      admin.from("products").select("id, name, images"),
      admin.from("product_images").select("product_id"),
    ]);
    const hasRows = new Set((imgRows || []).map((r: { product_id: string }) => r.product_id));
    const toInsert: Record<string, unknown>[] = [];
    for (const p of prods || []) {
      if (hasRows.has(p.id)) continue;
      (p.images || []).forEach((url: string, i: number) => {
        toInsert.push({
          product_id: p.id,
          storage_path: null,
          public_url: url,
          alt_text: `${p.name} - photo ${i + 1}`,
          display_order: i,
          is_primary: i === 0,
        });
      });
    }
    if (toInsert.length > 0) await admin.from("product_images").insert(toInsert);

    revalidateCatalogue();
    console.info(`[catalogue] import by=${auth.userId} imported=${imported} imageRows=${toInsert.length}`);
    return { success: true as const, imported, skipped: INITIAL_PRODUCTS.length - fresh.length };
  } catch (err) {
    console.error("[catalogue] import error:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}
