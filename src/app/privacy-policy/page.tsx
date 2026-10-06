import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE.name} collects, uses, shares and protects your personal information, and the choices you have.`,
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`${SITE.legalName || SITE.name} ("we", "us") respects your privacy. This policy explains what personal information we collect when you use this website, why we collect it, who we share it with, and the choices you have.`}
    >
      <Section title="Information we collect">
        <ul>
          <li><strong>Account details:</strong> your name, email address, mobile number and password (stored securely by our authentication provider; we cannot read your password).</li>
          <li><strong>Delivery details:</strong> the addresses you enter or save, and your address type and default-address choice.</li>
          <li><strong>Order information:</strong> items bought, amounts, order and payment status, delivery tracking details, and any returns, refunds or support requests.</li>
          <li><strong>Payment:</strong> online payments are handled by Razorpay. We do not see or store your card, UPI PIN or bank login details. We receive a payment reference and the payment status.</li>
          <li><strong>Location (only if you choose):</strong> if you tap &ldquo;Use My Current Location&rdquo; at checkout, your browser asks permission. We use the coordinates once to suggest an address that you can edit, and we do not store them.</li>
          <li><strong>Messages:</strong> anything you send us through the contact form, email or WhatsApp.</li>
          <li><strong>Device storage:</strong> your bag, wishlist and recently viewed items are kept in your browser (see our <Link href="/cookie-policy">Cookie Policy</Link>).</li>
        </ul>
      </Section>

      <Section title="How we use your information">
        <ul>
          <li>To create your account, process and deliver your orders, and take payment.</li>
          <li>To send order confirmations, shipping updates and responses to your queries.</li>
          <li>To handle returns, refunds, cancellations and complaints.</li>
          <li>To keep the website secure and prevent fraud or misuse.</li>
          <li>To meet legal, tax and accounting obligations.</li>
        </ul>
        <p>We do not sell your personal information.</p>
      </Section>

      <Section title="Who we share it with">
        <p>We share only what is needed with service providers who help us run the store:</p>
        <ul>
          <li><strong>Supabase</strong> hosts our database and sign-in.</li>
          <li><strong>Razorpay</strong> processes online payments.</li>
          <li><strong>Courier partners</strong> receive your name, address and phone number to deliver your order.</li>
          <li><strong>Email and messaging providers</strong> send order emails and internal order notifications.</li>
          <li><strong>OpenStreetMap (Nominatim)</strong> and the <strong>India Post PIN code service</strong> receive a coordinate or PIN code when you use the location or PIN lookup helpers.</li>
        </ul>
        <p>We may also disclose information where the law requires it or to protect our rights and customers.</p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep account and order records for as long as your account is active and as long as needed for returns, disputes,
          accounting and legal requirements. You can ask us to delete your account; we may need to retain some order records
          where the law requires.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We use encrypted connections, restrict access to customer data to authorised staff, and keep payment details with
          Razorpay rather than on our servers. No system is completely secure, so please keep your password private.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <ul>
          <li>View and update your name, mobile number and saved addresses from your <Link href="/account">account</Link>.</li>
          <li>Ask us to access, correct or delete your personal information by emailing <a href={`mailto:${SITE.email}`}>{SITE.email}</a>.</li>
          <li>Withdraw consent for location or marketing messages at any time.</li>
          <li>Clear your browser storage to remove your bag and wishlist from your device.</li>
        </ul>
        <p>
          You can exercise the rights available to you under applicable Indian law, including the Digital Personal Data
          Protection Act, 2023, by contacting us. If you are not satisfied with our response, see{" "}
          <Link href="/grievance-redressal">Grievance Redressal</Link>.
        </p>
      </Section>

      <Section title="Children">
        <p>This website is intended for adults. We do not knowingly collect information from children.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>We may update this policy from time to time. The &ldquo;Last updated&rdquo; date above shows the latest version.</p>
      </Section>
    </LegalPage>
  );
}
