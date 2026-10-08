"use client";

import React, { useState } from "react";
import { Crosshair, Loader2, Home, Briefcase, MapPin } from "lucide-react";
import { INDIAN_MOBILE_RE, INDIAN_PINCODE_RE, INDIAN_STATES, isIndianState, normaliseIndianMobile } from "@/lib/geo/india";
import { lookupPincodeAction, reverseGeocodeAction } from "@/app/actions/geo";

export interface AddressFormValue {
  name: string;
  phone: string;
  houseNumber: string;
  street: string;
  locality: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  type: "Home" | "Office" | "Other";
  isDefault: boolean;
}

export const EMPTY_ADDRESS: AddressFormValue = {
  name: "",
  phone: "",
  houseNumber: "",
  street: "",
  locality: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  type: "Home",
  isDefault: false,
};

export type AddressErrors = Partial<Record<keyof AddressFormValue, string>>;

/** Client-side validation. The server re-validates everything before an order is created. */
export function validateAddress(v: AddressFormValue, opts: { requireContact?: boolean } = {}): AddressErrors {
  const e: AddressErrors = {};
  if (opts.requireContact !== false) {
    if (v.name.trim().length < 2) e.name = "Enter the recipient's full name";
    if (!INDIAN_MOBILE_RE.test(normaliseIndianMobile(v.phone))) e.phone = "Enter a valid 10-digit mobile number";
  }
  if (!v.houseNumber.trim()) e.houseNumber = "Enter house number / tower / block";
  if (v.street.trim().length < 3) e.street = "Enter address / building / street";
  if (v.locality.trim().length < 2) e.locality = "Enter locality / town";
  if (v.city.trim().length < 2) e.city = "Enter city / district";
  if (!isIndianState(v.state)) e.state = "Select your state";
  if (!INDIAN_PINCODE_RE.test(v.pincode)) e.pincode = "Enter a valid 6-digit PIN code";
  return e;
}

interface Props {
  value: AddressFormValue;
  onChange: (patch: Partial<AddressFormValue>) => void;
  errors?: AddressErrors;
  /** Show the recipient name + mobile fields (hide at checkout, where contact is step 1). */
  showContact?: boolean;
  showDefaultOption?: boolean;
  idPrefix?: string;
}

const field =
  "w-full bg-brand-ivory border rounded-xl px-3.5 py-3 text-base sm:text-sm text-brand-text focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/20 min-h-[44px]";
const label = "text-[11px] uppercase text-neutral-600 font-poppins block mb-1 tracking-wide";

export function AddressForm({ value, onChange, errors = {}, showContact = false, showDefaultOption = true, idPrefix = "addr" }: Props) {
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<{ type: "info" | "error" | "ok"; text: string } | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);
  const [places, setPlaces] = useState<string[]>([]);

  const err = (k: keyof AddressFormValue) =>
    errors[k] ? (
      <p id={`${idPrefix}-${k}-error`} role="alert" className="text-[11px] text-red-600 mt-1">
        {errors[k]}
      </p>
    ) : null;
  const cls = (k: keyof AddressFormValue) => `${field} ${errors[k] ? "border-red-400" : "border-brand-border"}`;
  const aria = (k: keyof AddressFormValue) => ({
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${idPrefix}-${k}-error` : undefined,
  });

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationNote({ type: "error", text: "Your browser does not support location. Please enter your address manually." });
      return;
    }
    setLocating(true);
    setLocationNote({ type: "info", text: "Your browser will ask for permission. We use your location only once to suggest an address." });
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await reverseGeocodeAction(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
        if (!res.success) {
          setLocationNote({ type: "error", text: res.error });
          return;
        }
        const s = res.data;
        onChange({
          ...(s.houseNumber && { houseNumber: s.houseNumber }),
          ...(s.streetAddress && { street: s.streetAddress }),
          ...(s.locality && { locality: s.locality }),
          ...(s.city && { city: s.city }),
          ...(s.state && { state: s.state }),
          ...(s.pincode && { pincode: s.pincode }),
        });
        setLocationNote({ type: "ok", text: "Address suggested from your location. Please check every field and edit anything that is not right." });
      },
      (e) => {
        setLocating(false);
        setLocationNote({
          type: "error",
          text:
            e.code === e.PERMISSION_DENIED
              ? "Location permission was not granted. No problem, just enter your address below."
              : "We could not get your location. Please enter your address manually.",
        });
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 }
    );
  };

  const onPincode = async (raw: string) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    onChange({ pincode: pin });
    if (pin.length !== 6) return;
    const res = await lookupPincodeAction(pin);
    if (!res.success) return;
    setDistricts(res.data.districts);
    setPlaces(res.data.places);
    // The state is never filled in for the customer: they pick it themselves. Only an empty city is suggested.
    onChange({
      ...(!value.city.trim() && res.data.districts[0] && { city: res.data.districts[0] }),
    });
  };

  const types: { id: AddressFormValue["type"]; icon: React.ReactNode }[] = [
    { id: "Home", icon: <Home className="w-4 h-4" /> },
    { id: "Office", icon: <Briefcase className="w-4 h-4" /> },
    { id: "Other", icon: <MapPin className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Current location */}
      <div className="rounded-2xl border border-brand-border bg-brand-ivory/60 p-3.5">
        <button
          type="button"
          onClick={useCurrentLocation}
          disabled={locating}
          className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-full bg-white border border-brand-gold/60 text-brand-maroon text-xs font-semibold font-poppins hover:bg-brand-goldPale disabled:opacity-60 transition-colors"
        >
          {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          Use My Current Location
        </button>
        <p className="text-[11px] text-neutral-500 mt-2 leading-relaxed">
          Optional. We ask your browser for permission and only use your location to suggest an address. You can edit it, or skip this and type your address.
        </p>
        {locationNote && (
          <p
            role="status"
            className={`text-[11px] mt-1.5 ${locationNote.type === "error" ? "text-red-600" : locationNote.type === "ok" ? "text-emerald-700" : "text-neutral-600"}`}
          >
            {locationNote.text}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {showContact && (
          <>
            <div>
              <label className={label} htmlFor={`${idPrefix}-name`}>Full Name *</label>
              <input id={`${idPrefix}-name`} autoComplete="name" className={cls("name")} value={value.name} onChange={(e) => onChange({ name: e.target.value })} {...aria("name")} />
              {err("name")}
            </div>
            <div>
              <label className={label} htmlFor={`${idPrefix}-phone`}>Mobile Number *</label>
              <input id={`${idPrefix}-phone`} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" className={cls("phone")} value={value.phone} onChange={(e) => onChange({ phone: e.target.value })} {...aria("phone")} />
              {err("phone")}
            </div>
          </>
        )}

        <div>
          <label className={label} htmlFor={`${idPrefix}-house`}>House Number / Tower / Block *</label>
          <input id={`${idPrefix}-house`} autoComplete="address-line1" className={cls("houseNumber")} value={value.houseNumber} onChange={(e) => onChange({ houseNumber: e.target.value })} {...aria("houseNumber")} />
          {err("houseNumber")}
        </div>
        <div>
          <label className={label} htmlFor={`${idPrefix}-street`}>Address / Building / Street *</label>
          <input id={`${idPrefix}-street`} autoComplete="address-line2" className={cls("street")} value={value.street} onChange={(e) => onChange({ street: e.target.value })} {...aria("street")} />
          {err("street")}
        </div>
        <div>
          <label className={label} htmlFor={`${idPrefix}-locality`}>Locality / Town *</label>
          <input id={`${idPrefix}-locality`} list={`${idPrefix}-places`} autoComplete="address-level3" className={cls("locality")} value={value.locality} onChange={(e) => onChange({ locality: e.target.value })} {...aria("locality")} />
          <datalist id={`${idPrefix}-places`}>{places.map((p) => <option key={p} value={p} />)}</datalist>
          {err("locality")}
        </div>
        <div>
          <label className={label} htmlFor={`${idPrefix}-landmark`}>Landmark (optional)</label>
          <input id={`${idPrefix}-landmark`} className={`${field} border-brand-border`} value={value.landmark} onChange={(e) => onChange({ landmark: e.target.value })} />
        </div>
        <div>
          <label className={label} htmlFor={`${idPrefix}-pincode`}>PIN Code *</label>
          <input id={`${idPrefix}-pincode`} inputMode="numeric" maxLength={6} autoComplete="postal-code" className={cls("pincode")} value={value.pincode} onChange={(e) => onPincode(e.target.value)} {...aria("pincode")} />
          {err("pincode")}
        </div>
        <div>
          <label className={label} htmlFor={`${idPrefix}-city`}>City / District *</label>
          <input id={`${idPrefix}-city`} list={`${idPrefix}-districts`} autoComplete="address-level2" className={cls("city")} value={value.city} onChange={(e) => onChange({ city: e.target.value })} {...aria("city")} />
          <datalist id={`${idPrefix}-districts`}>{districts.map((d) => <option key={d} value={d} />)}</datalist>
          {err("city")}
        </div>
        <div className="sm:col-span-2">
          <label className={label} htmlFor={`${idPrefix}-state`}>State *</label>
          <select id={`${idPrefix}-state`} autoComplete="off" className={cls("state")} value={value.state} onChange={(e) => onChange({ state: e.target.value })} {...aria("state")}>
            <option value="" disabled>Select your state</option>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {err("state")}
        </div>
      </div>

      {/* Address type */}
      <fieldset>
        <legend className={label}>Address Type</legend>
        <div className="flex gap-2">
          {types.map((t) => (
            <label
              key={t.id}
              className={`flex-1 flex items-center justify-center gap-1.5 min-h-[44px] rounded-xl border text-xs font-semibold font-poppins cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-brand-gold/40 ${
                value.type === t.id ? "bg-brand-ivory border-brand-gold text-brand-maroon" : "bg-white border-brand-border text-neutral-600 hover:border-brand-gold/50"
              }`}
            >
              <input type="radio" name={`${idPrefix}-type`} className="sr-only" checked={value.type === t.id} onChange={() => onChange({ type: t.id })} />
              {t.icon} {t.id}
            </label>
          ))}
        </div>
      </fieldset>

      {showDefaultOption && (
        <label className="flex items-center gap-2.5 min-h-[44px] cursor-pointer text-sm text-brand-text">
          <input type="checkbox" className="w-5 h-5 accent-brand-gold" checked={value.isDefault} onChange={(e) => onChange({ isDefault: e.target.checked })} />
          Save as default address
        </label>
      )}
    </div>
  );
}
