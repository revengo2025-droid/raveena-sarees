"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "How can I verify that Ravina Sarees are 100% pure silk?",
      a: "Every pure silk saree from Ravina Sarees arrives with an authenticated Silk Mark India tag issued by the Central Silk Board. This tag certifies that the warp and weft fibres are 100% natural mulberry, tussar, or katan silk with zero synthetic mixing.",
      category: "Authenticity & Silk Purity",
    },
    {
      q: "What type of zari is woven into the Kanjivaram and Banarasi sarees?",
      a: "We exclusively use authentic metallic zari (silver wire electroplated with pure 24K gold) for our bridal and heirloom masterloom collections. For lightweight festive drapes, tested high-grade metallic zari is used to ensure featherlight comfort while maintaining lustrous courtly shine.",
      category: "Authenticity & Silk Purity",
    },
    {
      q: "Does every saree include an unstitched blouse piece?",
      a: "Yes! All 5.5-meter sarees at Ravina Sarees include a coordinated 0.80m to 1.00m unstitched pure silk blouse piece with matching zari borders, running alongside the saree length.",
      category: "Product & Specifications",
    },
    {
      q: "How long does shipping take across India?",
      a: "We offer complimentary express air shipping across India via BlueDart Express. Orders are dispatched within 24-48 hours. Metros take 2-3 business days. Rest of India takes 3-4 business days.",
      category: "Shipping & Delivery",
    },
    {
      q: "What is your 7-Day Return and Exchange Policy?",
      a: "If you wish to exchange or return a saree, simply notify us within 7 days of delivery. We will arrange a complimentary insured doorstep reverse pickup. Upon receiving the saree in original unused condition with Silk Mark tags intact, your refund or exchange is processed instantly.",
      category: "Returns & Exchanges",
    },
    {
      q: "Can I visit your atelier or boutique for private bridal trials?",
      a: "Yes, our flagship atelier is located at Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana – 504224. We are Open 24×7 and offer private bespoke bridal styling consultations. You can also connect directly with our stylists on WhatsApp for video viewing.",
      category: "Showroom & Appointments",
    },
  ];

  return (
    <div className="min-h-screen bg-brand-white text-brand-text py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto font-sans">
      <div className="text-center max-w-xl mx-auto mb-14 space-y-2">
        <span className="text-xs font-semibold text-brand-gold uppercase tracking-[0.3em] block font-poppins">
          Patron Assistance
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif text-brand-text font-normal">
          Frequently Asked Questions
        </h1>
        <p className="text-xs text-neutral-500 font-light">
          Everything you need to know about our handlooms, zari certification, delivery, and care.
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="bg-white border border-brand-border hover:border-brand-gold/50 rounded-2xl overflow-hidden transition-all shadow-card"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
              >
                <div>
                  <span className="text-[10px] uppercase font-bold text-brand-gold tracking-wider block mb-1 font-poppins">
                    {faq.category}
                  </span>
                  <h3 className="font-serif text-base text-brand-text font-medium">{faq.q}</h3>
                </div>
                <div className="p-1 rounded-full bg-brand-ivory text-neutral-500">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-brand-border pt-3 font-light animate-fadeIn">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-12 p-6 bg-brand-ivory border border-brand-border rounded-3xl text-center space-y-3 shadow-card">
        <h3 className="font-serif text-lg text-brand-text font-semibold">Have a Specific Question?</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto font-light">
          Our drape concierge is available on WhatsApp 24×7 to assist you.
        </p>
        <a
          href="https://wa.me/918688472300"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-full transition-colors font-poppins shadow-md"
        >
          <MessageCircle className="w-4 h-4" /> Ask Concierge on WhatsApp
        </a>
      </div>
    </div>
  );
}
