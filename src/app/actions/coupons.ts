"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { INITIAL_COUPONS as STARTER_COUPONS } from "@/lib/mockData";

// Bundled sample coupons are for local development only; production uses coupons from the database.
const INITIAL_COUPONS = process.env.NODE_ENV === "production" ? [] : STARTER_COUPONS;
import { couponSchema, type CouponInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function validateCouponAction(code: string, subtotal: number) {
  try {
    const codeUpper = code.trim().toUpperCase();
    const supabase = createAdminClient(); // coupons are not publicly readable; validated server-side

    // Query Supabase
    const { data: coupon, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", codeUpper)
      .eq("is_active", true)
      .single();

    if (!error && coupon) {
      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { success: false, error: "This coupon has expired" };
      }
      if (coupon.times_used >= coupon.usage_limit) {
        return { success: false, error: "Coupon usage limit reached" };
      }
      if (subtotal < Number(coupon.min_order_value || 0)) {
        return {
          success: false,
          error: `Minimum order of ₹${Number(coupon.min_order_value).toLocaleString("en-IN")} required for this coupon`,
        };
      }

      let discount = 0;
      if (coupon.discount_type === "percentage") {
        discount = Math.round((subtotal * Number(coupon.discount_value)) / 100);
        if (coupon.max_discount && discount > Number(coupon.max_discount)) {
          discount = Number(coupon.max_discount);
        }
      } else {
        discount = Number(coupon.discount_value);
      }

      return {
        success: true,
        data: {
          code: coupon.code,
          discountType: coupon.discount_type,
          discountValue: Number(coupon.discount_value),
          discountAmount: discount,
          minOrderValue: Number(coupon.min_order_value),
          maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : undefined,
          description: `Applied ${coupon.code} discount`,
        },
      };
    }

    // Fallback to mock coupons
    const mock = INITIAL_COUPONS.find((c) => c.code === codeUpper && c.isActive);
    if (!mock) {
      return { success: false, error: "Invalid coupon code" };
    }

    if (subtotal < mock.minOrderValue) {
      return {
        success: false,
        error: `Minimum order of ₹${mock.minOrderValue.toLocaleString("en-IN")} required for this coupon`,
      };
    }

    let discount = 0;
    if (mock.discountType === "percentage") {
      discount = Math.round((subtotal * mock.discountValue) / 100);
      if (mock.maxDiscount && discount > mock.maxDiscount) {
        discount = mock.maxDiscount;
      }
    } else {
      discount = mock.discountValue;
    }

    return {
      success: true,
      data: {
        code: mock.code,
        discountType: mock.discountType,
        discountValue: mock.discountValue,
        discountAmount: discount,
        minOrderValue: mock.minOrderValue,
        maxDiscount: mock.maxDiscount,
        description: mock.description,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to validate coupon" };
  }
}

export async function getCouponsAction() {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient.from("coupons").select("*").order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      return { success: true, data: INITIAL_COUPONS };
    }

    return { success: true, data };
  } catch {
    return { success: true, data: INITIAL_COUPONS };
  }
}

export async function createCouponAction(values: CouponInput) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const validated = couponSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const adminClient = createAdminClient();
    const c = validated.data;

    const { data, error } = await adminClient
      .from("coupons")
      .insert({
        code: c.code,
        discount_type: c.discountType,
        discount_value: c.discountValue,
        min_order_value: c.minOrderValue,
        max_discount: c.maxDiscount || null,
        usage_limit: c.usageLimit,
        is_active: c.isActive,
        expires_at: c.expiresAt || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/coupons");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteCouponAction(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("coupons").delete().eq("id", id);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/coupons");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
