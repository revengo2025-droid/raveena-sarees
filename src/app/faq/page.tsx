import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { FAQ_CATEGORIES } from "@/lib/faqs";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: `Answers about ordering, payments, shipping, returns, refunds, products and support at ${SITE.name}.`,
  alternates: { canonical: "/faq" },
};

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_CATEGORIES.flatMap((c) =>
      c.items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      }))
    ),
  };

  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-5 font-poppins">
          <Link href="/" className="hover:text-brand-gold">Home</Link> <span aria-hidden="true">/</span> FAQ
        </nav>
        <h1 className="text-3xl sm:text-4xl font-serif font-normal">Frequently Asked Questions</h1>
        <p className="mt-3 text-[15px] text-neutral-600">
          Quick answers about orders, payments, shipping, returns and more. Can&rsquo;t find what you need? See{" "}
          <Link href="/contact" className="text-brand-maroon underline">Contact</Link>.
        </p>

        <nav aria-label="FAQ categories" className="mt-6 flex flex-wrap gap-2">
          {FAQ_CATEGORIES.map((c) => (
            <a key={c.id} href={`#${c.id}`} className="px-3.5 min-h-[36px] inline-flex items-center rounded-full border border-brand-border bg-brand-ivory text-xs font-poppins text-neutral-700 hover:border-brand-gold hover:text-brand-maroon">
              {c.title}
            </a>
          ))}
        </nav>

        {FAQ_CATEGORIES.map((c) => (
          <section key={c.id} id={c.id} aria-labelledby={`${c.id}-h`} className="mt-10 scroll-mt-28">
            <h2 id={`${c.id}-h`} className="text-xl sm:text-2xl font-serif mb-3">{c.title}</h2>
            <div className="divide-y divide-brand-border border border-brand-border rounded-2xl bg-white overflow-hidden">
              {c.items.map((item) => (
                <details key={item.q} className="group">
                  <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-4 sm:px-5 min-h-[56px] py-3 text-[15px] font-medium hover:bg-brand-ivory/60 [&::-webkit-details-marker]:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-gold">
                    {item.q}
                    <ChevronDown className="w-4 h-4 shrink-0 text-brand-gold transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
                  </summary>
                  <p className="px-4 sm:px-5 pb-4 text-[15px] leading-7 text-neutral-700">{item.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}

        <p className="mt-10 text-sm text-neutral-600">
          Policies:{" "}
          <Link href="/shipping-policy" className="underline text-brand-maroon">Shipping</Link>,{" "}
          <Link href="/return-policy" className="underline text-brand-maroon">Returns</Link>,{" "}
          <Link href="/refund-policy" className="underline text-brand-maroon">Refunds</Link>,{" "}
          <Link href="/cancellation-policy" className="underline text-brand-maroon">Cancellation</Link>,{" "}
          <Link href="/grievance-redressal" className="underline text-brand-maroon">Grievance Redressal</Link>.
        </p>
      </div>
    </div>
  );
}
