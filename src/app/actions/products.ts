"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase";
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES } from "@/lib/mockData";
import { productSchema, type ProductInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";

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

    // Map database snake_case columns to frontend Product structure
    const formatted = data.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      slug: p.slug,
      categoryId: p.category_id || "",
      categoryName: p.category_name,
      description: p.description,
      price: Number(p.price),
      discountPrice: p.discount_price ? Number(p.discount_price) : undefined,
      stock: p.stock,
      fabric: p.fabric,
      zariType: p.zari_type,
      weaveType: p.weave_type,
      sareeLength: p.saree_length,
      blouseIncluded: p.blouse_included,
      blouseLength: p.blouse_length,
      occasion: p.occasion,
      careInstructions: p.care_instructions,
      availableColors: p.available_colors || [],
      primaryColor: p.primary_color,
      images: p.images || [],
      rating: Number(p.rating),
      reviewCount: p.review_count,
      isFeatured: p.is_featured,
      isBestseller: p.is_bestseller,
      isNewArrival: p.is_new_arrival,
    }));

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
      data: {
        id: data.id,
        sku: data.sku,
        name: data.name,
        slug: data.slug,
        categoryId: data.category_id || "",
        categoryName: data.category_name,
        description: data.description,
        price: Number(data.price),
        discountPrice: data.discount_price ? Number(data.discount_price) : undefined,
        stock: data.stock,
        fabric: data.fabric,
        zariType: data.zari_type,
        weaveType: data.weave_type,
        sareeLength: data.saree_length,
        blouseIncluded: data.blouse_included,
        blouseLength: data.blouse_length,
        occasion: data.occasion,
        careInstructions: data.care_instructions,
        availableColors: data.available_colors || [],
        primaryColor: data.primary_color,
        images: data.images || [],
        rating: Number(data.rating),
        reviewCount: data.review_count,
        isFeatured: data.is_featured,
        isBestseller: data.is_bestseller,
        isNewArrival: data.is_new_arrival,
      },
      source: "database",
    };
  } catch {
    const found = INITIAL_PRODUCTS.find((p) => p.slug === slug);
    if (found) return { success: true, data: found, source: "mock_fallback" };
    return { success: false, error: "Product not found" };
  }
}

export async function createProductAction(values: ProductInput) {
  try {
    const validated = productSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const adminClient = createAdminClient();
    const p = validated.data;

    const { data, error } = await adminClient
      .from("products")
      .insert({
        sku: p.sku,
        name: p.name,
        slug: p.slug,
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
        images: p.images,
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

    // Record initial inventory log
    if (data?.id) {
      await adminClient.from("inventory_logs").insert({
        product_id: data.id,
        change_type: "manual_adjustment",
        quantity_change: p.stock,
        previous_stock: 0,
        new_stock: p.stock,
        reason: "Initial product stock creation",
      });
    }

    revalidatePath("/shop");
    revalidatePath("/admin/products");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function updateProductAction(id: string, values: Partial<ProductInput>) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("products")
      .update({
        ...(values.name && { name: values.name }),
        ...(values.price !== undefined && { price: values.price }),
        ...(values.discountPrice !== undefined && { discount_price: values.discountPrice }),
        ...(values.stock !== undefined && { stock: values.stock }),
        ...(values.fabric && { fabric: values.fabric }),
        ...(values.description && { description: values.description }),
        ...(values.images && { images: values.images }),
        ...(values.categoryName && { category_name: values.categoryName }),
        ...(values.isFeatured !== undefined && { is_featured: values.isFeatured }),
        ...(values.isBestseller !== undefined && { is_bestseller: values.isBestseller }),
        ...(values.isNewArrival !== undefined && { is_new_arrival: values.isNewArrival }),
        ...(values.isActive !== undefined && { is_active: values.isActive }),
      })
      .eq("id", id);

    if (error) return { success: false, error: error.message };

    revalidatePath("/shop");
    revalidatePath("/admin/products");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteProductAction(id: string) {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("products").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/shop");
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
