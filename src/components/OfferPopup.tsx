"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, Copy, Check, Sparkles } from "lucide-react";
import { getActiveOfferAction } from "@/app/actions/offers";
import { OFFER_DELAY_MS, type PublicOffer } from "@/lib/offers/popup";

const HIDDEN_ON = ["/checkout", "/cart", "/auth", "/admin", "/account"];
const DISMISS_DAYS = 7;

const store = {
  get(kind: "session" | "local", key: string) {
    try {
      return (kind === "session" ? sessionStorage : localStorage).getItem(key);
    } catch {
      return null;
    }
  },
  set(kind: "session" | "local", key: string, value: string) {
    try {
      (kind === "session" ? sessionStorage : localStorage).setItem(key, value);
    } catch {}
  },
};

/**
 * Offer popup: appears once per browser session, 10 seconds after arrival, only when an admin has
 * configured a real, currently running offer. Closing it hides that offer for 7 days.
 */
export function OfferPopup() {
  const pathname = usePathname() || "/";
  const [offer, setOffer] = useState<PublicOffer | null>(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hiddenHere = HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Arm the timer once per session (it keeps counting across storefront navigation)
  useEffect(() => {
    if (store.get("session", "rvn_offer_session")) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const o = await getActiveOfferAction().catch(() => null);
      if (cancelled || !o) return;
      const dismissedAt = Number(store.get("local", `rvn_offer_dismissed_${o.version}`) || 0);
      if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return;
      setOffer(o);
    }, OFFER_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Show when ready and the visitor is on a storefront page
  useEffect(() => {
    if (offer && !hiddenHere && !store.get("session", "rvn_offer_session")) {
      store.set("session", "rvn_offer_session", "1");
      setOpen(true);
    }
  }, [offer, hiddenHere]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    if (offer) store.set("local", `rvn_offer_dismissed_${offer.version}`, String(Date.now()));
  };

  const copy = async () => {
    if (!offer?.couponCode) return;
    try {
      await navigator.clipboard.writeText(offer.couponCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!open || !offer) return null;
  const external = offer.ctaUrl?.startsWith("https://");

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6" role="presentation">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] motion-safe:animate-fadeIn" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="offer-title"
        aria-describedby="offer-message"
        className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom)] motion-safe:animate-slideInUp sm:motion-safe:animate-fadeInUp"
      >
        <div className="h-1.5 bg-gradient-to-r from-brand-goldDark via-brand-gold to-brand-goldLight" aria-hidden="true" />
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close offer"
          className="absolute top-3 right-3 w-11 h-11 rounded-full flex items-center justify-center text-neutral-500 hover:text-brand-maroon hover:bg-brand-ivory focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 sm:px-8 pt-8 pb-7 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-goldPale text-brand-goldDark text-[11px] font-semibold uppercase tracking-widest font-poppins">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> Raveena Sarees offer
          </span>
          <h2 id="offer-title" className="font-serif text-2xl sm:text-[28px] leading-tight text-brand-text">
            {offer.title}
          </h2>
          <p id="offer-message" className="text-sm text-neutral-600 leading-relaxed">
            {offer.message}
          </p>

          {offer.couponCode && (
            <div className="flex items-center justify-center gap-2">
              <span className="px-4 py-2.5 rounded-xl border-2 border-dashed border-brand-gold bg-brand-ivory font-mono font-bold tracking-widest text-brand-maroon select-all">
                {offer.couponCode}
              </span>
              <button
                type="button"
                onClick={copy}
                className="min-h-[44px] px-3 rounded-xl border border-brand-border text-xs font-semibold font-poppins inline-flex items-center gap-1.5 hover:border-brand-gold"
                aria-label={`Copy code ${offer.couponCode}`}
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}

          {offer.ctaUrl && (
            <Link
              href={offer.ctaUrl}
              onClick={close}
              {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="btn-primary w-full min-h-[48px] inline-flex items-center justify-center rounded-full text-xs font-bold uppercase tracking-widest font-poppins shadow-md"
            >
              {offer.ctaLabel || "Shop now"}
            </Link>
          )}

          {(offer.terms || offer.endsAt) && (
            <p className="text-[11px] text-neutral-400">
              {offer.terms}
              {offer.terms && offer.endsAt ? " · " : ""}
              {offer.endsAt
                ? `Valid till ${new Date(offer.endsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`
                : ""}
            </p>
          )}
          <button type="button" onClick={close} className="text-xs text-neutral-500 underline min-h-[44px]">
            No thanks
          </button>
        </div>
      </div>
    </div>
  );
}
