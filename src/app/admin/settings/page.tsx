"use client";

import React, { useState } from "react";
import { Save, MapPin, Sparkles, Truck } from "lucide-react";
import { useApp } from "@/lib/store";

export default function AdminSettingsPage() {
  const { showToast } = useApp();

  const [storeName, setStoreName] = useState("Ravina Sarees");
  const [domain, setDomain] = useState("ravinasarees.in");
  const [showroomAddress, setShowroomAddress] = useState(
    "Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana – 504224, India"
  );
  const [conciergePhone, setConciergePhone] = useState("+91 86884 72300");
  const [conciergeEmail, setConciergeEmail] = useState("ravieenasarees@gmail.com");
  const [whatsappNumber, setWhatsappNumber] = useState("+91 86884 72300");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(5000);
  const [gstRate, setGstRate] = useState(12);
  const [silkMarkLicense, setSilkMarkLicense] = useState("SM-IN-TS-98242");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Website and Showroom Settings updated successfully!", "success");
  };

  return (
    <div className="space-y-6 font-sans max-w-4xl text-brand-text">
      <div className="border-b border-brand-border pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
          Boutique & Website Configuration
        </h1>
        <p className="text-xs text-neutral-500 mt-1 font-light">
          Configure flagship atelier details in Telangana, shipping rules, tax settings, and Silk Mark licensing.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Brand Information */}
        <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-brand-text flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-gold" /> Brand Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Primary Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text font-mono"
              />
            </div>
          </div>
        </div>

        {/* Flagship Showroom & Concierge */}
        <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-brand-text flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-gold" /> Flagship Atelier Location & Concierge
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                Atelier Address (Marthadi, Bejjur, Telangana)
              </label>
              <textarea
                rows={2}
                value={showroomAddress}
                onChange={(e) => setShowroomAddress(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl p-3 text-brand-text"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Concierge Phone</label>
              <input
                type="text"
                value={conciergePhone}
                onChange={(e) => setConciergePhone(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">WhatsApp Drape Stylist</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Customer Support Email</label>
              <input
                type="email"
                value={conciergeEmail}
                onChange={(e) => setConciergeEmail(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Silk Mark License Number</label>
              <input
                type="text"
                value={silkMarkLicense}
                onChange={(e) => setSilkMarkLicense(e.target.value)}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text font-mono"
              />
            </div>
          </div>
        </div>

        {/* Shipping & Taxes */}
        <div className="bg-white border border-brand-border rounded-3xl p-6 space-y-4 shadow-card">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-brand-text flex items-center gap-2">
            <Truck className="w-4 h-4 text-brand-gold" /> Shipping & Tax Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                Complimentary Express Shipping Threshold (₹)
              </label>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">
                Handloom Saree GST Rate (%)
              </label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className="w-full bg-brand-ivory border border-brand-border rounded-xl px-3.5 py-2 text-brand-text"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end font-poppins">
          <button
            type="submit"
            className="btn-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest rounded-full shadow-md flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Website Settings
          </button>
        </div>
      </form>
    </div>
  );
}
