import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Return Policy",
  description: `How to return a saree to ${SITE.name}: ${SITE.returnWindowDays}-day window, eligibility, process and what is not returnable.`,
  alternates: { canonical: "/return-policy" },
};

export default function ReturnPolicyPage() {
  const d = SITE.returnWindowDays;
  return (
    <LegalPage
      title="Return Policy"
      intro={`We want you to be happy with your saree. If something is not right, you can ask for a return within ${d} days of delivery, subject to the conditions below.`}
    >
      <Section title="Return window">
        <p>
          You can request a return within <strong>{d} days from the date your order is delivered</strong>. Requests made
          after this period cannot be accepted.
        </p>
      </Section>

      <Section title="When a return is accepted">
        <ul>
          <li>The saree or blouse piece arrived <strong>damaged or defective</strong>.</li>
          <li>You received the <strong>wrong item</strong> (different saree, colour or design from your order).</li>
          <li>The product is materially different from its description on our website.</li>
        </ul>
        <p>
          Sarees are handcrafted or hand-finished, so small variations in weave, motif placement and zari are natural and
          are not defects. Colours can also look slightly different on different screens.
        </p>
      </Section>

      <Section title="Condition of the item">
        <p>To be eligible, the item must be:</p>
        <ul>
          <li>unused, unwashed and unaltered (no fall/pico, no blouse stitching, no perfume or stains);</li>
          <li>in its original packaging with all tags and the blouse piece included; and</li>
          <li>accompanied by your order number.</li>
        </ul>
        <p>
          Products marked as non-returnable on their product page are not eligible. Items that have been worn, washed or
          altered cannot be returned.
        </p>
      </Section>

      <Section title="How to request a return">
        <ol>
          <li>
            Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or message us on WhatsApp at{" "}
            <a href={`https://wa.me/${SITE.whatsappNumber}`}>{SITE.phoneDisplay}</a> within {d} days of delivery.
          </li>
          <li>
            Share your <strong>order number</strong>, the reason, and clear <strong>photos</strong> of the item. For damaged or
            wrong items, an unboxing video helps us resolve it faster.
          </li>
          <li>We review your request and reply by email or WhatsApp to confirm whether it is approved.</li>
          <li>If approved, we will tell you how to send the item back (or arrange the pickup).</li>
          <li>
            After we receive and inspect the item, we process your refund as described in the{" "}
            <Link href="/refund-policy">Refund Policy</Link>.
          </li>
        </ol>
        <p>Please do not send an item back before your request is approved.</p>
      </Section>

      <Section title="Return shipping">
        <p>
          If the return is because of our error (damaged, defective or wrong item), we will arrange the return at no cost to you.
          For any other approved return, we will explain the return shipping arrangement, and any charge that applies, when we
          approve your request.
        </p>
      </Section>

      <Section title="Exchanges">
        <p>
          We do not run an automatic exchange process. If you would like a different saree, request a return and place a new
          order, or contact us and we will see what we can do depending on availability.
        </p>
      </Section>

      <Section title="Related policies">
        <p>
          <Link href="/refund-policy">Refund Policy</Link> · <Link href="/cancellation-policy">Cancellation Policy</Link> ·{" "}
          <Link href="/shipping-policy">Shipping Policy</Link>
        </p>
      </Section>
    </LegalPage>
  );
}
