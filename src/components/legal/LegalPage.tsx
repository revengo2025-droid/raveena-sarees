import React from "react";
import Link from "next/link";
import { SITE } from "@/lib/site";

export const LEGAL_UPDATED = "8 October 2026";

const POLICY_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/shipping-policy", label: "Shipping Policy" },
  { href: "/return-policy", label: "Return Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/cancellation-policy", label: "Cancellation Policy" },
  { href: "/cookie-policy", label: "Cookie Policy" },
  { href: "/grievance-redressal", label: "Grievance Redressal" },
];

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="text-xl sm:text-2xl font-serif text-brand-text mb-3">{title}</h2>
      <div className="space-y-3 text-[15px] leading-7 text-neutral-700 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1.5 [&_a]:text-brand-maroon [&_a]:underline [&_strong]:text-brand-text">
        {children}
      </div>
    </section>
  );
}

/** Contact + business details. Only details that actually exist are shown; nothing is invented. */
export function ContactBlock() {
  return (
    <div className="bg-brand-ivory border border-brand-border rounded-2xl p-5 text-sm leading-7 text-neutral-700">
      <p><strong className="text-brand-text">{SITE.legalName || SITE.name}</strong></p>
      {SITE.address && <p>{SITE.address}</p>}
      <p>
        Email: <a className="text-brand-maroon underline" href={`mailto:${SITE.email}`}>{SITE.email}</a>
      </p>
      <p>
        Phone / WhatsApp:{" "}
        <a className="text-brand-maroon underline" href={`https://wa.me/${SITE.whatsappNumber}`}>{SITE.phoneDisplay}</a>
      </p>
      {SITE.gstin && <p>GSTIN: {SITE.gstin}</p>}
    </div>
  );
}

export function LegalPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-brand-white text-brand-text font-sans">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-xs text-neutral-500 mb-5 font-poppins">
          <Link href="/" className="hover:text-brand-gold">Home</Link> <span aria-hidden="true">/</span>{" "}
          <span className="text-brand-text">{title}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-serif font-normal">{title}</h1>
        <p className="text-xs text-neutral-500 mt-2">Last updated: {LEGAL_UPDATED}</p>
        {intro && <p className="mt-5 text-[15px] leading-7 text-neutral-700">{intro}</p>}

        {children}

        <Section title="Contact us">
          <ContactBlock />
        </Section>

        <aside className="mt-10 text-xs leading-6 text-neutral-500 border-t border-brand-border pt-5">
          This page is provided for general information about how {SITE.name} operates. It is not legal advice and
          should be reviewed by a qualified legal professional before being relied upon as a formal legal document.
        </aside>

        <nav aria-label="Policies" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-poppins">
          {POLICY_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-neutral-600 hover:text-brand-maroon underline-offset-2 hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
