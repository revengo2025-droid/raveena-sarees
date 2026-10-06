"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, Home, Briefcase, MapPin, ChevronRight, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { SavedAddress } from "@/lib/types";
import { normaliseIndianMobile } from "@/lib/geo/india";
import {
  AddressForm,
  EMPTY_ADDRESS,
  validateAddress,
  type AddressErrors,
  type AddressFormValue,
} from "@/components/AddressForm";

export default function AddressesPage() {
  const { savedAddresses, addAddress, updateAddress, deleteAddress, user } = useApp();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormValue>(EMPTY_ADDRESS);
  const [errors, setErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);

  const patch = (p: Partial<AddressFormValue>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof AddressFormValue]);
      return next;
    });
  };

  const resetForm = () => {
    setForm({ ...EMPTY_ADDRESS, name: user?.fullName || "", phone: user?.phone || "" });
    setErrors({});
    setEditingId(null);
    setIsAdding(false);
  };

  const handleEdit = (a: SavedAddress) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      phone: a.phone,
      houseNumber: a.houseNumber || "",
      street: a.street,
      locality: a.locality || "",
      landmark: a.landmark || "",
      city: a.city,
      state: a.state,
      pincode: a.pincode,
      type: a.type || "Home",
      isDefault: Boolean(a.isDefault),
    });
    setErrors({});
    setIsAdding(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    const payload = { ...form, phone: normaliseIndianMobile(form.phone) };
    if (editingId) await updateAddress(editingId, payload);
    else await addAddress(payload);
    setSaving(false);
    resetForm();
  };

  const input =
    "w-full bg-white border rounded-xl px-3.5 py-3 text-base sm:text-sm text-brand-text focus:outline-none focus:border-brand-gold min-h-[44px]";

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto font-sans">
      <div className="mb-8 border-b border-brand-border pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1 font-poppins">
            <Link href="/account" className="hover:text-brand-gold">Dashboard</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-brand-gold font-semibold">Address Book</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-text font-normal">Saved Delivery Addresses</h1>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="btn-primary px-5 min-h-[44px] text-xs rounded-full flex items-center gap-1.5 shadow-md font-poppins self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      </div>

      {isAdding && (
        <div className="bg-brand-ivory border border-brand-border rounded-3xl p-5 sm:p-8 mb-8 space-y-5 shadow-luxury">
          <h2 className="text-base font-serif font-bold uppercase tracking-wider text-brand-text">
            {editingId ? "Edit Address" : "Add New Delivery Address"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="acc-name" className="text-[11px] uppercase text-neutral-600 font-poppins block mb-1">Full Name *</label>
                <input id="acc-name" className={`${input} ${errors.name ? "border-red-400" : "border-brand-border"}`} value={form.name} onChange={(e) => patch({ name: e.target.value })} />
                {errors.name && <p role="alert" className="text-[11px] text-red-600 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="acc-phone" className="text-[11px] uppercase text-neutral-600 font-poppins block mb-1">Mobile Number *</label>
                <input id="acc-phone" type="tel" inputMode="numeric" className={`${input} ${errors.phone ? "border-red-400" : "border-brand-border"}`} value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
                {errors.phone && <p role="alert" className="text-[11px] text-red-600 mt-1">{errors.phone}</p>}
              </div>
            </div>

            <AddressForm value={form} onChange={patch} errors={errors} idPrefix="acc" />

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={resetForm} className="px-5 min-h-[44px] bg-white border border-brand-border text-neutral-600 hover:text-brand-text rounded-full text-xs shadow-sm">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn-primary px-6 min-h-[44px] text-xs rounded-full font-semibold shadow-md inline-flex items-center gap-2 disabled:opacity-70">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Address
              </button>
            </div>
          </form>
        </div>
      )}

      {savedAddresses.length === 0 && !isAdding && (
        <div className="bg-brand-ivory border border-brand-border rounded-3xl p-10 text-center">
          <MapPin className="w-8 h-8 text-brand-gold/70 mx-auto mb-3" />
          <h2 className="text-lg font-serif mb-1">No saved addresses yet</h2>
          <p className="text-xs text-neutral-500">Add an address now to check out faster next time.</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {savedAddresses.map((addr) => (
          <div
            key={addr.id}
            className={`bg-white border rounded-3xl p-5 sm:p-6 flex flex-col justify-between space-y-4 transition-all shadow-card ${
              addr.isDefault ? "border-brand-gold/80 ring-1 ring-brand-gold/30" : "border-brand-border hover:border-brand-gold/40"
            }`}
          >
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {addr.type === "Office" ? <Briefcase className="w-4 h-4 text-brand-gold shrink-0" /> : addr.type === "Other" ? <MapPin className="w-4 h-4 text-brand-gold shrink-0" /> : <Home className="w-4 h-4 text-brand-gold shrink-0" />}
                  <h3 className="font-bold text-brand-text text-sm font-poppins truncate">{addr.name}</h3>
                  <span className="text-[10px] uppercase text-neutral-400">{addr.type || "Home"}</span>
                </div>
                {addr.isDefault && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 bg-brand-ivory text-brand-maroon border border-brand-border rounded-full font-poppins shrink-0">
                    Default
                  </span>
                )}
              </div>

              <p className="text-neutral-600 leading-relaxed">
                {[addr.houseNumber, addr.street, addr.locality].filter(Boolean).join(", ")}
              </p>
              {addr.landmark && <p className="text-neutral-500 text-[11px]">Landmark: {addr.landmark}</p>}
              <p className="text-neutral-600">
                {addr.city}, {addr.state} - <strong className="text-brand-text">{addr.pincode}</strong>
              </p>
              <p className="text-neutral-500">Phone: {addr.phone}</p>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-brand-border text-xs font-poppins">
              <div className="flex gap-1">
                <button onClick={() => handleEdit(addr)} className="min-h-[44px] px-2 text-neutral-500 hover:text-brand-maroon flex items-center gap-1 font-medium">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => confirm("Delete this address?") && deleteAddress(addr.id)}
                  className="min-h-[44px] px-2 text-neutral-400 hover:text-red-500 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              {!addr.isDefault && (
                <button onClick={() => updateAddress(addr.id, { isDefault: true })} className="min-h-[44px] px-2 text-xs text-brand-maroon hover:text-brand-gold font-medium">
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
