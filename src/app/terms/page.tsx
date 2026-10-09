import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that apply when you browse or buy from ${SITE.name}: orders, pricing, payments, shipping, returns and your responsibilities.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      intro={`These terms apply to your use of this website and to purchases from ${SITE.legalName || SITE.name}. By using the website or placing an order you agree to them.`}
    >
      <Section title="About us">
        <p>
          This website is operated by {SITE.legalName || SITE.name}
          {SITE.address ? `, ${SITE.address}` : ""}. You can reach us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>You need an account to place an order. Give accurate information and keep your password confidential.</li>
          <li>You are responsible for activity on your account. Tell us promptly if you suspect misuse.</li>
          <li>You must be at least 18 years old, or use the website with a parent or guardian.</li>
        </ul>
      </Section>

      <Section title="Products and descriptions">
        <p>
          We describe our sarees as accurately as we can, including fabric, colour and other details. Sarees are handcrafted or
          hand-finished, so slight variations in weave, border and zari are normal. Colours may look different on different
          screens. Photographs are for illustration.
        </p>
      </Section>

      <Section title="Prices and availability">
        <ul>
          <li>Prices are in Indian Rupees (₹). The price you pay is the price calculated by our system at checkout, including any discount, shipping and gift packaging shown to you.</li>
          <li>Products are subject to availability. If an item is out of stock after you order, we will tell you and refund any payment.</li>
          <li>If a price is shown incorrectly, we may cancel the order and refund you.</li>
        </ul>
      </Section>

      <Section title="Placing an order">
        <p>
          Your order is an offer to buy. It is confirmed when your online payment is verified. We do not offer cash on
          delivery: every order is paid online at checkout. We may decline or cancel an order for reasons such as stock, payment problems, an address we cannot
          serve, or suspected fraud, in which case you receive a full refund of anything paid.
        </p>
      </Section>

      <Section title="Payments">
        <p>
          Online payments are processed securely by Razorpay. Your order is marked paid only after the payment has been
          verified on our servers. Razorpay is the only payment method we accept.
        </p>
      </Section>

      <Section title="Shipping, returns, refunds and cancellations">
        <p>These are governed by our policies, which form part of these terms:</p>
        <ul>
          <li><Link href="/shipping-policy">Shipping Policy</Link></li>
          <li><Link href="/return-policy">Return Policy</Link></li>
          <li><Link href="/refund-policy">Refund Policy</Link></li>
          <li><Link href="/cancellation-policy">Cancellation Policy</Link></li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <ul>
          <li>Do not misuse the website, attempt to access other people&rsquo;s accounts or data, or interfere with its operation.</li>
          <li>Do not use the website for unlawful purposes or to submit false orders, reviews or claims.</li>
        </ul>
      </Section>

      <Section title="Reviews and content you submit">
        <p>
          Reviews and messages you submit must be honest and lawful. We may moderate, edit or remove content that is false,
          abusive or off-topic. By submitting a review you allow us to display it on the website.
        </p>
      </Section>

      <Section title="Intellectual property">
        <p>
          The brand name, logo, photographs, text and design of this website belong to {SITE.name} or its licensors. You may
          not copy or reuse them without our written permission.
        </p>
      </Section>

      <Section title="Our responsibility">
        <p>
          We take care to provide the website and products as described. To the extent permitted by law, we are not liable for
          indirect losses, or for delays or failures caused by events beyond our reasonable control. Nothing in these terms
          limits your rights under applicable consumer protection law.
        </p>
      </Section>

      <Section title="Privacy">
        <p>Our handling of personal information is described in the <Link href="/privacy-policy">Privacy Policy</Link>.</p>
      </Section>

      <Section title="Governing law and disputes">
        <p>
          These terms are governed by the laws of India. Please first contact us so we can try to resolve your concern (see{" "}
          <Link href="/grievance-redressal">Grievance Redressal</Link>). Any dispute that cannot be resolved will be subject to
          the jurisdiction of the competent courts in India.
        </p>
      </Section>

      <Section title="Changes">
        <p>We may update these terms. The version published here on the date of your order applies to that order.</p>
      </Section>
    </LegalPage>
  );
}
