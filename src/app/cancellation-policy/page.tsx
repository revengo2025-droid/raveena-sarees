import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description: `How to cancel an order with ${SITE.name}, what happens to payments, and orders cancelled by us.`,
  alternates: { canonical: "/cancellation-policy" },
};

export default function CancellationPolicyPage() {
  return (
    <LegalPage title="Cancellation Policy" intro="You can cancel an order as long as it has not been shipped.">
      <Section title="Cancelling before the order ships">
        <p>
          Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or WhatsApp us at{" "}
          <a href={`https://wa.me/${SITE.whatsappNumber}`}>{SITE.phoneDisplay}</a> as soon as possible with your order
          number. If the order has not shipped, we will cancel it and confirm by email.
        </p>
        <ul>
          <li><strong>Prepaid orders</strong> are refunded as described in the <Link href="/refund-policy">Refund Policy</Link>.</li>
          <li><strong>Cash on delivery orders</strong> have nothing to refund because no payment has been made.</li>
        </ul>
      </Section>

      <Section title="After the order has shipped">
        <p>
          Once an order has shipped it can no longer be cancelled. You can either refuse the delivery or, if you accept it,
          request a return under the <Link href="/return-policy">Return Policy</Link> within {SITE.returnWindowDays} days of
          delivery.
        </p>
      </Section>

      <Section title="Orders we cancel">
        <p>We may cancel an order if, for example:</p>
        <ul>
          <li>the item is out of stock or cannot be fulfilled;</li>
          <li>your payment could not be verified;</li>
          <li>the delivery address cannot be served by our courier; or</li>
          <li>we suspect the order is fraudulent or placed in error.</li>
        </ul>
        <p>If we cancel a paid order you receive a full refund.</p>
      </Section>

      <Section title="Failed or incomplete payments">
        <p>
          If your online payment fails or you close the payment window, your order is not confirmed. If any amount was
          debited, it is normally reversed by your bank or payment provider automatically; this can take several business
          days. If it is not reversed, contact us with your order number and payment reference.
        </p>
      </Section>

      <Section title="Changing an order">
        <p>
          We cannot edit an order after it is placed. If you need a different address, colour or product, contact us before
          it ships, or cancel it and place a new order.
        </p>
      </Section>
    </LegalPage>
  );
}
