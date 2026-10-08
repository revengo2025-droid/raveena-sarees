import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";
import { PRICING } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shipping Policy",
  description: `${SITE.name} shipping: where we deliver, shipping charges, dispatch, tracking and what to do about damaged or undelivered parcels.`,
  alternates: { canonical: "/shipping-policy" },
};

export default function ShippingPolicyPage() {
  return (
    <LegalPage
      title="Shipping Policy"
      intro="This policy explains where we deliver, what shipping costs, and how you can follow your parcel."
    >
      <Section title="Where we deliver">
        <p>
          We currently deliver within India, to PIN codes served by our courier partners. If your PIN code cannot be served we
          will contact you and cancel the order with a full refund.
        </p>
      </Section>

      <Section title="Shipping charges">
        <ul>
          <li>Orders with a merchandise value of <strong>{formatINR(PRICING.freeShippingThreshold)} or more</strong> ship free.</li>
          <li>Orders below {formatINR(PRICING.freeShippingThreshold)} have a flat shipping fee of <strong>{formatINR(PRICING.shippingFee)}</strong>.</li>
          <li>Optional gift packaging is {formatINR(PRICING.giftWrapFee)}.</li>
        </ul>
        <p>The exact amount is always shown at checkout before you pay.</p>
      </Section>

      <Section title="Order processing and dispatch">
        <p>
          We start preparing your order once it is confirmed: after your Razorpay payment is verified. Each saree is checked and packed before it is handed to the courier. We will email you when
          your order ships.
        </p>
      </Section>

      <Section title="Delivery time">
        <p>
          Delivery time depends on your location and the courier. When your order ships, the courier and tracking number (and,
          where the courier provides it, the expected delivery date) are shown on your order page. We do not guarantee a
          delivery date, because transit is outside our control; festivals, weather and local restrictions can cause delays.
        </p>
      </Section>

      <Section title="Tracking your order">
        <p>
          Sign in and open <Link href="/account/orders">My Orders</Link> to see your order status and, once shipped, the
          courier name, tracking number and a tracking link.
        </p>
      </Section>

      <Section title="Delivery attempts and addresses">
        <ul>
          <li>Please give a complete address and a mobile number on which you can be reached.</li>
          <li>If delivery fails because the address is wrong or the parcel is refused, the order may be returned to us. We will contact you; re-shipping or refund charges may apply.</li>
        </ul>
      </Section>

      <Section title="Damaged, tampered or missing parcels">
        <p>
          Please record a video while opening your parcel. If it looks tampered with or the item is damaged or missing,
          contact us immediately and within {SITE.returnWindowDays} days of delivery with your order number and the photos or
          video. See the <Link href="/return-policy">Return Policy</Link> and <Link href="/refund-policy">Refund Policy</Link>.
        </p>
      </Section>
    </LegalPage>
  );
}
