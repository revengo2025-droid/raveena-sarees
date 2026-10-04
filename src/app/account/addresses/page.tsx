"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Edit3, ChevronRight, Home, Briefcase } from "lucide-react";
import { useApp } from "@/lib/store";
import { SavedAddress } from "@/lib/types";

export default function AddressesPage() {
  const { savedAddresses, addAddress, updateAddress, deleteAddress, showToast } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [street, setStreet] = useState("");
  const [landmark, setLandmark] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [type, setType] = useState<"Home" | "Work" | "Other">("Home");
  const [isDefault, setIsDefault] = useState(false);

  const resetForm = () => {
    setName("");
    setPhone("");
    setStreet("");
    setLandmark("");
    setCity("");
    setState("");
    setPincode("");
    setType("Home");
    setIsDefault(false);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setName(addr.name);
    setPhone(addr.phone);
    setStreet(addr.street);
    setLandmark(addr.landmark || "");
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setType(addr.type || "Home");
    setIsDefault(addr.isDefault || false);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !street || !city || !pincode) {
      showToast("Please fill in all mandatory fields.", "error");
      return;
    }

    if (editingId) {
      updateAddress(editingId, {
        name,
        phone,
        street,
        landmark,
        city,
        state,
        pincode,
        type,
        isDefault,
      });
    } else {
      addAddress({
        name,
        phone,
        street,
        landmark,
        city,
        state,
        pincode,
        type,
        isDefault,
      });
    }
    resetForm();
  };

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      {/* Breadcrumb & Header */}
      <div className="mb-8 border-b border-brand-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1 font-poppins">
            <Link href="/account" className="hover:text-brand-gold">
              Dashboard
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-brand-gold font-semibold">Delivery Address Book</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">
            Saved Delivery Addresses
          </h1>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAdding(!isAdding);
          }}
          className="btn-primary px-5 py-2.5 text-xs rounded-full flex items-center gap-1.5 shadow-md font-poppins self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {/* Add / Edit Form */}
      {isAdding && (
        <div className="bg-brand-ivory border border-brand-border rounded-3xl p-6 sm:p-8 mb-8 space-y-4 shadow-luxury animate-scaleUp">
          <h2 className="text-base font-serif font-bold uppercase tracking-wider text-brand-text">
            {editingId ? "Edit Address" : "Add New Delivery Address"}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="Ananya Reddy"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 86884 72300"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Street Address / House / Flat *</label>
              <input
                type="text"
                required
                placeholder="e.g. Marthadi, Bejjur, Komaram Bheem Asifabad"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Landmark (Optional)</label>
              <input
                type="text"
                placeholder="Near Main Market"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">City *</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">State *</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              >
                <option value="Telangana">Telangana</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Delhi NCR">Delhi NCR</option>
                <option value="West Bengal">West Bengal</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">PIN Code *</label>
              <input
                type="text"
                required
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                className="w-full bg-white border border-brand-border rounded-xl px-3.5 py-2.5 text-brand-text focus:outline-none focus:border-brand-gold"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase text-neutral-500 font-poppins block mb-1">Address Label</label>
              <div className="flex gap-2">
                {(["Home", "Work", "Other"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`px-3.5 py-1.5 rounded-full border text-xs font-poppins ${
                      type === t
                        ? "bg-brand-gold text-white font-semibold border-brand-gold shadow-sm"
                        : "bg-white text-neutral-600 border-brand-border hover:border-brand-gold/50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 flex items-center justify-between font-poppins">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="accent-brand-gold"
                />
                <span className="text-xs text-neutral-600 font-light">Set as default delivery address</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-white border border-brand-border text-neutral-600 hover:text-brand-text rounded-full text-xs shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-6 py-2 text-xs rounded-full font-semibold shadow-md"
                >
                  Save Address
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Address Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white border rounded-3xl p-6 flex flex-col justify-between space-y-4 transition-all shadow-card hover:shadow-luxury ${
              addr.isDefault ? "border-brand-gold/80 ring-1 ring-brand-gold/30" : "border-brand-border hover:border-brand-gold/40"
            }`}
          >
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {addr.type === "Work" ? (
                    <Briefcase className="w-4 h-4 text-brand-gold" />
                  ) : (
                    <Home className="w-4 h-4 text-brand-gold" />
                  )}
                  <h3 className="font-bold text-brand-text text-sm font-poppins">{addr.name}</h3>
                </div>
                {addr.isDefault && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-brand-ivory text-brand-maroon border border-brand-border rounded-full font-poppins">
                    Default Address
                  </span>
                )}
              </div>

              <p className="text-neutral-600 leading-relaxed font-light">{addr.street}</p>
              {addr.landmark && (
                <p className="text-neutral-500 text-[11px] font-light">Landmark: {addr.landmark}</p>
              )}
              <p className="text-neutral-600 font-light">
                {addr.city}, {addr.state} - <strong className="text-brand-text">{addr.pincode}</strong>
              </p>
              <p className="text-neutral-500 font-light">Phone: {addr.phone}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-brand-border text-xs font-poppins">
              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(addr)}
                  className="text-neutral-500 hover:text-brand-maroon flex items-center gap-1 font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => deleteAddress(addr.id)}
                  className="text-neutral-400 hover:text-red-500 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {!addr.isDefault && (
                <button
                  onClick={() => updateAddress(addr.id, { isDefault: true })}
                  className="text-xs text-brand-maroon hover:text-brand-gold font-medium"
                >
                  Set as Default
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
