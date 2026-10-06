"use client";

import React, { useState } from "react";
import { Save, MapPin, Sparkles, Truck, Globe, Shield, Phone, Mail } from "lucide-react";
import { useApp } from "@/lib/store";
import { SITE } from "@/lib/site";

export default function AdminSettingsPage() {
  const { showToast } = useApp();

  const [storeName, setStoreName] = useState("Raveena Sarees");
  const [domain, setDomain] = useState(SITE.url.replace(/^https?:\/\//, ""));
  const [showroomAddress, setShowroomAddress] = useState(
    "Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana – 504224, India"
  );
  const [conciergePhone, setConciergePhone] = useState("+91 77807 56009");
  const [conciergeEmail, setConciergeEmail] = useState<string>(SITE.email);
  const [whatsappNumber, setWhatsappNumber] = useState("+91 77807 56009");
  const [freeShippingThreshold, setFreeShippingThreshold] = useState(2500);
  const [gstRate, setGstRate] = useState(12);
  const [silkMarkLicense, setSilkMarkLicense] = useState("SM-IN-TS-98242");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Website and Showroom Settings updated successfully!", "success");
  };

  const inputClasses = "w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37] transition-colors";
  const labelClasses = "text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1.5";

  return (
    <div className="space-y-6 font-sans max-w-4xl">
      <div className="border-b border-[#222] pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
          Boutique & Website Configuration
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure flagship atelier details in Telangana, shipping rules, tax settings, and Silk Mark licensing.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Brand Information */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Brand Identity
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>Brand Name</label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>Primary Domain</label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className={`${inputClasses} font-mono`}
              />
            </div>
          </div>
        </div>

        {/* Flagship Showroom & Concierge */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#D4AF37]" /> Flagship Atelier Location & Concierge
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClasses}>
                Atelier Address (Marthadi, Bejjur, Telangana)
              </label>
              <textarea
                rows={2}
                value={showroomAddress}
                onChange={(e) => setShowroomAddress(e.target.value)}
                className={`${inputClasses} resize-none`}
              />
            </div>

            <div>
              <label className={labelClasses}>Concierge Phone</label>
              <input
                type="text"
                value={conciergePhone}
                onChange={(e) => setConciergePhone(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>WhatsApp Drape Stylist</label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Customer Support Email</label>
              <input
                type="email"
                value={conciergeEmail}
                onChange={(e) => setConciergeEmail(e.target.value)}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>Silk Mark License Number</label>
              <input
                type="text"
                value={silkMarkLicense}
                onChange={(e) => setSilkMarkLicense(e.target.value)}
                className={`${inputClasses} font-mono`}
              />
            </div>
          </div>
        </div>

        {/* Shipping & Taxes */}
        <div className="bg-[#101010] border border-[#222] rounded-2xl p-6 space-y-4">
          <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#D4AF37]" /> Shipping & Tax Rules
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClasses}>
                Free Shipping Threshold (₹)
              </label>
              <input
                type="number"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(Number(e.target.value))}
                className={inputClasses}
              />
            </div>

            <div>
              <label className={labelClasses}>
                Handloom Saree GST Rate (%)
              </label>
              <input
                type="number"
                value={gstRate}
                onChange={(e) => setGstRate(Number(e.target.value))}
                className={inputClasses}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-8 py-3 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold text-xs uppercase tracking-widest rounded-xl shadow-md flex items-center gap-2 hover:brightness-110 transition-all"
          >
            <Save className="w-4 h-4" /> Save Website Settings
          </button>
        </div>
      </form>
    </div>
  );
}
