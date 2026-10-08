"use server";

import { audit } from "@/lib/security/audit";
import { rateLimit, tooManyMessage } from "@/lib/security/rate-limit";
import { requireAdmin } from "@/lib/auth/admin";
import { isStaffRole } from "@/lib/auth/roles";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { checkoutSchema, razorpayVerificationSchema, type CheckoutInput } from "@/lib/validations";
import { PRICING } from "@/lib/pricing";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder, isRazorpayLive } from "@/lib/services/payment/razorpay";
import { calculateShippingFee } from "@/lib/services/shipping";
import { cancelShiprocketOrder } from "@/lib/services/shipping/fulfillment";
import { confirmOnlinePayment, startPostConfirmation } from "@/lib/orders/payment";
import { ORDER_STATUSES, transitionOrderStatus } from "@/lib/orders/transitions";
import { INITIAL_PRODUCTS, INITIAL_COUPONS as STARTER_COUPONS } from "@/lib/mockData";

// Bundled sample coupons are for local development only.
const INITIAL_COUPONS = process.env.NODE_ENV === "production" ? [] : STARTER_COUPONS;
import { revalidatePath } from "next/cache";

export async function createOrderAction(values: CheckoutInput) {
  try {
    const validated = checkoutSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: validated.error.issues[0]?.message || "Invalid order information" };
    }

    const {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      billingAddress,
      items,
      paymentMethod,
      couponCode,
      giftWrap,
      giftMessage,
      notes,
    } = validated.data;

    const supabase = await createServerClient();
    const adminClient = createAdminClient();

    // 1. Fetch current logged-in user if available
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Please sign in to place your order.", code: "AUTH_REQUIRED" as const };
    const orderLimit = await rateLimit("checkout", user.id);
    if (!orderLimit.ok) return { success: false, error: tooManyMessage(orderLimit.retryAfter, "order attempts") };

    // 2. Server-side price recalculation (Never trust client prices)
    let calculatedSubtotal = 0;
    const verifiedItems: Array<{
      productId: string;
      productName: string;
      sku: string;
      selectedColor?: string;
      price: number;
      quantity: number;
      imageUrl?: string;
    }> = [];

    // The browser's prices, names and ids are NEVER used for money. Each line is resolved on the server by its
    // (unique) SKU; an item that cannot be resolved to exactly one purchasable product rejects the whole order.
    const unavailable = { success: false as const, error: "One or more items in your cart are no longer available. Please review your cart and try again." };
    for (const item of items) {
      let productPrice: number | null = null;
      let productName = "";
      let sku = "";
      let image = item.imageUrl;
      let dbProductId: string | null = null;

      const { data: dbProduct, error: lookupError } = await supabase
        .from("products")
        .select("id, name, sku, price, discount_price, images, stock, is_active")
        .eq("sku", item.sku)
        .maybeSingle();

      if (dbProduct && !lookupError) {
        if (!dbProduct.is_active) return unavailable;
        if (typeof dbProduct.stock === "number" && dbProduct.stock < item.quantity) {
          return { success: false as const, error: `Only ${Math.max(dbProduct.stock, 0)} of "${dbProduct.name}" left in stock. Please reduce the quantity.` };
        }
        productPrice = dbProduct.discount_price ? Number(dbProduct.discount_price) : Number(dbProduct.price);
        productName = dbProduct.name;
        sku = dbProduct.sku;
        image = dbProduct.images?.[0] || image;
        dbProductId = dbProduct.id;
      } else {
        // Starter catalogue (only until the catalogue is imported into the database); matched by SKU alone
        const mockMatch = INITIAL_PRODUCTS.find((p) => p.sku === item.sku);
        if (!mockMatch) return unavailable;
        productPrice = mockMatch.discountPrice || mockMatch.price;
        productName = mockMatch.name;
        sku = mockMatch.sku;
        image = mockMatch.images?.[0] || image;
      }

      if (!Number.isFinite(productPrice) || (productPrice as number) <= 0) return unavailable;

      calculatedSubtotal += (productPrice as number) * item.quantity;
      verifiedItems.push({
        productId: dbProductId ?? "",
        productName,
        sku,
        selectedColor: item.selectedColor,
        price: productPrice as number,
        quantity: item.quantity,
        imageUrl: image,
      });
    }

    // 3. Server-side coupon verification
    let discountAmount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const codeUpper = couponCode.trim().toUpperCase();
      // Try DB coupon first
      const { data: dbCoupon } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", codeUpper)
        .eq("is_active", true)
        .single();

      if (dbCoupon) {
        const withinLimit = dbCoupon.usage_limit == null || Number(dbCoupon.times_used || 0) < Number(dbCoupon.usage_limit);
        if (withinLimit && (!dbCoupon.expires_at || new Date(dbCoupon.expires_at) > new Date())) {
          if (calculatedSubtotal >= Number(dbCoupon.min_order_value || 0)) {
            if (dbCoupon.discount_type === "percentage") {
              discountAmount = Math.round((calculatedSubtotal * Number(dbCoupon.discount_value)) / 100);
              if (dbCoupon.max_discount && discountAmount > Number(dbCoupon.max_discount)) {
                discountAmount = Number(dbCoupon.max_discount);
              }
            } else {
              discountAmount = Number(dbCoupon.discount_value);
            }
            appliedCoupon = codeUpper;
          }
        }
      } else {
        // Fallback mock coupon
        const mockCoupon = INITIAL_COUPONS.find((c) => c.code === codeUpper && c.isActive);
        if (mockCoupon && calculatedSubtotal >= mockCoupon.minOrderValue) {
          if (mockCoupon.discountType === "percentage") {
            discountAmount = Math.round((calculatedSubtotal * mockCoupon.discountValue) / 100);
            if (mockCoupon.maxDiscount && discountAmount > mockCoupon.maxDiscount) {
              discountAmount = mockCoupon.maxDiscount;
            }
          } else {
            discountAmount = mockCoupon.discountValue;
          }
          appliedCoupon = codeUpper;
        }
      }
    }

    // 4. Shipping fee calculation
    const shippingFee = calculateShippingFee(shippingAddress.pincode, calculatedSubtotal);

    // 5. Final total
    const giftWrapFee = giftWrap ? PRICING.giftWrapFee : 0;
    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingFee + giftWrapFee);

    // 6. Signed-in customers only. Admin/staff accounts are not customer accounts.
    if (!user) {
      return { success: false, error: "Please sign in to place your order.", code: "AUTH_REQUIRED" as const };
    }
    const { data: profile } = await adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (isStaffRole(profile?.role)) {
      return { success: false, error: "Admin accounts cannot place orders. Please sign in with a customer account." };
    }

    // 7. Unique order number (RVN-YYYY-NNNNNN). It is also the Shiprocket / Razorpay reference.
    let orderNumber = "";
    for (let i = 0; i < 5 && !orderNumber; i++) {
      const candidate = `RVN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const { data: clash } = await adminClient.from("orders").select("id").eq("order_number", candidate).maybeSingle();
      if (!clash) orderNumber = candidate;
    }
    if (!orderNumber) return { success: false, error: "Please try again." };

    // 8. Payment provider (Razorpay)
    const orderEmail = user.email || customerEmail;

    let razorpayOrderId: string | undefined;
    let razorpayKeyId: string | undefined;

    // Razorpay is the only way to pay
    const isOnlinePayment = true;

    if (!isRazorpayLive && process.env.NODE_ENV === "production") {
      console.error("[order] payment requested but Razorpay is not configured");
      return {
        success: false,
        error: "Online payment is temporarily unavailable. Please try again in a little while.",
      };
    }

    {
      const razorpayOrder = await createRazorpayOrder({
        amountInRupees: finalTotal,
        orderNumber,
        receipt: orderNumber,
        notes: {
          customerEmail: orderEmail,
          customerPhone,
          orderNumber,
        },
      });
      razorpayOrderId = razorpayOrder.id;
      razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder";
    }

    // 8. Persist Order in Supabase
    let createdOrderId = "";
    try {
      const { data: orderData, error: orderError } = await adminClient
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: user.id,
          customer_name: customerName,
          customer_email: orderEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress as any,
          billing_address: (billingAddress || shippingAddress) as any,
          subtotal: calculatedSubtotal,
          discount_amount: discountAmount,
          shipping_fee: shippingFee,
          total_amount: finalTotal,
          payment_method: paymentMethod,
          payment_status: "pending",
          // The order is confirmed (and becomes shippable) only once Razorpay payment is verified
          order_status: "pending",
          fulfillment_status: null,
          gift_wrap: giftWrap || false,
          gift_message: giftMessage || null,
          applied_coupon: appliedCoupon,
          notes: notes || null,
        })
        .select()
        .single();

      if (orderError || !orderData?.id) {
        console.error("[order] insert failed:", orderError?.message);
        return {
          success: false,
          error: "We could not save your order. You have not been charged. Please try again.",
        };
      }

      {
        createdOrderId = orderData.id;

        // Insert items
        const itemRows = verifiedItems.map((item) => ({
          order_id: createdOrderId,
          product_id: item.productId || null,
          product_name: item.productName,
          sku: item.sku,
          selected_color: item.selectedColor || null,
          price: item.price,
          quantity: item.quantity,
          image_url: item.imageUrl || null,
        }));

        const { error: itemsError } = await adminClient.from("order_items").insert(itemRows);
        if (itemsError) {
          console.error("[order] items insert failed:", itemsError.message);
          await adminClient.from("orders").delete().eq("id", createdOrderId);
          return {
            success: false,
            error: "We could not save your order. You have not been charged. Please try again.",
          };
        }

        // Record status history
        await adminClient.from("order_status_history").insert({
          order_id: createdOrderId,
          previous_status: null,
          new_status: "pending",
          notes: "Order created, awaiting Razorpay payment",
        });

        // Record coupon usage if applied
        if (appliedCoupon) {
          const { data: cData } = await adminClient
            .from("coupons")
            .select("id, times_used")
            .eq("code", appliedCoupon)
            .single();

          if (cData) {
            await adminClient
              .from("coupons")
              .update({ times_used: (cData.times_used || 0) + 1 })
              .eq("id", cData.id);

            await adminClient.from("coupon_usages").insert({
              coupon_id: cData.id,
              user_id: user?.id || null,
              order_id: createdOrderId,
              discount_applied: discountAmount,
            });
          }
        }
      }
    } catch (dbErr) {
      console.error("[order] database error:", dbErr);
      return {
        success: false,
        error: "We could not save your order. You have not been charged. Please try again.",
      };
    }

    revalidatePath("/admin/orders");

    return {
      success: true,
      data: {
        orderId: createdOrderId,
        orderNumber,
        totalAmount: finalTotal,
        subtotal: calculatedSubtotal,
        discountAmount,
        shippingFee,
        isOnlinePayment,
        razorpayOrderId,
        razorpayKeyId,
        customerName,
        customerEmail: orderEmail,
        customerPhone,
      },
    };
  } catch (err: any) {
    console.error("createOrderAction error:", err?.message || err);
    // Never surface provider/internal error details to the browser
    return { success: false, error: "We could not place your order. You have not been charged. Please try again." };
  }
}

export async function verifyPaymentAction(values: unknown) {
  try {
    const validated = razorpayVerificationSchema.safeParse(values);
    if (!validated.success) {
      return { success: false, error: "Invalid payment verification payload" };
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderNumber } = validated.data;

    const isValid = verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      return { success: false, error: "Payment verification failed: Signature mismatch" };
    }

    const adminClient = createAdminClient();

    // Bind the verified Razorpay order to THIS order number and amount, so a valid
    // payment for one order can never mark a different (costlier) order as paid.
    if (isRazorpayLive) {
      const [rzpOrder, { data: target }] = await Promise.all([
        fetchRazorpayOrder(razorpayOrderId),
        adminClient.from("orders").select("total_amount").eq("order_number", orderNumber).maybeSingle(),
      ]);
      if (
        !rzpOrder ||
        !target ||
        rzpOrder.receipt !== orderNumber ||
        rzpOrder.amount !== Math.round(Number(target.total_amount) * 100)
      ) {
        console.warn(`[security] Payment/order mismatch for ${orderNumber}`);
        return { success: false, error: "Payment could not be matched to this order." };
      }
    }

    // Only the order's owner can confirm it from the browser (the webhook confirms independently)
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: target } = await adminClient.from("orders").select("user_id, total_amount").eq("order_number", orderNumber).maybeSingle();
    if (!target || !user || target.user_id !== user.id) {
      return { success: false, error: "Payment could not be matched to this order." };
    }

    // Marks paid exactly once (the Razorpay webhook may arrive first); email + Shiprocket run in the background
    const result = await confirmOnlinePayment({
      orderNumber,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amountRupees: Number(target.total_amount),
      source: "client",
    });
    if (!result.ok) return { success: false, error: "Payment could not be matched to this order." };

    revalidatePath("/admin/orders");
    revalidatePath(`/account/track/${orderNumber}`);

    return { success: true, orderNumber };
  } catch (err: any) {
    console.error("verifyPaymentAction error:", err?.message || err);
    return { success: false, error: "Payment verification failed. If money was debited, it will be confirmed shortly." };
  }
}

export async function getAllOrdersAdminAction() {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  try {
    const adminClient = createAdminClient();
    const { data: orders, error } = await adminClient
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .order("created_at", { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data: orders };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Admin status change. Uses the shared transition (history + customer email, deduplicated).
 * Cancelling an order that is already in Shiprocket cancels it there first.
 * A manually entered AWB/courier is kept only for orders shipped outside Shiprocket.
 */
export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  trackingNumber?: string,
  notes?: string,
  courierPartner?: string
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!(ORDER_STATUSES as readonly string[]).includes(newStatus)) return { success: false, error: "Invalid order status." };
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { success: false, error: "Invalid order." };
  try {
    const adminClient = createAdminClient();
    const { data: currentOrder } = await adminClient
      .from("orders")
      .select("order_status, courier_partner, shiprocket_awb, tracking_number")
      .eq("id", orderId)
      .single();
    if (!currentOrder) return { success: false, error: "Order not found." };
    const previousStatus = currentOrder.order_status || "pending";

    if (newStatus === "cancelled" && previousStatus !== "cancelled") {
      const sr = await cancelShiprocketOrder(orderId);
      if (!sr.ok) return { success: false, error: `Not cancelled: ${sr.message}` };
    }

    // Manual courier details (only when the shipment is not managed by Shiprocket)
    const extra: Record<string, unknown> = {};
    const tn = (trackingNumber || "").trim();
    const courier = (courierPartner || "").trim();
    if (!currentOrder.shiprocket_awb) {
      if (tn && !/^[A-Za-z0-9-]{4,40}$/.test(tn)) return { success: false, error: "Tracking number may only contain letters, numbers and dashes." };
      if (tn) extra.tracking_number = tn;
      if (courier) extra.courier_partner = courier.slice(0, 100);
    }

    if (newStatus === previousStatus) {
      if (Object.keys(extra).length) {
        await adminClient.from("orders").update({ ...extra, updated_at: new Date().toISOString() }).eq("id", orderId);
      }
    } else {
      const moved = await transitionOrderStatus(orderId, previousStatus, newStatus, {
        notes: (notes || `Status changed from ${previousStatus} to ${newStatus} by admin`).slice(0, 500),
        changedBy: auth.userId,
        extraUpdate: extra,
      });
      if (!moved) return { success: false, error: "The order was updated by someone else. Refresh and try again." };
    }

    await audit({ action: "order.status_change", actorId: auth.userId, entityType: "order", entityId: orderId, meta: { from: previousStatus, to: newStatus } });
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err: any) {
    console.error("[order-status] update failed:", err?.message || err);
    return { success: false, error: "Could not update the order." };
  }
}
