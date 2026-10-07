"use client";

import React, { useEffect, useState } from "react";
import { Gift, Save, Loader2 } from "lucide-react";
import { useApp } from "@/lib/store";
import { getOfferSettingsAction, saveOfferSettingsAction } from "@/app/actions/offers";

const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : "");

const EMPTY = { enabled: false, title: "", message: "", couponCode: "", ctaLabel: "Shop now", ctaUrl: "/shop", terms: "", startsAt: "", endsAt: "" };

/** Admin editor for the storefront offer popup (shown 10 s after a visitor arrives, once per session). */
export function OfferSettingsCard() {
  const { showToast } = useApp();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getOfferSettingsAction().then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        setForm({
          enabled: Boolean(d.enabled),
          title: d.title || "",
          message: d.message || "",
          couponCode: d.couponCode || "",
          ctaLabel: d.ctaLabel || "",
          ctaUrl: d.ctaUrl || "",
          terms: d.terms || "",
          startsAt: toLocalInput(d.startsAt),
          endsAt: toLocalInput(d.endsAt),
        });
      }
      setLoading(false);
    });
  }, []);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await saveOfferSettingsAction({ ...form, startsAt: fromLocalInput(form.startsAt), endsAt: fromLocalInput(form.endsAt) });
    setSaving(false);
    showToast(res.success ? (form.enabled ? "Offer popup is live" : "Offer popup saved (turned off)") : res.error, res.success ? "success" : "error");
  };

  const input = "w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-[#D4AF37]";
  const label = "text-[10px] uppercase text-gray-400 font-bold tracking-wider block mb-1.5";

  return (
    <form onSubmit={save} className="bg-[#101010] border border-[#D4AF37]/30 rounded-2xl p-6 space-y-4 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-serif font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#D4AF37]" /> Offer popup
        </h2>
        <label className="inline-flex items-center gap-2 text-gray-300 cursor-pointer">
          <input type="checkbox" checked={form.enabled} onChange={set("enabled")} className="w-4 h-4 accent-[#D4AF37]" disabled={loading} />
          Show on the website
        </label>
      </div>
      <p className="text-[11px] text-gray-500">
        Appears 10 seconds after a visitor arrives, at most once per visit, and never on checkout, cart, account or sign-in pages.
        Only advertise a real offer. If you add a coupon code it must exist and be active under Promo Coupons, otherwise the popup stays hidden.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label htmlFor="offer-title" className={label}>Headline</label>
          <input id="offer-title" className={input} value={form.title} onChange={set("title")} maxLength={80} placeholder="e.g. Festive offer: 10% off silk sarees" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="offer-message" className={label}>Message</label>
          <textarea id="offer-message" rows={2} className={`${input} resize-none`} value={form.message} onChange={set("message")} maxLength={240} />
        </div>
        <div>
          <label htmlFor="offer-code" className={label}>Coupon code (optional)</label>
          <input id="offer-code" className={`${input} font-mono uppercase`} value={form.couponCode} onChange={set("couponCode")} maxLength={30} />
        </div>
        <div>
          <label htmlFor="offer-terms" className={label}>Short terms (optional)</label>
          <input id="offer-terms" className={input} value={form.terms} onChange={set("terms")} maxLength={160} placeholder="e.g. On orders above ₹3,000" />
        </div>
        <div>
          <label htmlFor="offer-cta" className={label}>Button text</label>
          <input id="offer-cta" className={input} value={form.ctaLabel} onChange={set("ctaLabel")} maxLength={30} />
        </div>
        <div>
          <label htmlFor="offer-url" className={label}>Button link</label>
          <input id="offer-url" className={`${input} font-mono`} value={form.ctaUrl} onChange={set("ctaUrl")} maxLength={300} placeholder="/shop" />
        </div>
        <div>
          <label htmlFor="offer-start" className={label}>Starts (optional)</label>
          <input id="offer-start" type="datetime-local" className={input} value={form.startsAt} onChange={set("startsAt")} />
        </div>
        <div>
          <label htmlFor="offer-end" className={label}>Ends (optional)</label>
          <input id="offer-end" type="datetime-local" className={input} value={form.endsAt} onChange={set("endsAt")} />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving || loading} className="px-6 py-2.5 bg-[#D4AF37] text-black font-bold text-xs uppercase tracking-widest rounded-xl inline-flex items-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save offer
        </button>
      </div>
    </form>
  );
}
