import React from "react";
import { Truck, ShieldCheck, Clock } from "lucide-react";

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans space-y-8">
      <div className="border-b border-brand-border pb-6">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block mb-1 font-poppins">
          Client Information
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          Pan-India Shipping & Delivery Policy
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-light">
          Last updated: 2026 • Ravina Sarees Flagship Atelier, Marthadi, Bejjur, Telangana
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed font-light">
        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-gold" /> 1. Complimentary Insured Air Shipping
          </h2>
          <p>
            Ravina Sarees offers complimentary express air shipping across all serviceable pin codes in India
            on orders above ₹5,000. For orders below this threshold, a flat nominal express fee of ₹250 applies.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-gold" /> 2. Dispatch & Delivery Timelines
          </h2>
          <p>
            All sarees undergo final quality audits (fall and pico finishing, zari inspection) at our atelier
            before being packaged in luxury keepsake boxes. Orders are dispatched within 24 to 48 hours.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li><strong>Telangana & South India:</strong> 1 to 2 Business Days.</li>
            <li><strong>Major Metros (Bengaluru, Chennai, Mumbai, Delhi NCR, Kolkata):</strong> 2 to 3 Business Days.</li>
            <li><strong>Rest of India:</strong> 3 to 4 Business Days.</li>
          </ul>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-brand-gold" /> 3. 100% Transit Insurance
          </h2>
          <p>
            Every single saree parcel dispatched by Ravina Sarees is fully insured against damage or loss in transit.
            A unique BlueDart AWB tracking number is shared via SMS, WhatsApp, and Email immediately upon dispatch.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">
            4. Cash on Delivery (COD)
          </h2>
          <p>
            Cash on Delivery is available for eligible pin codes across India for orders up to ₹50,000.
            Our courier partners accept cash and doorstep UPI QR scans upon delivery.
          </p>
        </section>
      </div>
    </div>
  );
}
