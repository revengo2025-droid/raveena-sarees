"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "@/lib/mockData";
import { productSchema, type ProductInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";
import { mapProductRow } from "@/lib/products/mapper";
import { removeStorageObjects, revalidateCatalogue } from "@/lib/products/images";

export async function getProductsAction(options?: {
  category?: string;
  occasion?: string;
  sort?: string;
  search?: string;
}) {
  try {
    const supabase = await createServerClient();
    let query = supabase.from("products").select("*").eq("is_active", true);

    if (options?.category && options.category !== "all") {
      query = query.ilike("category_name", `%${options.category}%`);
    }

    if (options?.occasion && options.occasion !== "all") {
      query = query.ilike("occasion", `%${options.occasion}%`);
    }

    if (options?.search) {
      query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    if (options?.sort === "price-low") {
      query = query.order("price", { ascending: true });
    } else if (options?.sort === "price-high") {
      query = query.order("price", { ascending: false });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback to rich mock data if Supabase table is not yet seeded
      let filtered = [...INITIAL_PRODUCTS];
      if (options?.category && options.category !== "all") {
        filtered = filtered.filter(
          (p) => p.categoryName.toLowerCase().replace(/\s+/g, "-") === options.category?.toLowerCase() ||
                 p.categoryName.toLowerCase() === options.category?.toLowerCase()
        );
      }
      if (options?.occasion && options.occasion !== "all") {
        filtered = filtered.filter((p) => p.occasion.toLowerCase() === options.occasion?.toLowerCase());
      }
      if (options?.search) {
        const q = options.search.toLowerCase();
        filtered = filtered.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
      }
      return { success: true, data: filtered, source: "mock" };
    }

    const formatted = data.map(mapProductRow);

    return { success: true, data: formatted, source: "database" };
  } catch (err: any) {
    return { success: true, data: INITIAL_PRODUCTS, source: "mock_fallback" };
  }
}

export async function getProductBySlugAction(slug: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      const found = INITIAL_PRODUCTS.find((p) => p.slug === slug);
      if (found) return { success: true, data: found, source: "mock" };
      return { success: false, error: "Product not found" };
    }

    return {
      success: true,
      data: mapProductRow(data),
      source: "database",
    };
  } catch {
    const found = INITIAL_PRODUCTS.find((p) => p.slug === slug);
    if (found) return { success: true, data: found, source: "mock_fallback" };
    return { success: false, error: "Product not found" };
  }
}

export async function createProductAction(values: ProductInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const validated = productSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const adminClient = createAdminClient();
    const p = validated.data;

    // Ensure slug uniqueness if collision occurs
    let finalSlug = p.slug;
    const { data: existingSlug } = await adminClient
      .from("products")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existingSlug) {
      finalSlug = `${p.slug}-${Date.now().toString().slice(-4)}`;
    }

    const { data, error } = await adminClient
      .from("products")
      .insert({
        sku: p.sku,
        name: p.name,
        slug: finalSlug,
        category_id: p.categoryId || null,
        category_name: p.categoryName,
        description: p.description,
        price: p.price,
        discount_price: p.discountPrice || null,
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
        images: p.images || [],
        rating: typeof p.rating === "number" ? p.rating : 0,
        review_count: typeof p.reviewCount === "number" ? p.reviewCount : 0,
        is_featured: p.isFeatured,
        is_bestseller: p.isBestseller,
        is_new_arrival: p.isNewArrival,
        is_active: p.isActive,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Record initial inventory log (non-critical)
    if (data?.id) {
      try {
        await adminClient.from("inventory_logs").insert({
          product_id: data.id,
          change_type: "manual_adjustment",
          quantity_change: p.stock,
          previous_stock: 0,
          new_stock: p.stock,
          reason: "Initial product stock creation",
        });
      } catch (logErr) {
        console.warn("[inventory_logs] initial creation log error:", logErr);
      }
    }

    revalidateCatalogue();
    revalidatePath("/admin/products");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProductAction(id: string, values: Partial<ProductInput>) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("products")
      .update({
        ...(values.name !== undefined && { name: values.name }),
        ...(values.sku !== undefined && { sku: values.sku }),
        ...(values.slug !== undefined && { slug: values.slug }),
        ...(values.price !== undefined && { price: values.price }),
        ...(values.discountPrice !== undefined && { discount_price: values.discountPrice || null }),
        ...(values.stock !== undefined && { stock: values.stock }),
        ...(values.fabric !== undefined && { fabric: values.fabric }),
        ...(values.zariType !== undefined && { zari_type: values.zariType }),
        ...(values.weaveType !== undefined && { weave_type: values.weaveType }),
        ...(values.sareeLength !== undefined && { saree_length: values.sareeLength }),
        ...(values.blouseIncluded !== undefined && { blouse_included: values.blouseIncluded }),
        ...(values.blouseLength !== undefined && { blouse_length: values.blouseLength }),
        ...(values.occasion !== undefined && { occasion: values.occasion }),
        ...(values.careInstructions !== undefined && { care_instructions: values.careInstructions }),
        ...(values.availableColors !== undefined && { available_colors: values.availableColors }),
        ...(values.primaryColor !== undefined && { primary_color: values.primaryColor }),
        ...(values.description !== undefined && { description: values.description }),
        ...(values.categoryName !== undefined && { category_name: values.categoryName }),
        ...(values.categoryId !== undefined && { category_id: values.categoryId || null }),
        ...(values.isFeatured !== undefined && { is_featured: values.isFeatured }),
        ...(values.isBestseller !== undefined && { is_bestseller: values.isBestseller }),
        ...(values.isNewArrival !== undefined && { is_new_arrival: values.isNewArrival }),
        ...(values.isActive !== undefined && { is_active: values.isActive }),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidateCatalogue();
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProductAction(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const adminClient = createAdminClient();
    const { data: imgs } = await adminClient.from("product_images").select("storage_path").eq("product_id", id);
    const { error } = await adminClient.from("products").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    await removeStorageObjects(adminClient, (imgs || []).map((i) => i.storage_path));

    revalidateCatalogue();
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCategoriesAction() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error || !data || data.length === 0) {
      return { success: true, data: INITIAL_CATEGORIES };
    }

    return { success: true, data };
  } catch {
    return { success: true, data: INITIAL_CATEGORIES };
  }
}
