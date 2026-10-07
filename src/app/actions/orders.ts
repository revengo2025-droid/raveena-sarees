"use server";

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

    for (const item of items) {
      // Find product in DB or fallback mock
      let productPrice = item.price;
      let productName = item.productName;
      let sku = item.sku;
      let image = item.imageUrl;

      try {
        const { data: dbProduct } = await supabase
          .from("products")
          .select("id, name, sku, price, discount_price, images")
          .or(`id.eq.${item.productId},sku.eq.${item.sku}`)
          .single();

        if (dbProduct) {
          productPrice = dbProduct.discount_price ? Number(dbProduct.discount_price) : Number(dbProduct.price);
          productName = dbProduct.name;
          sku = dbProduct.sku;
          image = dbProduct.images?.[0] || image;
        } else {
          const mockMatch = INITIAL_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.sku);
          if (mockMatch) {
            productPrice = mockMatch.discountPrice || mockMatch.price;
            productName = mockMatch.name;
            sku = mockMatch.sku;
            image = mockMatch.images?.[0] || image;
          }
        }
      } catch {
        const mockMatch = INITIAL_PRODUCTS.find((p) => p.id === item.productId || p.sku === item.sku);
        if (mockMatch) {
          productPrice = mockMatch.discountPrice || mockMatch.price;
          productName = mockMatch.name;
          sku = mockMatch.sku;
        }
      }

      calculatedSubtotal += productPrice * item.quantity;
      verifiedItems.push({
        productId: item.productId,
        productName,
        sku,
        selectedColor: item.selectedColor,
        price: productPrice,
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
        if (!dbCoupon.expires_at || new Date(dbCoupon.expires_at) > new Date()) {
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
      return { success: false, error: "Please sign in to place your order." };
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

    const isOnlinePayment = ["razorpay", "card", "upi", "netbanking"].includes(paymentMethod);

    if (isOnlinePayment && !isRazorpayLive && process.env.NODE_ENV === "production") {
      console.error("[order] online payment requested but Razorpay is not configured");
      return {
        success: false,
        error: "Online payment is temporarily unavailable. Please choose Cash on Delivery or try again later.",
      };
    }

    if (isOnlinePayment) {
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
          order_status: paymentMethod === "cod" ? "confirmed" : "pending",
          // COD is confirmed now and ships right away; online orders become shippable once paid
          fulfillment_status: paymentMethod === "cod" ? "pending" : null,
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
          product_id: item.productId.length > 20 ? item.productId : null,
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
          new_status: paymentMethod === "cod" ? "confirmed" : "pending",
          notes: `Order created via ${paymentMethod.toUpperCase()}`,
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

    // 9. Cash on Delivery is confirmed immediately: confirmation email + Shiprocket, after the response
    if (paymentMethod === "cod") startPostConfirmation(createdOrderId);

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

    console.info(`[order-status] ${orderId} ${previousStatus} -> ${newStatus} by=${auth.userId}`);
    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err: any) {
    console.error("[order-status] update failed:", err?.message || err);
    return { success: false, error: "Could not update the order." };
  }
}
