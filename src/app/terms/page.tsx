import React from "react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans space-y-8">
      <div className="border-b border-brand-border pb-6">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block mb-1 font-poppins">
          Legal Agreement
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          Terms & Conditions of Service
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-light">
          Effective Date: 2026 • Ravina Sarees India
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed font-light">
        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">1. Handloom Authenticity & Nuances</h2>
          <p>
            Due to the pure handcrafted nature of wooden pit looms, subtle variations in weaving motifs,
            slubs, or zari sheen are inherent hallmarks of handloom authenticity and not defects.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">2. Color Representation</h2>
          <p>
            While we calibrate all high-definition photography under studio lighting to reflect authentic silk dyes,
            variations may occur depending on individual screen brightness and display profiles.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">3. Pricing & Taxes</h2>
          <p>
            All prices are listed in Indian National Rupees (INR ₹) and are inclusive of 12%
            statutory Handloom Goods & Services Tax (GST).
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">4. Jurisdiction</h2>
          <p>
            Any disputes arising out of transactions on this platform shall be subject to the exclusive jurisdiction of the
            competent courts in Telangana, India.
          </p>
        </section>
      </div>
    </div>
  );
}
