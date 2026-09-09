import React from "react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans space-y-8">
      <div className="border-b border-brand-border pb-6">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block mb-1 font-poppins">
          Data Protection
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          Privacy Policy & Data Security
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-light">
          Effective Date: 2026 • Ravina Sarees India
        </p>
      </div>

      <div className="space-y-6 text-xs sm:text-sm text-neutral-700 leading-relaxed font-light">
        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">1. Information Collection</h2>
          <p>
            When you browse Ravina Sarees or place an order, we collect essential information required to fulfill
            your saree delivery: name, shipping address, mobile number for courier updates, and email address for tax invoices.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">2. Payment Security (Razorpay)</h2>
          <p>
            We do not store credit card numbers, debit card PINs, or UPI passcodes on our servers. All transactions
            are processed through PCI-DSS Level 1 compliant gateways (Razorpay) with 256-bit SSL encryption.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">3. Information Sharing</h2>
          <p>
            We strictly do not sell, rent, or trade patron contact details with third-party advertisers. Information is
            shared solely with trusted logistics partners (BlueDart) to facilitate order tracking and doorstep delivery.
          </p>
        </section>

        <section className="space-y-2 bg-brand-ivory p-6 rounded-2xl border border-brand-border">
          <h2 className="text-lg font-serif text-brand-text font-semibold">4. Patron Rights</h2>
          <p>
            You have the right to request deletion of your account and saved delivery addresses at any time by
            contacting <a href="mailto:ravieenasarees@gmail.com" className="text-brand-maroon hover:underline">ravieenasarees@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
