"use server";

import { audit } from "@/lib/security/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { revalidateCatalogue } from "@/lib/products/images";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GENERIC_ERROR = "Something went wrong. Please try again.";

export interface PickerProduct {
  id: string;
  name: string;
  sku: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isActive: boolean;
  image: string | null;
}

function toPicker(r: any): PickerProduct {
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    price: Number(r.price),
    discountPrice: r.discount_price ? Number(r.discount_price) : undefined,
    stock: r.stock,
    isActive: Boolean(r.is_active),
    image: (r.images && r.images[0]) || null,
  };
}

const PICKER_COLUMNS = "id, name, sku, price, discount_price, stock, is_active, images";

/** Current two slots + every product, for the dashboard selector. */
export async function getFestiveDropsAdminAction() {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  try {
    const admin = createAdminClient();
    const [dropsRes, productsRes] = await Promise.all([
      admin.from("featured_drops").select("slot, product_id").order("slot", { ascending: true }),
      admin.from("products").select(PICKER_COLUMNS).order("name", { ascending: true }),
    ]);
    if (dropsRes.error || productsRes.error) {
      return {
        success: false as const,
        error: "Featured Festive Drops are not set up yet. Run migration 002 in Supabase.",
      };
    }
    const products = (productsRes.data || []).map(toPicker);
    const byId = new Map(products.map((p) => [p.id, p]));
    const slots: (PickerProduct | null)[] = [null, null];
    for (const d of dropsRes.data || []) {
      if (d.slot === 1 || d.slot === 2) slots[d.slot - 1] = byId.get(d.product_id) || null;
    }
    return { success: true as const, slots, products };
  } catch (err) {
    console.error("[festive-drops] load failed:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}

/** Saves exactly two slots (either may be empty). Atomic via the save_featured_drops() function. */
export async function saveFestiveDropsAction(slot1: string | null, slot2: string | null) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };

  const ids = [slot1, slot2];
  for (const id of ids) {
    if (id !== null && (typeof id !== "string" || !UUID_RE.test(id))) {
      return { success: false as const, error: "Invalid product selection." };
    }
  }
  if (slot1 && slot1 === slot2) {
    return { success: false as const, error: "Product 1 and Product 2 must be different." };
  }

  try {
    const admin = createAdminClient();
    const chosen = ids.filter((id): id is string => Boolean(id));
    if (chosen.length > 0) {
      const { data } = await admin.from("products").select("id, is_active").in("id", chosen);
      if ((data || []).length !== chosen.length) {
        return { success: false as const, error: "A selected product no longer exists." };
      }
      if ((data || []).some((p) => !p.is_active)) {
        return { success: false as const, error: "Hidden products cannot be featured. Make the product visible first." };
      }
    }

    const { error } = await admin.rpc("save_featured_drops", {
      p_slot1: slot1,
      p_slot2: slot2,
      p_user: auth.userId,
    });
    if (error) {
      console.error("[festive-drops] save failed:", error.message);
      return { success: false as const, error: "Could not save. Please try again." };
    }

    revalidateCatalogue();
    await audit({ action: "settings.festive_drops", actorId: auth.userId, entityType: "featured_drops", meta: { slot1, slot2 } });
    return { success: true as const };
  } catch (err) {
    console.error("[festive-drops] save error:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}
