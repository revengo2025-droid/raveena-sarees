"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  Loader2,
  Lock,
  MapPin,
  Plus,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import { SITE } from "@/lib/site";
import { INDIAN_MOBILE_RE, normaliseIndianMobile } from "@/lib/geo/india";
import { createOrderAction, verifyPaymentAction } from "@/app/actions/orders";
import { saveAddressAction } from "@/app/actions/addresses";
import {
  AddressForm,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressErrors,
  type AddressFormValue,
} from "@/components/AddressForm";

type Step = 1 | 2 | 3;
const STEP_LABELS = ["Contact", "Address", "Payment", "Confirmation"];

const inputCls =
  "w-full bg-brand-ivory border rounded-xl px-3.5 py-3 text-base sm:text-sm text-brand-text focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const labelCls = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export default function CheckoutPage() {
  const router = useRouter();
  const {
    cart,
    cartSubtotal,
    cartDiscount,
    cartTotal,
    shippingFee,
    giftWrapFee,
    giftWrap,
    giftMessage,
    appliedCoupon,
    user,
    authReady,
    savedAddresses,
    clearCart,
    showToast,
  } = useApp();

  const [step, setStep] = useState<Step>(1);

  // Step 1: contact
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactErrors, setContactErrors] = useState<{ name?: string; phone?: string }>({});

  // Step 2: address
  const [selectedId, setSelectedId] = useState<string>("new");
  const [form, setForm] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [addressNotice, setAddressNotice] = useState<string | null>(null);

  // Step 3: payment
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [summaryOpen, setSummaryOpen] = useState(false);

  // Prefill from the account once it has loaded
  useEffect(() => {
    if (!user) return;
    setContactName((n) => n || user.fullName || "");
    setContactPhone((p) => p || user.phone || "");
  }, [user]);

  // Default to the customer's default saved address
  useEffect(() => {
    if (savedAddresses.length > 0) {
      setSelectedId((cur) => (cur === "new" ? (savedAddresses.find((a) => a.isDefault) || savedAddresses[0]).id : cur));
    }
  }, [savedAddresses]);

  const itemCount = useMemo(() => cart.reduce((n, i) => n + i.quantity, 0), [cart]);

  // ───────────── Gates ─────────────
  if (!authReady) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-sm text-neutral-500" role="status">
        <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading checkout…
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-8 text-center text-brand-text font-sans">
        <h1 className="text-2xl font-serif mb-2">Your bag is empty</h1>
        <p className="text-sm text-neutral-500 mb-6 font-light">Add a saree to your bag to start checkout.</p>
        <Link href="/shop" className="btn-primary px-6 min-h-[44px] inline-flex items-center text-xs rounded-full font-poppins font-semibold shadow-md">
          Explore Sarees
        </Link>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] bg-brand-white flex flex-col items-center justify-center py-12 px-4 text-center text-brand-text font-sans">
        <div className="max-w-md w-full bg-white border border-brand-border rounded-3xl p-8 shadow-luxury space-y-5">
          <div className="w-14 h-14 rounded-full bg-brand-ivory border border-brand-border flex items-center justify-center mx-auto text-brand-gold">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-serif font-normal">Sign in to place your order</h1>
            <p className="text-sm text-neutral-500 font-light mt-2 leading-relaxed">
              An account lets you track your order, request returns and get support. Your bag stays saved.
            </p>
          </div>
          <div className="bg-brand-ivory p-4 rounded-2xl border border-brand-border text-left space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Items</span><span className="font-semibold">{itemCount}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Total</span><span className="font-bold text-brand-maroon font-serif">{formatINR(cartTotal)}</span></div>
          </div>
          <div className="space-y-3 font-poppins">
            <Link href="/auth/login?redirect=/checkout" className="btn-primary w-full min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center justify-center gap-2">
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/auth/register?redirect=/checkout" className="w-full min-h-[48px] bg-brand-ivory border border-brand-border hover:border-brand-gold text-xs font-semibold rounded-full flex items-center justify-center">
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ───────────── Step handlers ─────────────
  const goToAddress = () => {
    const errs: { name?: string; phone?: string } = {};
    if (contactName.trim().length < 2) errs.name = "Please enter your full name";
    if (!INDIAN_MOBILE_RE.test(normaliseIndianMobile(contactPhone))) errs.phone = "Enter a valid 10-digit Indian mobile number";
    setContactErrors(errs);
    if (Object.keys(errs).length === 0) setStep(2);
  };

  const patchForm = (p: Partial<AddressFormValue>) => {
    setForm((f) => ({ ...f, ...p }));
    setAddressErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof AddressFormValue]);
      return next;
    });
  };

  const selectedSaved = selectedId !== "new" ? savedAddresses.find((a) => a.id === selectedId) : undefined;
  const savedIncomplete = selectedSaved && (!selectedSaved.houseNumber || !selectedSaved.locality);

  const goToPayment = () => {
    setAddressNotice(null);
    if (selectedSaved) {
      if (savedIncomplete) {
        setAddressNotice("This saved address is missing some details. Please edit it in your address book, or add a new address.");
        return;
      }
      setStep(3);
      return;
    }
    const errs = validateAddress(form, { requireContact: false });
    setAddressErrors(errs);
    if (Object.keys(errs).length === 0) setStep(3);
  };

  // The address sent to the server (it validates again before creating the order)
  const buildShippingAddress = () => {
    if (selectedSaved) {
      return {
        name: selectedSaved.name,
        phone: normaliseIndianMobile(selectedSaved.phone),
        houseNumber: selectedSaved.houseNumber || "",
        streetAddress: selectedSaved.street,
        locality: selectedSaved.locality || "",
        landmark: selectedSaved.landmark || undefined,
        city: selectedSaved.city,
        state: selectedSaved.state,
        pincode: selectedSaved.pincode,
        addressType: (selectedSaved.type || "Home").toLowerCase() as "home" | "office" | "other",
        isDefault: Boolean(selectedSaved.isDefault),
      };
    }
    return {
      name: contactName.trim(),
      phone: normaliseIndianMobile(contactPhone),
      houseNumber: form.houseNumber.trim(),
      streetAddress: form.street.trim(),
      locality: form.locality.trim(),
      landmark: form.landmark.trim() || undefined,
      city: form.city.trim(),
      state: form.state,
      pincode: form.pincode,
      addressType: form.type.toLowerCase() as "home" | "office" | "other",
      isDefault: form.isDefault,
    };
  };

  const finishSuccess = (orderNumber: string, verifying = false) => {
    clearCart();
    router.push(`/checkout/success?orderNumber=${encodeURIComponent(orderNumber)}${verifying ? "&verifying=1" : ""}`);
  };

  const handlePlaceOrder = async () => {
    if (isProcessing) return;
    setPaymentError(null);
    setIsProcessing(true);

    try {
      const shippingAddress = buildShippingAddress();

      // Optional: remember the address (and make it the default) before ordering
      if (!selectedSaved && form.isDefault) {
        const saved = await saveAddressAction({ ...shippingAddress, isDefault: true });
        if (!saved.success) showToast("We could not save this address to your account, but your order will continue.", "info");
      }

      const result = await createOrderAction({
        customerName: contactName.trim(),
        customerEmail: user.email,
        customerPhone: normaliseIndianMobile(contactPhone),
        shippingAddress,
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
      });

      if (!result.success || !result.data) {
        setPaymentError(result.error || "We could not place your order. Please try again.");
        setIsProcessing(false);
        return;
      }

      const order = result.data;

      // Cash on delivery: nothing to pay now
      if (!order.isOnlinePayment) {
        finishSuccess(order.orderNumber);
        return;
      }

      const razorpay = typeof window !== "undefined" ? (window as any).Razorpay : undefined;
      const isSimulated = !order.razorpayOrderId || order.razorpayOrderId.includes("mock");

      // Local development without Razorpay keys: the server only accepts this simulation outside production
      if (isSimulated) {
        const sim = await verifyPaymentAction({
          razorpayOrderId: order.razorpayOrderId || "order_mock",
          razorpayPaymentId: `pay_mock_${Date.now()}`,
          razorpaySignature: `mock_sig_${Date.now()}`,
          orderNumber: order.orderNumber,
        });
        if (sim.success) finishSuccess(order.orderNumber);
        else {
          setPaymentError("Online payment is not available right now. Please choose Cash on Delivery.");
          setIsProcessing(false);
        }
        return;
      }

      if (!razorpay) {
        setPaymentError("The payment window could not load. Check your connection and try again.");
        setIsProcessing(false);
        return;
      }

      const rzp = new razorpay({
        key: order.razorpayKeyId,
        amount: Math.round(order.totalAmount * 100),
        currency: "INR",
        name: SITE.name,
        description: `Order ${order.orderNumber}`,
        image: `${SITE.url}${SITE.logo}`,
        order_id: order.razorpayOrderId,
        prefill: { name: contactName.trim(), email: user.email, contact: normaliseIndianMobile(contactPhone) },
        theme: { color: "#C8A24D" },
        // The order only becomes "paid" after the SERVER verifies the signature (and the webhook confirms it)
        handler: async (response: any) => {
          const verified = await verifyPaymentAction({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderNumber: order.orderNumber,
          });
          // If verification is delayed we still show the order; the page reads the real payment status
          finishSuccess(order.orderNumber, !verified.success);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setPaymentError("Payment was not completed. You have not been charged. You can try again.");
          },
        },
      });
      rzp.on?.("payment.failed", () => {
        setIsProcessing(false);
        setPaymentError("Payment failed. If money was debited it will be refunded by your bank. Please try again.");
      });
      rzp.open();
    } catch {
      setPaymentError("Something went wrong. Please check your connection and try again.");
      setIsProcessing(false);
    }
  };

  // ───────────── UI ─────────────
  const summary = (
    <div className="space-y-4">
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 divide-y divide-brand-border">
        {cart.map((item) => (
          <div key={`${item.product.id}-${item.selectedColor}`} className="pt-3 first:pt-0 flex gap-3 items-center">
            <div className="relative w-12 h-14 rounded-xl overflow-hidden border border-brand-border shrink-0">
              {item.product.images[0] && <Image src={item.product.images[0]} alt="" fill sizes="48px" className="object-cover" />}
            </div>
            <div className="flex-1 min-w-0 text-xs">
              <p className="text-brand-text font-medium line-clamp-2">{item.product.name}</p>
              <p className="text-[11px] text-neutral-500">Qty {item.quantity}{item.selectedColor ? ` • ${item.selectedColor}` : ""}</p>
            </div>
            <span className="text-xs font-bold font-serif text-brand-maroon">{formatINR((item.product.discountPrice || item.product.price) * item.quantity)}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2 text-sm border-t border-brand-border pt-4">
        <div className="flex justify-between text-neutral-600"><span>Subtotal</span><span>{formatINR(cartSubtotal)}</span></div>
        {cartDiscount > 0 && <div className="flex justify-between text-emerald-700 font-medium"><span>Discount</span><span>-{formatINR(cartDiscount)}</span></div>}
        {giftWrap && <div className="flex justify-between text-neutral-600"><span>Gift packaging</span><span>+{formatINR(giftWrapFee)}</span></div>}
        <div className="flex justify-between text-neutral-600">
          <span>Shipping</span>
          <span className={shippingFee === 0 ? "text-emerald-700 font-semibold" : ""}>{shippingFee === 0 ? "Free" : formatINR(shippingFee)}</span>
        </div>
        <div className="flex justify-between text-base font-bold text-brand-text pt-3 border-t border-brand-border">
          <span>Total</span>
          <span className="text-xl font-serif text-brand-maroon">{formatINR(cartTotal)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto font-sans">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

      <div className="flex items-center justify-between gap-3 mb-5">
        <h1 className="text-2xl sm:text-3xl font-serif font-normal">Checkout</h1>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-brand-maroon bg-brand-ivory px-3 py-1.5 rounded-full border border-brand-border font-poppins font-medium">
          <Lock className="w-3.5 h-3.5 text-brand-gold" /> Secure payment by Razorpay
        </span>
      </div>

      {/* Progress */}
      <nav aria-label="Checkout progress" className="mb-6">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <li key={label} className="flex-1 flex items-center gap-1 sm:gap-2" aria-current={active ? "step" : undefined}>
                <button
                  type="button"
                  disabled={!done}
                  onClick={() => done && setStep(n as Step)}
                  className="flex items-center gap-1.5 min-w-0 disabled:cursor-default"
                >
                  <span
                    className={`w-7 h-7 shrink-0 rounded-full text-xs font-bold flex items-center justify-center font-poppins ${
                      done ? "bg-emerald-600 text-white" : active ? "bg-brand-gold text-white" : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {done ? <Check className="w-4 h-4" /> : n}
                  </span>
                  <span className={`text-[11px] sm:text-xs font-poppins truncate ${active ? "text-brand-text font-semibold" : "text-neutral-500"}`}>{label}</span>
                </button>
                {n < 4 && <span className={`flex-1 h-px ${done ? "bg-emerald-600" : "bg-neutral-200"}`} aria-hidden="true" />}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile order summary */}
      <div className="lg:hidden mb-5 bg-brand-ivory border border-brand-border rounded-2xl">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          className="w-full flex items-center justify-between px-4 min-h-[52px] text-sm font-poppins"
        >
          <span className="flex items-center gap-2 font-semibold">
            Order summary ({itemCount}) <ChevronDown className={`w-4 h-4 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
          </span>
          <span className="font-serif font-bold text-brand-maroon">{formatINR(cartTotal)}</span>
        </button>
        {summaryOpen && <div className="px-4 pb-4">{summary}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7">
          {/* ── Step 1: Contact ── */}
          {step === 1 && (
            <section className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-card" aria-labelledby="step-contact">
              <h2 id="step-contact" className="text-sm font-serif font-bold uppercase tracking-widest">1. Contact details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls} htmlFor="c-name">Full Name *</label>
                  <input id="c-name" autoComplete="name" className={`${inputCls} ${contactErrors.name ? "border-red-400" : "border-brand-border"}`} value={contactName} onChange={(e) => setContactName(e.target.value)} aria-invalid={!!contactErrors.name} />
                  {contactErrors.name && <p role="alert" className="text-[11px] text-red-600 mt-1">{contactErrors.name}</p>}
                </div>
                <div>
                  <label className={labelCls} htmlFor="c-phone">Mobile Number *</label>
                  <input id="c-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile number" className={`${inputCls} ${contactErrors.phone ? "border-red-400" : "border-brand-border"}`} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} aria-invalid={!!contactErrors.phone} />
                  {contactErrors.phone && <p role="alert" className="text-[11px] text-red-600 mt-1">{contactErrors.phone}</p>}
                </div>
              </div>
              <p className="text-xs text-neutral-500">Order updates will be sent to <strong>{user.email}</strong> and your mobile number.</p>
              <button type="button" onClick={goToAddress} className="btn-primary w-full sm:w-auto sm:px-10 min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2">
                Continue to Address <ArrowRight className="w-4 h-4" />
              </button>
            </section>
          )}

          {/* ── Step 2: Address ── */}
          {step === 2 && (
            <section className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-card" aria-labelledby="step-address">
              <h2 id="step-address" className="text-sm font-serif font-bold uppercase tracking-widest">2. Delivery address</h2>

              {savedAddresses.length > 0 && (
                <div role="radiogroup" aria-label="Saved addresses" className="space-y-2.5">
                  {savedAddresses.map((a) => (
                    <label key={a.id} className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${selectedId === a.id ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40" : "bg-white border-brand-border hover:border-brand-gold/40"}`}>
                      <input type="radio" name="address" className="mt-1 accent-brand-gold w-4 h-4" checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} />
                      <span className="text-sm leading-relaxed">
                        <strong className="font-poppins">{a.name}</strong>{" "}
                        <span className="text-[10px] uppercase text-neutral-400">{a.type || "Home"}{a.isDefault ? " • Default" : ""}</span>
                        <br />
                        <span className="text-neutral-600">{[a.houseNumber, a.street, a.locality].filter(Boolean).join(", ")}, {a.city}, {a.state} - {a.pincode}</span>
                        <br />
                        <span className="text-neutral-500 text-xs">Mobile: {a.phone}</span>
                      </span>
                    </label>
                  ))}
                  <label className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${selectedId === "new" ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40" : "bg-white border-brand-border hover:border-brand-gold/40"}`}>
                    <input type="radio" name="address" className="accent-brand-gold w-4 h-4" checked={selectedId === "new"} onChange={() => setSelectedId("new")} />
                    <span className="text-sm font-poppins font-medium inline-flex items-center gap-1.5"><Plus className="w-4 h-4 text-brand-gold" /> Deliver to a new address</span>
                  </label>
                </div>
              )}

              {selectedId === "new" && <AddressForm value={form} onChange={patchForm} errors={addressErrors} idPrefix="co" />}

              {addressNotice && (
                <p role="alert" className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" /> {addressNotice}{" "}
                  <Link href="/account/addresses" className="underline font-semibold">Open address book</Link>
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={() => setStep(1)} className="min-h-[48px] px-6 rounded-full border border-brand-border text-xs font-semibold inline-flex items-center justify-center gap-2 hover:border-brand-gold">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={goToPayment} className="btn-primary flex-1 sm:flex-none sm:px-10 min-h-[48px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2">
                  Continue to Payment <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )}

          {/* ── Step 3: Payment ── */}
          {step === 3 && (
            <section className="bg-white border border-brand-border rounded-3xl p-5 sm:p-6 space-y-5 shadow-card" aria-labelledby="step-payment">
              <h2 id="step-payment" className="text-sm font-serif font-bold uppercase tracking-widest">3. Payment</h2>

              <div className="text-xs bg-brand-ivory border border-brand-border rounded-2xl p-3.5 flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <span className="text-neutral-600 leading-relaxed">
                  <strong className="text-brand-text">Delivering to:</strong>{" "}
                  {(() => {
                    const a = buildShippingAddress();
                    return `${a.name}, ${[a.houseNumber, a.streetAddress, a.locality].filter(Boolean).join(", ")}, ${a.city}, ${a.state} - ${a.pincode}`;
                  })()}
                  <button type="button" onClick={() => setStep(2)} className="ml-2 underline text-brand-maroon font-semibold">Change</button>
                </span>
              </div>

              <div role="radiogroup" aria-label="Payment method" className="space-y-3">
                <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${paymentMethod === "razorpay" ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40" : "bg-white border-brand-border hover:border-brand-gold/40"}`}>
                  <input type="radio" name="payment" className="mt-1 accent-brand-gold w-4 h-4" checked={paymentMethod === "razorpay"} onChange={() => setPaymentMethod("razorpay")} />
                  <span className="flex-1 text-sm">
                    <strong className="font-poppins inline-flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-brand-gold" /> Pay online</strong>
                    <span className="block text-xs text-neutral-500 mt-1 leading-relaxed">UPI, cards, net banking and wallets through Razorpay. Your order is confirmed once the payment is verified.</span>
                  </span>
                </label>
                <label className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-colors ${paymentMethod === "cod" ? "bg-brand-ivory border-brand-gold ring-1 ring-brand-gold/40" : "bg-white border-brand-border hover:border-brand-gold/40"}`}>
                  <input type="radio" name="payment" className="mt-1 accent-brand-gold w-4 h-4" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                  <span className="flex-1 text-sm">
                    <strong className="font-poppins inline-flex items-center gap-1.5"><Banknote className="w-4 h-4 text-brand-gold" /> Cash on delivery</strong>
                    <span className="block text-xs text-neutral-500 mt-1 leading-relaxed">Pay when your order arrives.</span>
                  </span>
                </label>
              </div>

              {paymentError && (
                <p role="alert" className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {paymentError}
                </p>
              )}

              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button type="button" onClick={() => setStep(2)} disabled={isProcessing} className="min-h-[48px] px-6 rounded-full border border-brand-border text-xs font-semibold inline-flex items-center justify-center gap-2 hover:border-brand-gold disabled:opacity-50">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button type="button" onClick={handlePlaceOrder} disabled={isProcessing} className="btn-primary flex-1 sm:flex-none sm:px-10 min-h-[52px] text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-70">
                  {isProcessing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>) : paymentMethod === "cod" ? (<>Place Order • {formatINR(cartTotal)}</>) : (<>Pay {formatINR(cartTotal)} Securely</>)}
                </button>
              </div>

              <p className="text-[11px] text-neutral-500 leading-relaxed flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                We never see or store your card or UPI details. By placing your order you agree to our{" "}
                <Link href="/terms" className="underline">Terms</Link>,{" "}
                <Link href="/return-policy" className="underline">Return Policy</Link> and{" "}
                <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
              </p>
            </section>
          )}
        </div>

        {/* Desktop summary */}
        <aside className="hidden lg:block lg:col-span-5">
          <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 sticky top-28 shadow-card space-y-4">
            <h2 className="text-xs font-serif font-bold uppercase tracking-widest border-b border-brand-border pb-3">Order summary ({itemCount})</h2>
            {summary}
            <p className="text-[11px] text-neutral-500 text-center">Returns accepted within 7 days of delivery. See our <Link href="/return-policy" className="underline">return policy</Link>.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
