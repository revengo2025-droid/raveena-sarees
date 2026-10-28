"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowRight, BellRing, Check, Loader2, MessageCircle, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";
import { Float, Reveal } from "@/components/motion/Reveal";
import { SITE } from "@/lib/site";
import { addedLabel, effectivePrice, latestDrop } from "@/lib/trending";
import { formatINR } from "@/lib/utils";
import { EASE, slideFromRight, stagger } from "./motion";

/**
 * Future Drops. Two honest halves:
 *  - "Be first": an early-access signup that uses the existing newsletter list (no promised dates or products).
 *  - "Just landed": the newest sarees actually in the catalogue, with real "added N days ago" labels.
 */
export function FutureDrops() {
  const { products, showToast } = useApp();
  const reduceMotion = useReducedMotion();

  const newest = useMemo(() => latestDrop(products, 3), [products]);

  // "Added 3 days ago" depends on the visitor's clock, so it is filled in after hydration to avoid a mismatch
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [joined, setJoined] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (busy) return;
    if (!address || !address.includes("@")) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    setBusy(true);
    try {
      const res = await subscribeNewsletterAction(address);
      if (res.success) {
        setJoined(true);
        setEmail("");
        showToast("You are on the list. We will email you when a new drop goes live.", "success");
      } else {
        showToast(res.error || "Could not sign you up. Please try again.", "error");
      }
    } catch {
      showToast("Could not sign you up. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  const whatsapp = `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent("Namaste Raveena Sarees, please tell me when new sarees arrive.")}`;

  return (
    <section aria-labelledby="drops-heading" className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white via-brand-goldPale/40 to-white">
      <div className="relative max-w-6xl mx-auto">
        <Reveal>
          {/* Slowly travelling gold-to-maroon border */}
          <m.div
            className="rounded-[28px] p-[1.5px] shadow-luxury"
            style={{ backgroundImage: "linear-gradient(120deg,#D4B86A,#7A1F2B,#D4B86A,#A88534,#D4B86A)", backgroundSize: "300% 300%" }}
            animate={reduceMotion ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          >
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] overflow-hidden rounded-[26.5px] bg-white">
              {/* Be first */}
              <div className="relative p-7 sm:p-12">
                <Float className="absolute top-6 right-8 text-brand-gold/60" distance={8} duration={4.5}>
                  <Sparkles className="w-7 h-7" aria-hidden="true" />
                </Float>
                <Float className="absolute bottom-10 right-16 text-brand-maroon/30 hidden sm:block" distance={12} duration={6}>
                  <Sparkles className="w-5 h-5" aria-hidden="true" />
                </Float>

                <span className="inline-flex items-center gap-2 rounded-full bg-brand-maroon/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-maroon font-poppins">
                  <m.span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full bg-brand-maroon"
                    animate={reduceMotion ? undefined : { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  Future Drops
                </span>

                <h2 id="drops-heading" className="mt-5 font-serif text-3xl sm:text-4xl lg:text-[44px] leading-tight text-brand-text">
                  The Next Drop, <span className="text-brand-maroon">Before Everyone Else</span>
                </h2>
                <p className="mt-4 max-w-lg text-sm sm:text-base font-light leading-relaxed text-neutral-600">
                  New sarees arrive in small batches. Join the early-access list and we will email you when a new drop goes live, so you see it first.
                </p>

                <div className="mt-7 min-h-[88px]">
                  <AnimatePresence mode="wait" initial={false}>
                    {joined ? (
                      <m.div
                        key="joined"
                        role="status"
                        initial={{ opacity: 0, scale: 0.92 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4"
                      >
                        <m.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.1 }}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white"
                        >
                          <Check className="w-5 h-5" />
                        </m.span>
                        <span className="text-sm text-emerald-900">
                          <strong className="block font-semibold">You are on the list.</strong>
                          We will email you when the next drop goes live.
                        </span>
                      </m.div>
                    ) : (
                      <m.form key="form" onSubmit={submit} noValidate exit={{ opacity: 0 }} className="flex flex-col sm:flex-row gap-3 max-w-lg">
                        <label htmlFor="drops-email" className="sr-only">
                          Email address
                        </label>
                        <input
                          id="drops-email"
                          type="email"
                          inputMode="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Your email address"
                          className="flex-1 min-h-[52px] rounded-full border border-brand-border bg-brand-ivory px-6 text-sm focus:outline-none focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30 transition"
                        />
                        <button
                          type="submit"
                          disabled={busy}
                          className="btn-primary min-h-[52px] px-7 rounded-full inline-flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.18em] font-poppins disabled:opacity-70"
                        >
                          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
                          {busy ? "Joining" : "Notify Me"}
                        </button>
                      </m.form>
                    )}
                  </AnimatePresence>
                </div>

                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 hover:text-[#1EA952] transition-colors font-poppins"
                >
                  <MessageCircle className="w-4 h-4" /> Prefer WhatsApp? Message us to hear about new arrivals
                </a>
              </div>

              {/* Just landed */}
              <div className="relative bg-gradient-to-br from-brand-maroon via-brand-maroonDark to-brand-maroon p-7 sm:p-10 text-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-200 font-poppins">Just Landed</span>
                  <Link href="/shop?sort=newest" className="group inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 hover:text-white font-poppins">
                    All new <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

                {newest.length > 0 ? (
                  <m.ul variants={stagger(0.12, 0.15)} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mt-6 space-y-3">
                    {newest.map((p) => (
                      <m.li key={p.id} variants={slideFromRight}>
                        <Link
                          href={`/product/${p.slug}`}
                          className="group flex items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm transition-colors hover:border-brand-gold/70 hover:bg-white/10"
                        >
                          <span className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-black/30">
                            {p.images[0] && (
                              <Image src={p.images[0]} alt={p.name} fill sizes="72px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[10px] uppercase tracking-[0.18em] text-amber-200 font-poppins min-h-[14px]">{now !== null ? addedLabel(p.createdAt, now) : ""}</span>
                            <span className="mt-0.5 block font-serif text-base leading-snug line-clamp-2 group-hover:text-amber-100 transition-colors">{p.name}</span>
                            <span className="mt-1 block text-sm font-semibold text-amber-200">{formatINR(effectivePrice(p))}</span>
                          </span>
                          <ArrowRight className="hidden sm:block w-4 h-4 shrink-0 text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all" />
                        </Link>
                      </m.li>
                    ))}
                  </m.ul>
                ) : (
                  <p className="mt-6 text-sm text-neutral-200 font-light">New sarees will appear here as soon as they are added.</p>
                )}
              </div>
            </div>
          </m.div>
        </Reveal>
      </div>
    </section>
  );
}
