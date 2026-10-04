"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase";
import { reviewSchema, type ReviewInput } from "@/lib/validations";
import { INITIAL_REVIEWS } from "@/lib/mockData";
import { revalidatePath } from "next/cache";

export async function getProductReviewsAction(productId: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) {
      const filtered = INITIAL_REVIEWS.filter((r) => r.productId === productId);
      return { success: true, data: filtered };
    }

    return { success: true, data };
  } catch {
    return { success: true, data: [] };
  }
}

export async function submitReviewAction(values: ReviewInput) {
  try {
    const validated = reviewSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message };
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const r = validated.data;
    const { data, error } = await supabase.from("reviews").insert({
      product_id: r.productId,
      user_id: user?.id || null,
      author_name: r.authorName,
      author_city: r.authorCity,
      rating: r.rating,
      title: r.title || null,
      comment: r.comment,
      is_verified_purchase: Boolean(user),
      status: "approved", // or 'pending' for moderation
    });

    if (error) return { success: false, error: error.message };

    revalidatePath("/product/[slug]", "page");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function moderateReviewAction(reviewId: string, status: "approved" | "rejected") {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("reviews").update({ status }).eq("id", reviewId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/admin/reviews");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
