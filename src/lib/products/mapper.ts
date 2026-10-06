import type { SareeProduct } from "@/lib/types";
import { INITIAL_CATEGORIES } from "@/lib/mockData";

export interface ProductImageRow {
  id: string;
  productId: string;
  url: string;
  storagePath: string | null;
  altText: string | null;
  displayOrder: number;
  isPrimary: boolean;
  width: number | null;
  height: number | null;
  fileSize: number | null;
}

export interface AdminProduct extends SareeProduct {
  isActive: boolean;
  imageRows: ProductImageRow[];
}

/** Maps a `products` table row (snake_case) to the storefront product shape. */
export function mapProductRow(p: any): SareeProduct {
  const categoryName: string = p.category_name || "";
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    categoryId:
      p.category_id || INITIAL_CATEGORIES.find((c) => c.name === categoryName)?.id || "",
    categoryName,
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
    rating: Number(p.rating ?? 0),
    reviewCount: p.review_count ?? 0,
    isFeatured: p.is_featured,
    isBestseller: p.is_bestseller,
    isNewArrival: p.is_new_arrival,
    createdAt: p.created_at,
  };
}

export function mapImageRow(r: any): ProductImageRow {
  return {
    id: r.id,
    productId: r.product_id,
    url: r.public_url,
    storagePath: r.storage_path ?? null,
    altText: r.alt_text ?? null,
    displayOrder: r.display_order,
    isPrimary: Boolean(r.is_primary),
    width: r.width ?? null,
    height: r.height ?? null,
    fileSize: r.file_size ?? null,
  };
}
