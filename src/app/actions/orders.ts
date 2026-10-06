"use server";

import { requireAdmin } from "@/lib/auth/admin";
import { createServerClient, createAdminClient } from "@/lib/supabase";
import { checkoutSchema, razorpayVerificationSchema, type CheckoutInput } from "@/lib/validations";
import { PRICING } from "@/lib/pricing";
import { createRazorpayOrder, verifyRazorpaySignature, fetchRazorpayOrder, isRazorpayLive } from "@/lib/services/payment/razorpay";
import { getEmailService } from "@/lib/services/email";
import { getShippingService } from "@/lib/services/shipping";
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
    const shippingService = getShippingService();
    const shippingFee = shippingService.calculateShippingFee(shippingAddress.pincode, calculatedSubtotal);

    // 5. Final total
    const giftWrapFee = giftWrap ? PRICING.giftWrapFee : 0;
    const finalTotal = Math.max(0, calculatedSubtotal - discountAmount + shippingFee + giftWrapFee);

    // 6. Generate unique order number
    const randomPart = Math.floor(100000 + Math.random() * 900000);
    const orderNumber = `RVN-${new Date().getFullYear()}-${randomPart}`;

    // 7. Handle Payment Provider (Razorpay)
    if (!user) {
      return { success: false, error: "Please sign in to place your order." };
    }
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
          payment_status: paymentMethod === "cod" ? "pending" : "pending",
          order_status: paymentMethod === "cod" ? "confirmed" : "pending",
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

    // 9. If Cash on Delivery, send immediate confirmation email
    if (paymentMethod === "cod") {
      const emailService = getEmailService();
      await emailService.sendOrderConfirmation({
        order_number: orderNumber,
        customer_name: customerName,
        customer_email: orderEmail,
        total_amount: finalTotal,
        payment_status: "Pending (Cash On Delivery)",
        shipping_address: `${shippingAddress.houseNumber}, ${shippingAddress.streetAddress}, ${shippingAddress.locality}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}`,
      });
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
    console.error("createOrderAction error:", err);
    return { success: false, error: err.message || "Failed to create order" };
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

    // Update order status in Supabase
    const { data: order, error } = await adminClient
      .from("orders")
      .update({
        payment_status: "paid",
        order_status: "confirmed",
        payment_id: razorpayPaymentId,
        updated_at: new Date().toISOString(),
      })
      .eq("order_number", orderNumber)
      .select()
      .single();

    if (order) {
      // Record payment
      await adminClient.from("payments").insert({
        order_id: order.id,
        payment_provider: "razorpay",
        transaction_id: razorpayPaymentId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount: order.total_amount,
        currency: "INR",
        status: "captured",
      });

      // Record order history
      await adminClient.from("order_status_history").insert({
        order_id: order.id,
        previous_status: "pending",
        new_status: "confirmed",
        notes: `Razorpay payment captured: ${razorpayPaymentId}`,
      });

      // Send order confirmation email
      const emailService = getEmailService();
      await emailService.sendOrderConfirmation(order);

      // Create automated shipment
      const shippingService = getShippingService();
      const addr = order.shipping_address as any;
      const shipment = await shippingService.createShipment({
        orderNumber: order.order_number,
        recipientName: order.customer_name,
        recipientPhone: order.customer_phone,
        streetAddress: addr?.streetAddress || "",
        city: addr?.city || "Hyderabad",
        state: addr?.state || "Telangana",
        pincode: addr?.pincode || "500001",
        itemCount: 1,
      });

      if (shipment.success) {
        await adminClient
          .from("orders")
          .update({
            courier_partner: shipment.courierPartner,
            tracking_number: shipment.trackingNumber,
            tracking_url: shipment.trackingUrl,
            estimated_delivery: shipment.estimatedDeliveryDate,
          })
          .eq("id", order.id);
      }
    }

    revalidatePath("/admin/orders");
    revalidatePath(`/account/track/${orderNumber}`);

    return { success: true, orderNumber };
  } catch (err: any) {
    console.error("verifyPaymentAction error:", err);
    return { success: false, error: err.message || "Payment verification failed" };
  }
}

export async function getOrderByNumberAction(orderNumber: string) {
  try {
    const supabase = await createServerClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (*)
      `)
      .eq("order_number", orderNumber)
      .single();

    if (error || !order) {
      return { success: false, error: "Order not found" };
    }

    const shippingService = getShippingService();
    const tracking = order.tracking_number
      ? await shippingService.trackShipment(order.tracking_number, order.courier_partner || undefined)
      : null;

    return {
      success: true,
      data: {
        ...order,
        tracking,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message };
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

const ORDER_STATUSES = [
  "pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered",
  "cancelled", "return_requested", "returned", "refund_processing", "refunded",
];

export async function updateOrderStatusAction(
  orderId: string,
  newStatus: string,
  trackingNumber?: string,
  notes?: string,
  courierPartner?: string
) {
  const auth = await requireAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!ORDER_STATUSES.includes(newStatus)) return { success: false, error: "Invalid order status." };
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { success: false, error: "Invalid order." };
  try {
    const adminClient = createAdminClient();

    const { data: currentOrder } = await adminClient
      .from("orders")
      .select("order_status, customer_email, order_number, courier_partner")
      .eq("id", orderId)
      .single();

    const previousStatus = currentOrder?.order_status || "pending";

    const updatePayload: Record<string, any> = {
      order_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    const courier = (courierPartner || currentOrder?.courier_partner || "").trim();
    if (courierPartner) updatePayload.courier_partner = courier.slice(0, 100);
    if (trackingNumber) {
      updatePayload.tracking_number = trackingNumber.trim().slice(0, 100);
      updatePayload.tracking_url = /bluedart/i.test(courier)
        ? `https://www.bluedart.com/tracking?trackid=${encodeURIComponent(trackingNumber.trim())}`
        : null;
    }

    const { error } = await adminClient.from("orders").update(updatePayload).eq("id", orderId);
    if (error) return { success: false, error: error.message };

    // Record history
    await adminClient.from("order_status_history").insert({
      order_id: orderId,
      previous_status: previousStatus,
      new_status: newStatus,
      notes: notes || `Status changed from ${previousStatus} to ${newStatus}`,
    });

    console.info(`[order-status] ${orderId} ${previousStatus} -> ${newStatus} by=${auth.userId}`);

    // Notify customer if dispatched
    if (newStatus === "shipped" && currentOrder) {
      const emailService = getEmailService();
      await emailService.sendShippingNotification({
        customer_email: currentOrder.customer_email,
        order_number: currentOrder.order_number,
        courier_partner: courier || "Courier",
        tracking_number: trackingNumber,
        tracking_url: updatePayload.tracking_url ?? null,
      });
    }

    revalidatePath("/admin/orders");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
