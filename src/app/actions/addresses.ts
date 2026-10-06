"use server";

import { createServerClient } from "@/lib/supabase";
import { addressSchema } from "@/lib/validations";
import type { SavedAddress } from "@/lib/types";

const GENERIC_ERROR = "Something went wrong. Please try again.";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toClient(r: any): SavedAddress {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    houseNumber: r.house_number || undefined,
    street: r.street_address,
    locality: r.locality || undefined,
    landmark: r.landmark || undefined,
    city: r.city,
    state: r.state,
    pincode: r.pincode,
    isDefault: Boolean(r.is_default),
    type: r.address_type === "office" ? "Office" : r.address_type === "other" ? "Other" : "Home",
  };
}

async function session() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** All addresses of the signed-in customer (RLS also restricts this to their own rows). */
export async function getMyAddressesAction() {
  try {
    const { supabase, user } = await session();
    if (!user) return { success: false as const, error: "Please sign in." };
    const { data, error } = await supabase
      .from("user_addresses")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) return { success: false as const, error: GENERIC_ERROR };
    return { success: true as const, data: (data || []).map(toClient) };
  } catch {
    return { success: false as const, error: GENERIC_ERROR };
  }
}

/**
 * Creates (or, with an id, updates) one of the customer's addresses.
 * When isDefault is true the previous default is cleared first, so there is only ever one.
 */
export async function saveAddressAction(values: unknown, id?: string) {
  try {
    const parsed = addressSchema.safeParse(values);
    if (!parsed.success) {
      return { success: false as const, error: parsed.error.issues[0]?.message || "Invalid address." };
    }
    if (id !== undefined && !UUID_RE.test(id)) return { success: false as const, error: "Invalid address." };

    const { supabase, user } = await session();
    if (!user) return { success: false as const, error: "Please sign in to save an address." };

    const a = parsed.data;
    if (a.isDefault) {
      await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id).eq("is_default", true);
    }

    const row = {
      user_id: user.id,
      name: a.name,
      phone: a.phone,
      house_number: a.houseNumber,
      street_address: a.streetAddress,
      locality: a.locality,
      landmark: a.landmark || null,
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      address_type: a.addressType,
      is_default: Boolean(a.isDefault),
    };

    const query = id
      ? supabase.from("user_addresses").update(row).eq("id", id).eq("user_id", user.id)
      : supabase.from("user_addresses").insert(row);
    const { data, error } = await query.select().maybeSingle();
    if (error || !data) {
      console.error("[address] save failed:", error?.message);
      return { success: false as const, error: "Could not save the address. Please try again." };
    }
    return { success: true as const, data: toClient(data) };
  } catch (err) {
    console.error("[address] save error:", err);
    return { success: false as const, error: GENERIC_ERROR };
  }
}

export async function setDefaultAddressAction(id: string) {
  try {
    if (!UUID_RE.test(id)) return { success: false as const, error: "Invalid address." };
    const { supabase, user } = await session();
    if (!user) return { success: false as const, error: "Please sign in." };

    const { data: target } = await supabase.from("user_addresses").select("id").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!target) return { success: false as const, error: "Address not found." };

    await supabase.from("user_addresses").update({ is_default: false }).eq("user_id", user.id).eq("is_default", true);
    const { error } = await supabase.from("user_addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
    if (error) return { success: false as const, error: GENERIC_ERROR };
    return { success: true as const };
  } catch {
    return { success: false as const, error: GENERIC_ERROR };
  }
}

export async function deleteAddressAction(id: string) {
  try {
    if (!UUID_RE.test(id)) return { success: false as const, error: "Invalid address." };
    const { supabase, user } = await session();
    if (!user) return { success: false as const, error: "Please sign in." };
    const { error } = await supabase.from("user_addresses").delete().eq("id", id).eq("user_id", user.id);
    if (error) return { success: false as const, error: GENERIC_ERROR };
    return { success: true as const };
  } catch {
    return { success: false as const, error: GENERIC_ERROR };
  }
}
