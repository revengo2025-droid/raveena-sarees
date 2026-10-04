"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  MapPin,
  CreditCard,
  Truck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Plus,
  QrCode,
  Building2,
  Banknote,
  Sparkles,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { SavedAddress, PaymentMethod } from "@/lib/types";
import Script from "next/script";
import { createOrderAction, verifyPaymentAction } from "@/app/actions/orders";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    giftWrapFee,
    giftWrap,
    giftMessage,
    appliedCoupon,
    user,
    savedAddresses,
    addAddress,
    placeOrder,
    showToast,
  } = useApp();

  // Contact Info
  const [customerName, setCustomerName] = useState(user?.fullName || "");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");

  // Address Selection or New Address
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses[0]?.id || "new"
  );
  const [isAddingNewAddress, setIsAddingNewAddress] = useState<boolean>(
    savedAddresses.length === 0
  );

  // New Address Form fields
  const [newName, setNewName] = useState(user?.fullName || "");
  const [newPhone, setNewPhone] = useState(user?.phone || "");
  const [newStreet, setNewStreet] = useState("");
  const [newLandmark, setNewLandmark] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");

  // Payment Method (Default Razorpay online, Cash on Delivery below)
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [isProcessing, setIsProcessing] = useState(false);

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h2 className="text-2xl font-serif mb-2">No Items to Checkout</h2>
        <p className="text-xs text-neutral-500 mb-6 font-light">
          Your shopping bag is empty. Please select a saree from our collection first.
        </p>
        <Link
          href="/shop"
          className="btn-primary px-6 py-2.5 text-xs rounded-full font-poppins font-semibold shadow-md"
        >
          Explore Sarees
        </Link>
      </div>
    );
  }

  // Mandatory Patron Login / Account Creation Gate
  if (!user) {
    return (
      <div className="min-h-[75vh] bg-brand-white flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-center text-brand-text font-sans">
        <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-8 sm:p-10 shadow-luxury space-y-6">
          <div className="w-16 h-16 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mx-auto text-brand-gold shadow-sm">
            <Lock className="w-8 h-8 opacity-80" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-brand-gold font-poppins">
              Mandatory Patron Authentication
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal mt-1.5">
              Sign In to Complete Order
            </h1>
            <p className="text-xs text-neutral-500 font-light mt-2 leading-relaxed">
              To guarantee authenticated Silk Mark certificate delivery, insured BlueDart express tracking, and verified GST tax invoices, an account is mandatory to complete your order.
            </p>
          </div>

          {/* Reserved Bag Snapshot */}
          <div className="bg-brand-ivory p-4 rounded-2xl border border-brand-border text-left space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Items in Bag:</span>
              <span className="font-semibold text-brand-text">
                {cart.reduce((a, b) => a + b.quantity, 0)} Saree(s)
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Order Total:</span>
              <span className="font-bold text-brand-maroon font-serif text-sm">
                {formatINR(cartTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-3 font-poppins pt-2">
            <Link
              href="/auth/login?redirect=/checkout"
              className="btn-primary w-full py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2"
            >
              Sign In to Your Account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/register?redirect=/checkout"
              className="w-full py-3.5 bg-brand-ivory hover:bg-white border border-brand-border text-brand-text hover:border-brand-gold text-xs font-semibold rounded-full flex items-center justify-center transition-colors shadow-sm"
            >
              Create Patron Account
            </Link>
          </div>

          <p className="text-[10px] text-neutral-400 font-light">
            Your shopping bag is safely reserved. Once signed in, you will be returned directly to complete checkout.
          </p>
        </div>
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    let shippingAddress: SavedAddress;

    if (isAddingNewAddress || !selectedAddressId) {
      if (!newName || !newPhone || !newStreet || !newCity || !newPincode) {
        showToast("Please fill in all mandatory delivery address fields.", "error");
        return;
      }
      shippingAddress = addAddress({
        name: newName,
        phone: newPhone,
        street: newStreet,
        landmark: newLandmark,
        city: newCity,
        state: newState,
        pincode: newPincode,
        isDefault: true,
        type: "Home",
      });
    } else {
      const existing = savedAddresses.find((a) => a.id === selectedAddressId);
      if (!existing) {
        showToast("Please select or add a delivery address.", "error");
        return;
      }
      shippingAddress = existing;
    }

    setIsProcessing(true);

    try {
      const orderPayload = {
        customerName,
        customerEmail,
        customerPhone: customerPhone.replace(/\D/g, "").slice(-10) || "7780756009",
        shippingAddress: {
          name: shippingAddress.name,
          phone: shippingAddress.phone.replace(/\D/g, "").slice(-10) || "7780756009",
          streetAddress: shippingAddress.street,
          landmark: shippingAddress.landmark || "",
          city: shippingAddress.city,
          state: shippingAddress.state,
          pincode: shippingAddress.pincode,
          isDefault: Boolean(shippingAddress.isDefault),
        },
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          selectedColor: item.selectedColor,
          price: item.product.discountPrice || item.product.price,
          quantity: item.quantity,
          imageUrl: item.product.images[0] || "",
        })),
        paymentMethod,
        couponCode: appliedCoupon?.code,
        giftWrap,
        giftMessage: giftWrap ? giftMessage : undefined,
      };

      const result = await createOrderAction(orderPayload);

      if (!result.success || !result.data) {
        showToast(result.error || "Failed to create order. Please try again.", "error");
        setIsProcessing(false);
        return;
      }

      const orderData = result.data;

      // Handle Online Razorpay Payment
      if (
        orderData.isOnlinePayment &&
        typeof window !== "undefined" &&
        (window as any).Razorpay &&
        orderData.razorpayOrderId &&
        !orderData.razorpayOrderId.includes("mock")
      ) {
        const options = {
          key: orderData.razorpayKeyId,
          amount: Math.round(orderData.totalAmount * 100),
          currency: "INR",
          name: "Ravina Sarees",
          description: `Royal Handloom Saree Order #${orderData.orderNumber}`,
          image: "https://ravinasarees.in/images/hero/hero-banner-1.png",
          order_id: orderData.razorpayOrderId,
          handler: async function (response: any) {
            await verifyPaymentAction({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderNumber: orderData.orderNumber,
            });

            placeOrder({
              customerName,
              customerEmail,
              customerPhone,
              shippingAddress,
              paymentMethod,
              paymentId: response.razorpay_payment_id,
            });

            setIsProcessing(false);
            router.push(`/checkout/success?orderNumber=${orderData.orderNumber}`);
          },
          prefill: {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          theme: {
            color: "#C8A24D",
          },
          modal: {
            ondismiss: function () {
              setIsProcessing(false);
              showToast("Payment window closed. You can retry anytime.", "info");
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        // Fallback for Cash on Delivery or Test simulation
        placeOrder({
          customerName,
          customerEmail,
          customerPhone,
          shippingAddress,
          paymentMethod,
          paymentId: orderData.razorpayOrderId || `order_${Date.now()}`,
        });

        setIsProcessing(false);
        router.push(`/checkout/success?orderNumber=${orderData.orderNumber}`);
      }
    } catch (err: any) {
      setIsProcessing(false);
      showToast(err.message || "An error occurred during checkout", "error");
    }
  };

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      {/* 1. Header */}
      <div className="border-b border-brand-border pb-6 mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            Royal Secure Checkout
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-light">
            Complete your order with 256-bit encrypted Razorpay payment.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-brand-maroon bg-brand-ivory px-3.5 py-1.5 rounded-full border border-brand-border font-poppins font-medium shadow-sm">
          <Lock className="w-3.5 h-3.5 text-brand-gold" /> 100% Encrypted & Safe
        </div>
      </div>

      <form onSubmit={handlePlaceOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Checkout Form (7 cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Step 1: Contact Information */}
            <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
              <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-gold text-white font-bold text-xs flex items-center justify-center font-poppins">
                  1
                </span>
                Patron Contact Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                    Mobile Phone (For Dispatch Updates) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                    Email Address (For Tax Invoice & Tracking) *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Delivery Address Selection */}
            <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-brand-gold text-white font-bold text-xs flex items-center justify-center font-poppins">
                    2
                  </span>
                  Pan-India Delivery Address
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddingNewAddress(!isAddingNewAddress)}
                  className="text-xs text-brand-maroon hover:text-brand-gold flex items-center gap-1 font-poppins font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isAddingNewAddress ? "Use Saved Address" : "Add New Address"}
                </button>
              </div>

              {!isAddingNewAddress && savedAddresses.length > 0 ? (
                <div className="space-y-3">
                  {savedAddresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40 shadow-sm"
                          : "bg-white border-brand-border hover:border-brand-gold/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="deliveryAddress"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-brand-gold"
                      />
                      <div className="text-xs space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-brand-text">{addr.name}</strong>
                          <span className="text-[10px] text-brand-maroon bg-brand-ivory px-2 py-0.5 rounded-full border border-brand-border font-poppins font-medium">
                            {addr.type || "Home"}
                          </span>
                        </div>
                        <p className="text-neutral-600 font-light">{addr.street}</p>
                        {addr.landmark && (
                          <p className="text-neutral-500 text-[11px] font-light">Landmark: {addr.landmark}</p>
                        )}
                        <p className="text-neutral-600 font-light">
                          {addr.city}, {addr.state} - <strong>{addr.pincode}</strong>
                        </p>
                        <p className="text-neutral-500 text-[11px] font-light">Phone: {addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                /* New Address Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Recipient Name *
                    </label>
                    <input
                      type="text"
                      required={isAddingNewAddress}
                      placeholder="e.g. Ananya Reddy"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="tel"
                      required={isAddingNewAddress}
                      placeholder="+91 77807 56009"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Flat / House No. / Building / Street Address *
                    </label>
                    <input
                      type="text"
                      required={isAddingNewAddress}
                      placeholder="e.g. Flat 302, Royal Residency, Road No. 12"
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      Landmark (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Near Main Market"
                      value={newLandmark}
                      onChange={(e) => setNewLandmark(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      required={isAddingNewAddress}
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      State *
                    </label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    >
                      <option value="Telangana">Telangana</option>
                      <option value="Andhra Pradesh">Andhra Pradesh</option>
                      <option value="Karnataka">Karnataka</option>
                      <option value="Tamil Nadu">Tamil Nadu</option>
                      <option value="Maharashtra">Maharashtra</option>
                      <option value="Delhi NCR">Delhi NCR</option>
                      <option value="West Bengal">West Bengal</option>
                      <option value="Gujarat">Gujarat</option>
                      <option value="Other">Other State</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      required={isAddingNewAddress}
                      maxLength={6}
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value)}
                      className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method Selection */}
            <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
              <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-brand-gold text-white font-bold text-xs flex items-center justify-center font-poppins">
                  3
                </span>
                Select Payment Method
              </h2>

              <div className="space-y-3 text-xs">
                {/* 1. Razorpay (Default & Fixed) */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "razorpay"
                      ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40 shadow-sm"
                      : "bg-white border-brand-border hover:border-brand-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "razorpay"}
                    onChange={() => setPaymentMethod("razorpay")}
                    className="mt-1 accent-brand-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-brand-text flex items-center gap-1.5 font-poppins">
                        <Sparkles className="w-4 h-4 text-brand-gold" /> Razorpay Online Payment (Default)
                      </strong>
                      <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-poppins font-medium">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="text-neutral-500 text-[11px] mt-1 font-light">
                      Pay securely via UPI (Google Pay, PhonePe, Paytm, BHIM), Credit/Debit Card, NetBanking or Cred.
                    </p>
                  </div>
                </label>

                {/* 2. Cash on Delivery (COD) Below Razorpay */}
                <label
                  className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                    paymentMethod === "cod"
                      ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40 shadow-sm"
                      : "bg-white border-brand-border hover:border-brand-gold/40"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="mt-1 accent-brand-gold"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <strong className="text-brand-text flex items-center gap-1.5 font-poppins">
                        <Banknote className="w-4 h-4 text-brand-gold" /> Cash on Delivery (COD)
                      </strong>
                      <span className="text-[10px] text-neutral-500 font-poppins">Pan-India Doorstep Pay</span>
                    </div>
                    <p className="text-neutral-500 text-[11px] mt-1 font-light">
                      Pay cash or scan delivery agent UPI QR at your doorstep upon receiving your parcel.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Sidebar Order Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 space-y-5 sticky top-28 shadow-card">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-brand-text border-b border-brand-border pb-3">
                Order Review ({cart.length} Sarees)
              </h3>

              {/* Items preview */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1 divide-y divide-brand-border">
                {cart.map((item) => (
                  <div key={`${item.product.id}-${item.selectedColor}`} className="pt-2 flex gap-3 items-center">
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-14 object-cover rounded-xl border border-brand-border shrink-0 shadow-sm"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="text-brand-text font-medium truncate">{item.product.name}</p>
                      <p className="text-[11px] text-neutral-500 font-light">
                        Qty: {item.quantity} • Shade: {item.selectedColor}
                      </p>
                    </div>
                    <span className="text-xs font-bold font-serif text-brand-maroon">
                      {formatINR((item.product.discountPrice || item.product.price) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t border-brand-border pt-4">
                <div className="flex justify-between text-neutral-600 font-light">
                  <span>Bag Subtotal</span>
                  <span>{formatINR(cartSubtotal)}</span>
                </div>
                {cartDiscount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount Savings</span>
                    <span>-{formatINR(cartDiscount)}</span>
                  </div>
                )}
                {giftWrap && (
                  <div className="flex justify-between text-brand-gold font-medium">
                    <span>Bridal Packaging</span>
                    <span>+{formatINR(giftWrapFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-neutral-600 font-light">
                  <span>Express Pan-India Shipping</span>
                  <span className="text-emerald-700 font-semibold font-poppins">FREE</span>
                </div>
                <div className="flex justify-between text-base font-bold text-brand-text pt-3 border-t border-brand-border">
                  <span>Total Payable</span>
                  <span className="text-2xl font-bold font-serif text-brand-maroon">
                    {formatINR(cartTotal)}
                  </span>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                type="submit"
                disabled={isProcessing}
                className="btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2 disabled:opacity-50 font-poppins"
              >
                {isProcessing ? (
                  <span>Authorizing Payment...</span>
                ) : (
                  <>
                    Authorize & Place Order <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center text-[10px] text-neutral-500 space-y-1 font-poppins">
                <p>🔒 256-Bit SSL Encrypted Transaction</p>
                <p>7-Day Easy Exchange Policy Guaranteed</p>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
