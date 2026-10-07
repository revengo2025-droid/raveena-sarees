"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle,
  Instagram,
  Facebook,
  Youtube,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { SITE } from "@/lib/site";
import { PRICING } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";
import { subscribeNewsletterAction } from "@/app/actions/newsletter";

export const Footer: React.FC = () => {
  const { categories, showToast } = useApp();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@") || subscribing) return;
    setSubscribing(true);
    try {
      const res = await subscribeNewsletterAction(email);
      if (res.success) {
        setSubscribed(true);
        showToast("Welcome! Use code FIRSTBUY for 15% off your first order.", "success");
        setEmail("");
      } else {
        showToast(res.error || "Could not subscribe. Please try again.", "error");
      }
    } catch {
      showToast("Could not subscribe. Please try again.", "error");
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <footer className="bg-[#1A1A1A] text-neutral-300 font-body relative z-10">
      {/* Newsletter Banner */}
      <div className="bg-brand-ivory border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl sm:text-3xl font-heading font-semibold text-brand-text">
                Join the Raveena Family
              </h3>
              <p className="text-sm text-brand-textSecondary mt-2 font-body max-w-md">
                Get exclusive access to new arrivals, special offers, and a 15% welcome discount on your first order.
              </p>
            </div>
            <div className="w-full md:w-auto max-w-md">
              {subscribed ? (
                <div className="flex items-center gap-2.5 text-sm text-brand-gold bg-white p-4 rounded-full border border-brand-gold/30 shadow-soft">
                  <CheckCircle className="w-5 h-5 text-brand-gold shrink-0" />
                  <span>Welcome! Your code <strong>FIRSTBUY</strong> is ready to use.</span>
                </div>
              ) : (
                <form onSubmit={handleSubscribe} className="relative flex items-center">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white border border-brand-border rounded-full py-3.5 pl-5 pr-32 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-gold transition-all font-body shadow-soft"
                    disabled={subscribing}
                  />
                  <button
                    type="submit"
                    disabled={subscribing}
                    className="absolute right-1.5 px-5 py-2.5 bg-brand-gold hover:bg-brand-maroon text-white font-button font-semibold text-[11px] uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5 shadow-gold disabled:opacity-60"
                  >
                    {subscribing ? "Sending..." : "Subscribe"} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10">
          {/* Brand Column */}
          <div className="space-y-5">
            <Link href="/" className="inline-block group">
              <Image
                src="/images/logo/raveena-logo.jpg"
                alt="Raveena Sarees"
                width={112}
                height={112}
                className="h-28 w-28 object-cover rounded-xl shadow-md border border-brand-gold/30 group-hover:opacity-95 transition-opacity"
              />
            </Link>

            <p className="text-sm leading-relaxed text-neutral-400 font-body">
              Raveena Sarees brings you a curated range of sarees for weddings, festivals and everyday elegance, delivered to your door across India.
            </p>

            {/* Contact Details */}
            <div className="space-y-3 text-sm">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                <span>{SITE.address}</span>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-gold shrink-0" />
                <a href={`mailto:${SITE.email}`} className="hover:text-brand-gold transition-colors">
                  {SITE.email}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-brand-gold shrink-0" />
                <a href={`mailto:${SITE.infoEmail}`} className="hover:text-brand-gold transition-colors">
                  {SITE.infoEmail}
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-brand-gold shrink-0" />
                <a href="tel:+917780756009" className="hover:text-brand-gold transition-colors">
                  +91 77807 56009
                </a>
              </p>
            </div>

            {/* Social links: shown only when the real profile URLs are configured */}
            {(process.env.NEXT_PUBLIC_INSTAGRAM_URL || process.env.NEXT_PUBLIC_FACEBOOK_URL || process.env.NEXT_PUBLIC_YOUTUBE_URL) && (
              <div className="flex items-center gap-3 pt-2">
                {process.env.NEXT_PUBLIC_INSTAGRAM_URL && (
                  <a href={process.env.NEXT_PUBLIC_INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center text-neutral-300 hover:text-white transition-all" aria-label="Instagram">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {process.env.NEXT_PUBLIC_FACEBOOK_URL && (
                  <a href={process.env.NEXT_PUBLIC_FACEBOOK_URL} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center text-neutral-300 hover:text-white transition-all" aria-label="Facebook">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {process.env.NEXT_PUBLIC_YOUTUBE_URL && (
                  <a href={process.env.NEXT_PUBLIC_YOUTUBE_URL} target="_blank" rel="noopener noreferrer" className="w-11 h-11 rounded-full bg-white/10 hover:bg-brand-gold flex items-center justify-center text-neutral-300 hover:text-white transition-all" aria-label="YouTube">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-button font-semibold text-white uppercase tracking-widest mb-5">
              Quick Links
            </h4>
            <ul className="space-y-3 text-sm">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="hover:text-brand-gold transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/shop" className="text-brand-gold hover:text-white font-medium flex items-center gap-1 transition-colors">
                  View All Sarees <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="text-xs font-button font-semibold text-white uppercase tracking-widest mb-5">
              Customer Support
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/account/orders" className="hover:text-brand-gold transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-brand-gold transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/return-policy" className="hover:text-brand-gold transition-colors">
                  Return & Exchange Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-brand-gold transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-brand-gold transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-brand-gold transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-gold transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-brand-gold transition-colors">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/cancellation-policy" className="hover:text-brand-gold transition-colors">
                  Cancellation Policy
                </Link>
              </li>
              <li>
                <Link href="/cookie-policy" className="hover:text-brand-gold transition-colors">
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link href="/grievance-redressal" className="hover:text-brand-gold transition-colors">
                  Grievance Redressal
                </Link>
              </li>
            </ul>
          </div>

          {/* Why Raveena Sarees */}
          <div>
            <h4 className="text-xs font-button font-semibold text-white uppercase tracking-widest mb-5">
              Shopping With Us
            </h4>
            <ul className="space-y-3.5 text-sm">
              {[
                "Secure online payments through Razorpay",
                `Free shipping on orders of ${formatINR(PRICING.freeShippingThreshold)} or more`,
                `${SITE.returnWindowDays}-day return window from delivery`,
                "Track your order from your account",
                "Support by email and WhatsApp",
              ].map((text) => (
                <li key={text} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-neutral-500 text-center md:text-left text-xs">
            © {new Date().getFullYear()} {SITE.legalName || SITE.name}. All rights reserved.
          </p>

          {/* Accepted payment methods (all processed by Razorpay). Fixed sizes: no layout shift. */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">We accept</span>
            <ul className="flex flex-wrap items-center justify-center gap-2" aria-label="Accepted payment methods">
              {[
                { src: "/images/payments/upi.svg", alt: "UPI" },
                { src: "/images/payments/visa.svg", alt: "Visa" },
                { src: "/images/payments/master.svg", alt: "Mastercard" },
                { src: "/images/payments/rupay.svg", alt: "RuPay" },
                { src: "/images/payments/netbanking.svg", alt: "Net Banking" },
              ].map((m) => (
                <li key={m.alt} className="rounded-[5px] bg-white/95 shadow-sm ring-1 ring-white/10 leading-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.alt} title={m.alt} width={46} height={29} loading="lazy" decoding="async" className="block w-[46px] h-[29px]" />
                </li>
              ))}
            </ul>
            <a
              href="https://razorpay.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md opacity-90 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/payments/razorpay-badge-dark.png"
                alt="Payments powered by Razorpay"
                width={92}
                height={37}
                loading="lazy"
                decoding="async"
                className="block w-[92px] h-[37px]"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
