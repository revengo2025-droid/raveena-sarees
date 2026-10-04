"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Truck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Printer,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { getOrderByNumberAction } from "@/app/actions/orders";

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params?.orderNumber as string;

  const { orders, getOrderByNumber } = useApp();
  const contextOrder = getOrderByNumber(orderNumber) || orders.find((o) => o.orderNumber === orderNumber);
  const [serverOrder, setServerOrder] = useState<any>(null);

  useEffect(() => {
    if (orderNumber) {
      getOrderByNumberAction(orderNumber).then((res) => {
        if (res.success && res.data) {
          setServerOrder(res.data);
        }
      });
    }
  }, [orderNumber]);

  const rawOrder = serverOrder || contextOrder;
  const order = rawOrder
    ? {
        ...rawOrder,
        orderNumber: rawOrder.order_number || rawOrder.orderNumber,
        customerName: rawOrder.customer_name || rawOrder.customerName,
        customerEmail: rawOrder.customer_email || rawOrder.customerEmail,
        orderStatus: rawOrder.order_status || rawOrder.orderStatus,
        trackingNumber: rawOrder.tracking_number || rawOrder.trackingNumber,
        courierPartner: rawOrder.courier_partner || rawOrder.courierPartner,
        estimatedDelivery: rawOrder.estimated_delivery || rawOrder.estimatedDelivery || "4 Business Days",
        createdAt: rawOrder.created_at || rawOrder.createdAt,
        totalAmount: rawOrder.total_amount || rawOrder.totalAmount,
        shippingAddress: rawOrder.shipping_address || rawOrder.shippingAddress,
      }
    : null;

  if (!order) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h2 className="text-2xl font-serif mb-2">Order Not Found</h2>
        <p className="text-xs text-neutral-500 mb-6 font-light">
          Could not locate tracking information for order number: {orderNumber}
        </p>
        <Link
          href="/account/orders"
          className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          View All Orders
        </Link>
      </div>
    );
  }

  // 5 Step Timeline logic
  const steps = [
    {
      title: "Order Confirmed & Paid",
      description: "Payment authenticated via Razorpay. Handloom reservation locked.",
      date: formatDate(order.createdAt),
      status: "completed",
    },
    {
      title: "Atelier Quality Inspection",
      description: "Silk Mark audit, pure zari tension test & bridal box packing at our atelier.",
      date: "Day 1",
      status: order.orderStatus !== "confirmed" ? "completed" : "current",
    },
    {
      title: "Dispatched via BlueDart Express",
      description: `Handed over to BlueDart Air Express. Tracking AWB: ${order.trackingNumber}`,
      date: "Day 2",
      status:
        order.orderStatus === "shipped" ||
        order.orderStatus === "out_for_delivery" ||
        order.orderStatus === "delivered"
          ? "completed"
          : order.orderStatus === "processing"
          ? "current"
          : "upcoming",
    },
    {
      title: "In Transit (Air Cargo Hub)",
      description: "Dispatched via air courier to destination city sorting hub.",
      date: "Day 3",
      status:
        order.orderStatus === "out_for_delivery" || order.orderStatus === "delivered"
          ? "completed"
          : order.orderStatus === "shipped"
          ? "current"
          : "upcoming",
    },
    {
      title: "Out for Delivery & Handover",
      description: `Delivery by ${order.estimatedDelivery} at your doorstep.`,
      date: order.estimatedDelivery,
      status:
        order.orderStatus === "delivered"
          ? "completed"
          : order.orderStatus === "out_for_delivery"
          ? "current"
          : "upcoming",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-neutral-500 mb-6 font-poppins">
        <Link href="/account" className="hover:text-brand-gold">
          Dashboard
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/account/orders" className="hover:text-brand-gold">
          Orders
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-brand-gold font-semibold">{order.orderNumber}</span>
      </div>

      {/* Header Card */}
      <div className="bg-white border border-brand-border rounded-3xl p-6 sm:p-8 mb-8 space-y-4 shadow-luxury">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-border pb-6">
          <div>
            <span className="text-xs uppercase font-bold text-brand-gold tracking-widest block mb-1 font-poppins">
              Live Shipment Status
            </span>
            <h1 className="text-2xl font-serif text-brand-text font-normal">
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 font-light">
              Courier: <strong className="text-brand-text font-medium">{order.courierPartner}</strong> • AWB:{" "}
              <strong className="font-mono text-brand-maroon">{order.trackingNumber}</strong>
            </p>
          </div>

          <div className="sm:text-right space-y-1">
            <span className="text-xs text-neutral-500 block font-light">Expected Arrival Date</span>
            <span className="text-xl font-bold font-serif text-brand-maroon block">
              {order.estimatedDelivery}
            </span>
            <span className="inline-block px-3 py-0.5 rounded-full text-xs uppercase font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-poppins">
              {order.orderStatus.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Tracking Timeline Stepper */}
        <div className="py-6 space-y-8 relative pl-6 sm:pl-8 border-l-2 border-brand-border ml-4">
          {steps.map((step, idx) => (
            <div key={idx} className="relative group">
              {/* Step Icon / Dot */}
              <div
                className={`absolute -left-[31px] sm:-left-[39px] top-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  step.status === "completed"
                    ? "bg-brand-gold text-white border-brand-gold shadow-md"
                    : step.status === "current"
                    ? "bg-white text-brand-maroon border-brand-maroon animate-pulse"
                    : "bg-brand-ivory text-neutral-400 border-brand-border"
                }`}
              >
                {step.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : step.status === "current" ? (
                  <Clock className="w-4 h-4" />
                ) : (
                  <span className="text-[11px] font-bold font-poppins">{idx + 1}</span>
                )}
              </div>

              {/* Step Info */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3
                    className={`font-serif text-base font-semibold ${
                      step.status === "completed" || step.status === "current"
                        ? "text-brand-text"
                        : "text-neutral-400"
                    }`}
                  >
                    {step.title}
                  </h3>
                  <span className="text-[11px] text-brand-maroon font-semibold font-poppins">{step.date}</span>
                </div>
                <p className="text-xs text-neutral-500 font-light">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Delivery Details & Invoice */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-brand-border text-xs">
          <div className="space-y-1">
            <span className="text-neutral-500 text-[10px] uppercase font-poppins block">Delivery Destination</span>
            <p className="font-bold text-brand-text font-poppins">{order.customerName}</p>
            <p className="text-neutral-600 font-light">{order.shippingAddress.street}</p>
            <p className="text-neutral-600 font-light">
              {order.shippingAddress.city}, {order.shippingAddress.state} - <strong>{order.shippingAddress.pincode}</strong>
            </p>
          </div>

          <div className="sm:text-right space-y-2 font-poppins">
            <Link
              href={`/checkout/success?orderNumber=${order.orderNumber}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-ivory hover:bg-white border border-brand-gold/60 text-brand-maroon font-semibold text-xs rounded-full shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Download Tax Invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
