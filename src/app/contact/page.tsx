import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SITE } from "@/lib/site";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Contact ${SITE.name} by email, phone or WhatsApp, or send us a message about an order, return, refund or product.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const wa = `https://wa.me/${SITE.whatsappNumber}?text=${encodeURIComponent("Namaste Raveena Sarees, I would like some help.")}`;
  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-2xl mb-10">
          <h1 className="text-3xl sm:text-4xl font-serif font-normal">Contact Us</h1>
          <p className="mt-3 text-[15px] text-neutral-600">
            Questions about an order, a return or a saree? Reach us any of these ways, or send a message and we will reply by email or WhatsApp.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          <div className="lg:col-span-5 space-y-4">
            <ul className="bg-brand-ivory border border-brand-border rounded-3xl p-5 sm:p-7 space-y-5 text-sm">
              <li className="flex items-start gap-3.5">
                <span className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shrink-0"><Mail className="w-5 h-5" /></span>
                <span>
                  <strong className="block text-[11px] uppercase font-poppins">Email</strong>
                  <a href={`mailto:${SITE.email}`} className="text-neutral-700 hover:text-brand-maroon break-all">{SITE.email}</a>
                  <br />
                  <a href={`mailto:${SITE.infoEmail}`} className="text-neutral-700 hover:text-brand-maroon break-all">{SITE.infoEmail}</a>
                </span>
              </li>
              <li className="flex items-start gap-3.5">
                <span className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shrink-0"><Phone className="w-5 h-5" /></span>
                <span>
                  <strong className="block text-[11px] uppercase font-poppins">Phone</strong>
                  <a href={`tel:+${SITE.whatsappNumber}`} className="text-neutral-700 hover:text-brand-maroon">{SITE.phoneDisplay}</a>
                </span>
              </li>
              <li className="flex items-start gap-3.5">
                <span className="p-2.5 bg-white text-emerald-600 rounded-xl border border-brand-border shrink-0"><MessageCircle className="w-5 h-5" /></span>
                <span>
                  <strong className="block text-[11px] uppercase font-poppins">WhatsApp</strong>
                  <a href={wa} target="_blank" rel="noopener noreferrer" className="text-neutral-700 hover:text-brand-maroon">Chat on {SITE.phoneDisplay}</a>
                </span>
              </li>
              {SITE.address && (
                <li className="flex items-start gap-3.5">
                  <span className="p-2.5 bg-white text-brand-gold rounded-xl border border-brand-border shrink-0"><MapPin className="w-5 h-5" /></span>
                  <span>
                    <strong className="block text-[11px] uppercase font-poppins">Business address</strong>
                    <span className="text-neutral-700 leading-relaxed">{SITE.address}</span>
                  </span>
                </li>
              )}
            </ul>
            <p className="text-xs text-neutral-500 px-1">
              Looking for answers fast? See the <Link href="/faq" className="underline text-brand-maroon">FAQ</Link>, or our{" "}
              <Link href="/return-policy" className="underline text-brand-maroon">return</Link> and{" "}
              <Link href="/refund-policy" className="underline text-brand-maroon">refund</Link> policies.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white border border-brand-border rounded-3xl p-5 sm:p-8 shadow-card">
              <h2 className="text-lg font-serif font-semibold mb-5">Send us a message</h2>
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
