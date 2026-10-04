"use client";

import React, { useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Printer,
  Truck,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";

import { getOrderByNumberAction } from "@/app/actions/orders";

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("orderNumber");
  const { orders, getOrderByNumber } = useApp();
  const [serverOrder, setServerOrder] = React.useState<any>(null);

  useEffect(() => {
    if (orderNumber && !getOrderByNumber(orderNumber)) {
      getOrderByNumberAction(orderNumber).then((res) => {
        if (res.success && res.data) {
          setServerOrder(res.data);
        }
      });
    }
  }, [orderNumber, getOrderByNumber]);

  const rawOrder = orderNumber
    ? getOrderByNumber(orderNumber) || serverOrder
    : orders.length > 0
    ? orders[orders.length - 1]
    : null;

  const order = rawOrder
    ? {
        ...rawOrder,
        orderNumber: rawOrder.order_number || rawOrder.orderNumber,
        customerName: rawOrder.customer_name || rawOrder.customerName,
        customerEmail: rawOrder.customer_email || rawOrder.customerEmail,
        customerPhone: rawOrder.customer_phone || rawOrder.customerPhone,
        totalAmount: rawOrder.total_amount || rawOrder.totalAmount,
        subtotal: rawOrder.subtotal || rawOrder.subtotal,
        discountAmount: rawOrder.discount_amount || rawOrder.discountAmount,
        shippingFee: rawOrder.shipping_fee || rawOrder.shippingFee,
        paymentMethod: rawOrder.payment_method || rawOrder.paymentMethod,
        paymentId: rawOrder.payment_id || rawOrder.paymentId,
        trackingNumber: rawOrder.tracking_number || rawOrder.trackingNumber,
        estimatedDelivery: rawOrder.estimated_delivery || rawOrder.estimatedDelivery || "4 Business Days",
        createdAt: rawOrder.created_at || rawOrder.createdAt,
        shippingAddress: rawOrder.shipping_address || rawOrder.shippingAddress,
        items: (rawOrder.items || []) as any[],
      }
    : null;

  // Trigger celebration confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#C8A24D", "#FAF9F6", "#7A1F2B", "#FFFFFF", "#B8923D"],
      });
    } catch {}
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (!order) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h2 className="text-2xl font-serif mb-2">Order Confirmed</h2>
        <p className="text-xs text-neutral-500 mb-6 font-light">
          Thank you for choosing Ravina Sarees. Your handloom package is being prepared.
        </p>
        <Link
          href="/shop"
          className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          Return to Boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      {/* 1. Celebration Banner */}
      <div className="text-center space-y-4 mb-10 no-print">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-md">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-brand-ivory border border-brand-gold/40 rounded-full text-xs text-brand-maroon font-poppins font-semibold shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-gold" /> Royal Order Confirmed
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          Thank You, {order.customerName}!
        </h1>
        <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed font-light">
          Your order has been registered at our Marthadi, Bejjur atelier. A confirmation email and SMS have been sent to <strong>{order.customerEmail}</strong>.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-poppins">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-white hover:bg-brand-ivory border border-brand-border hover:border-brand-gold text-brand-text text-xs font-semibold rounded-full flex items-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-brand-gold" /> Print Tax Invoice
          </button>
          <Link
            href={`/account/track/${order.orderNumber}`}
            className="px-5 py-2.5 bg-white hover:bg-brand-ivory border border-brand-border hover:border-brand-gold text-brand-text text-xs font-semibold rounded-full flex items-center gap-2 transition-all shadow-sm"
          >
            <Truck className="w-4 h-4 text-brand-gold" /> Track BlueDart Dispatch
          </Link>
          <Link
            href="/shop"
            className="btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full shadow-md"
          >
            Continue Shopping
          </Link>
        </div>
      </div>

      {/* 2. Official Tax Invoice Card */}
      <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 sm:p-10 shadow-luxury space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-brand-border pb-6 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <img
                src="/images/logo/raveena-logo-light.png"
                alt="Raveena Sarees"
                className="h-12 w-auto object-contain print:hidden"
              />
              <span className="hidden print:inline text-2xl font-serif font-bold text-black tracking-widest uppercase">
                Raveena Sarees
              </span>
            </div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1 font-poppins print:text-gray-600">
              Ravina Handloom Silks • GSTIN: 36AAACR9234R1Z5
            </p>
            <p className="text-xs text-neutral-600 mt-1 font-light print:text-gray-600">
              Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana – 504224, India
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs">
            <span className="inline-block font-bold text-xs uppercase tracking-widest text-brand-maroon bg-white px-3 py-1 rounded-full border border-brand-border font-poppins print:border-black print:text-black shadow-sm">
              Tax Invoice
            </span>
            <p className="text-brand-text font-mono font-bold print:text-black">
              Invoice #{order.orderNumber}
            </p>
            <p className="text-neutral-500 font-light print:text-gray-600">Date: {formatDate(order.createdAt)}</p>
            <p className="text-neutral-500 font-light print:text-gray-600">
              Payment: <strong className="uppercase text-brand-text print:text-black">{order.paymentMethod}</strong> (Paid)
            </p>
          </div>
        </div>

        {/* Dispatch & Address Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-brand-border pb-6 print:border-black">
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-poppins print:text-gray-600 block">
              Billed & Delivered To:
            </span>
            <p className="font-bold text-brand-text text-sm print:text-black">{order.customerName}</p>
            <p className="text-neutral-600 font-light print:text-black">{order.shippingAddress.street}</p>
            {order.shippingAddress.landmark && (
              <p className="text-neutral-500 font-light text-[11px] print:text-gray-600">
                Landmark: {order.shippingAddress.landmark}
              </p>
            )}
            <p className="text-neutral-600 font-light print:text-black">
              {order.shippingAddress.city}, {order.shippingAddress.state} - <strong>{order.shippingAddress.pincode}</strong>
            </p>
            <p className="text-neutral-500 font-light print:text-gray-600">
              Phone: {order.customerPhone} | Email: {order.customerEmail}
            </p>
          </div>

          <div className="space-y-1 sm:text-right">
            <span className="text-[10px] uppercase font-bold text-neutral-500 font-poppins print:text-gray-600 block">
              Shipping & Transit Courier:
            </span>
            <p className="font-semibold text-brand-text print:text-black flex sm:justify-end items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-brand-gold print:text-black" />
              {order.courierPartner} (Air Priority)
            </p>
            <p className="text-neutral-600 font-light print:text-black">
              AWB Tracking No: <strong className="font-mono text-brand-maroon print:text-black">{order.trackingNumber}</strong>
            </p>
            <p className="text-neutral-600 font-light print:text-black">
              Estimated Delivery: <strong className="text-brand-text print:text-black">{order.estimatedDelivery}</strong>
            </p>
            {order.giftWrap && (
              <p className="text-brand-gold print:text-black text-[11px] pt-1 font-medium">
                🎁 Luxury Bridal Packaging Requested
              </p>
            )}
          </div>
        </div>

        {/* Order Items Table */}
        <div className="space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-wider text-neutral-500 font-poppins print:text-gray-600">
            Saree Itemization
          </h3>

          <div className="divide-y divide-brand-border print:divide-black">
            {order.items.map((item: any, idx: number) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={item.imageUrl}
                    alt={item.productName}
                    className="w-12 h-14 object-cover rounded-xl border border-brand-border print:hidden shrink-0 shadow-sm"
                  />
                  <div>
                    <p className="font-semibold text-brand-text print:text-black">{item.productName}</p>
                    <p className="text-[11px] text-neutral-500 font-light print:text-gray-600">
                      SKU: {item.sku} • Shade: {item.selectedColor} • Qty: {item.quantity}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-serif text-brand-maroon print:text-black">
                    {formatINR(item.price * item.quantity)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="border-t border-brand-border pt-4 flex flex-col items-end space-y-1.5 text-xs print:border-black">
          <div className="flex justify-between w-full max-w-xs text-neutral-600 font-light print:text-gray-600">
            <span>Subtotal:</span>
            <span>{formatINR(order.subtotal)}</span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex justify-between w-full max-w-xs text-emerald-700 font-medium print:text-black">
              <span>Coupon Discount ({order.appliedCoupon}):</span>
              <span>-{formatINR(order.discountAmount)}</span>
            </div>
          )}

          {order.giftWrapFee > 0 && (
            <div className="flex justify-between w-full max-w-xs text-brand-gold font-medium print:text-black">
              <span>Bridal Packaging Box:</span>
              <span>+{formatINR(order.giftWrapFee)}</span>
            </div>
          )}

          <div className="flex justify-between w-full max-w-xs text-neutral-600 font-light print:text-gray-600">
            <span>Express Air Shipping:</span>
            <span className="text-emerald-700 print:text-black font-semibold font-poppins">FREE</span>
          </div>

          <div className="flex justify-between w-full max-w-xs text-neutral-500 text-[11px] font-light print:text-gray-600">
            <span>Integrated GST (12% Included):</span>
            <span>{formatINR(Math.round((order.totalAmount * 12) / 112))}</span>
          </div>

          <div className="flex justify-between w-full max-w-xs text-base font-bold text-brand-text pt-2 border-t border-brand-border print:border-black print:text-black">
            <span>Total Paid Amount:</span>
            <span className="text-brand-maroon font-serif font-bold print:text-black">{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        {/* Footer Note */}
        <div className="pt-4 border-t border-brand-border text-[11px] text-neutral-500 text-center space-y-1 font-light print:text-gray-600 print:border-black">
          <p>This is a computer generated tax invoice and does not require a physical signature.</p>
          <p>For inquiries, contact concierge <a href="mailto:ravieenasarees@gmail.com" className="text-brand-maroon hover:underline">ravieenasarees@gmail.com</a> or WhatsApp <a href="https://wa.me/917780756009" className="text-brand-maroon hover:underline">+91 77807 56009</a>.</p>
        </div>
      </div>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-white text-brand-gold flex items-center justify-center font-serif text-lg">Loading Invoice...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
