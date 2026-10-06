import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `When and how ${SITE.name} issues refunds: eligibility, method, timelines, cancelled orders, damaged or wrong items and partial refunds.`,
  alternates: { canonical: "/refund-policy" },
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      intro="This policy explains when you are entitled to a refund, how it is paid, and what to expect while it is processed."
    >
      <Section title="When you get a refund">
        <ul>
          <li>Your <Link href="/return-policy">return request</Link> was approved and we have received and inspected the item.</li>
          <li>You cancelled an order that had not yet shipped (see the <Link href="/cancellation-policy">Cancellation Policy</Link>).</li>
          <li>We cancelled your order (for example, the item was out of stock or the address could not be served).</li>
          <li>The item arrived damaged or was the wrong item, and your request was approved.</li>
          <li>Money was debited but your order could not be confirmed.</li>
        </ul>
      </Section>

      <Section title="How your refund is paid">
        <ul>
          <li>
            <strong>Prepaid orders (UPI, card, net banking, wallet):</strong> refunded to the original payment method.
          </li>
          <li>
            <strong>Cash on delivery orders:</strong> refunded by bank transfer or UPI. We will ask you for the details; we never
            ask for card numbers, PINs or OTPs.
          </li>
        </ul>
      </Section>

      <Section title="Timeline">
        <ol>
          <li>For returns, the refund is started after we receive the item and finish inspecting it.</li>
          <li>For cancellations before shipping, the refund is started once the cancellation is confirmed.</li>
          <li>
            After we initiate the refund, your bank or payment provider usually takes <strong>5 to 7 business days</strong> to
            show it in your account. We will email you when it has been initiated.
          </li>
        </ol>
        <p>Refunds are processed by our team, so the time we take to initiate one depends on when the return reaches us.</p>
      </Section>

      <Section title="Damaged or wrong items">
        <p>
          Contact us within the {SITE.returnWindowDays}-day return window with your order number, photos and, ideally, an
          unboxing video. If approved, you receive a full refund of the item price and the shipping you paid, and we
          arrange the return at no cost to you.
        </p>
      </Section>

      <Section title="Partial refunds">
        <ul>
          <li>If only some items in an order are returned, we refund only those items.</li>
          <li>
            Shipping charges you paid are refunded only when the return is due to our error or we cancel the order.
          </li>
          <li>
            If a returned item is not in the condition required by the <Link href="/return-policy">Return Policy</Link>, we
            may refund a reduced amount or decline the refund; we will explain why.
          </li>
          <li>Discounts and coupon value are refunded in proportion to the items returned.</li>
        </ul>
      </Section>

      <Section title="When a refund can be refused">
        <ul>
          <li>The request was made after the {SITE.returnWindowDays}-day window.</li>
          <li>The item was worn, washed, altered, or returned without its tags, packaging or blouse piece.</li>
          <li>The item was not returned, or a different item was sent back.</li>
          <li>The reason given does not match the condition of the item.</li>
        </ul>
        <p>If we decline a refund we will tell you the reason. You can ask us to review the decision.</p>
      </Section>

      <Section title="If you have not received your refund">
        <p>
          First check with your bank after the 5 to 7 business days mentioned above. If it is still missing, email{" "}
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with your order number. If your concern is not resolved, you
          can use our <Link href="/grievance-redressal">Grievance Redressal</Link> process.
        </p>
      </Section>
    </LegalPage>
  );
}
