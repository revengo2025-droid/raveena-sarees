import React from "react";
import { RotateCcw, CheckCircle } from "lucide-react";

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans space-y-8">
      <div className="border-b border-brand-border pb-6">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block mb-1 font-poppins">
          Peace of Mind
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          7-Day Return & Exchange Policy
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-light">
          Last updated: 2026 • Ravina Sarees Handlooms India
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed font-light">
        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-brand-gold" /> 1. Doorstep 7-Day Returns & Exchanges
          </h2>
          <p>
            At Ravina Sarees, your absolute delight is our paramount commitment. If the drape, shade, or weave
            does not completely enchant you, you may request an exchange or full refund within <strong>7 days</strong> of
            receiving your shipment.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">
            2. Condition for Return & Silk Mark Integrity
          </h2>
          <p>To qualify for a hassle-free return or exchange:</p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>The saree must remain unworn, unwashed, and in its pristine original folding.</li>
            <li>The official <strong>Silk Mark India</strong> tag and brand security tag must remain intact and uncut.</li>
            <li>The unstitched blouse piece must not have been detached, cut, or tailored.</li>
            <li>Original gold foil luxury packaging and invoices must accompany the returned parcel.</li>
          </ul>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> 3. Complimentary Doorstep Reverse Pickup
          </h2>
          <p>
            Once you submit a return request via your dashboard or WhatsApp concierge (<a href="https://wa.me/917780756009" className="text-brand-maroon hover:underline font-medium">+91 77807 56009</a>),
            we arrange a complimentary BlueDart reverse courier pickup from your address. You do not have to pay any return shipping charges.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">
            4. Refund Processing
          </h2>
          <p>
            Upon receipt of the returned saree at our atelier, our master drapers inspect the piece.
            Refunds are initiated within 24 hours to your original payment method (Bank Account, UPI, or Credit Card).
          </p>
        </section>
      </div>
    </div>
  );
}
