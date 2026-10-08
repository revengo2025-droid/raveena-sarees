import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Grievance Redressal",
  description: `How to raise a complaint with ${SITE.name}, who handles it, and how quickly we respond.`,
  alternates: { canonical: "/grievance-redressal" },
};

export default function GrievancePage() {
  return (
    <LegalPage
      title="Grievance Redressal"
      intro="If you are unhappy with your order, a refund, or how we handled your information, please tell us. We will treat it seriously and keep you informed."
    >
      <Section title="Grievance Officer">
        <div className="bg-brand-ivory border border-brand-border rounded-2xl p-5 text-sm leading-7">
          <p>
            <strong>Name:</strong>{" "}
            {SITE.grievanceOfficer || <em className="text-neutral-500">To be published by the business</em>}
          </p>
          <p>
            <strong>Email:</strong> <a href={`mailto:${SITE.grievanceEmail}`}>{SITE.grievanceEmail}</a>
          </p>
          <p>
            <strong>Phone / WhatsApp:</strong> <a href={`https://wa.me/${SITE.whatsappNumber}`}>{SITE.phoneDisplay}</a>
          </p>
          {SITE.address && (
            <p>
              <strong>Address:</strong> {SITE.address}
            </p>
          )}
        </div>
      </Section>

      <Section title="How to raise a complaint">
        <ol>
          <li>
            Email <a href={`mailto:${SITE.grievanceEmail}`}>{SITE.grievanceEmail}</a> or message us on WhatsApp with your <strong>order number</strong>,
            a clear description of the problem, and any photos or videos.
          </li>
          <li>We acknowledge your complaint within <strong>48 hours</strong>.</li>
          <li>We aim to resolve it within <strong>one month</strong> of receiving it, and tell you the outcome and the reason for it.</li>
        </ol>
      </Section>

      <Section title="Common issues and where to start">
        <ul>
          <li>Returns and damaged or wrong items: <Link href="/return-policy">Return Policy</Link></li>
          <li>Refund not received: <Link href="/refund-policy">Refund Policy</Link></li>
          <li>Cancelling an order: <Link href="/cancellation-policy">Cancellation Policy</Link></li>
          <li>Delivery problems: <Link href="/shipping-policy">Shipping Policy</Link></li>
          <li>Your personal information: <Link href="/privacy-policy">Privacy Policy</Link></li>
        </ul>
      </Section>

      <Section title="Other options">
        <p>
          If you are not satisfied with our response, you may approach the consumer helpline of the Government of India
          (National Consumer Helpline, 1915, or consumerhelpline.gov.in) or your local consumer commission.
        </p>
      </Section>
    </LegalPage>
  );
}
