import { SITE } from "@/lib/site";
import { PRICING } from "@/lib/pricing";
import { formatINR } from "@/lib/utils";

export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqCategory {
  id: string;
  title: string;
  items: FaqItem[];
}

const d = SITE.returnWindowDays;

// Answers describe what the website and our policies actually do today. Keep in sync with the policy pages.
export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "orders",
    title: "Orders",
    items: [
      {
        q: "How do I place an order?",
        a: "Open a saree, choose your colour if options are shown, and add it to your bag. Open the bag, press Checkout, sign in or create an account, then enter your contact details, delivery address and pay. You will see an order number on the confirmation page.",
      },
      {
        q: "Can I modify an order?",
        a: "We cannot edit an order after it is placed. If you need a different address or product, contact us before the order ships, or cancel it and place a new one.",
      },
      {
        q: "Can I cancel an order?",
        a: `Yes, as long as it has not shipped. Email ${SITE.email} or WhatsApp ${SITE.phoneDisplay} with your order number. Once an order has shipped it cannot be cancelled, but you can request a return after delivery.`,
      },
      {
        q: "How do I track my order?",
        a: "Sign in and open My Orders, then choose Track Order. You will see the order status, and once it ships, the courier, tracking number and tracking link.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments",
    items: [
      {
        q: "What payment methods are supported?",
        a: "All payments are made online through Razorpay, using UPI, cards, net banking or wallets.",
      },
      {
        q: "Is online payment secure?",
        a: "Payments are processed by Razorpay. We never see or store your card number, UPI PIN or bank login. Your order is marked paid only after the payment is verified on our servers.",
      },
      {
        q: "What happens if my payment fails?",
        a: "Your order is not confirmed. If any money was debited, your bank or payment provider normally reverses it automatically within a few business days. If it is not reversed, contact us with your order number and payment reference.",
      },
    ],
  },
  {
    id: "shipping",
    title: "Shipping",
    items: [
      {
        q: "Where do you deliver?",
        a: "We deliver across India to PIN codes served by our courier partners.",
      },
      {
        q: "How long does delivery take?",
        a: "It depends on your location and the courier. When your order ships, its tracking details (and the expected delivery date where the courier provides one) appear on your order page. See the Shipping Policy for details.",
      },
      {
        q: "How much does shipping cost?",
        a: `Orders of ${formatINR(PRICING.freeShippingThreshold)} or more ship free. Below that, shipping is a flat ${formatINR(PRICING.shippingFee)}. The exact amount is shown at checkout.`,
      },
    ],
  },
  {
    id: "returns",
    title: "Returns",
    items: [
      {
        q: "Can I return a saree?",
        a: `Yes, if it arrived damaged or defective, is the wrong item, or is materially different from its description. It must be unused, unwashed and unaltered, in its original packaging with tags and blouse piece.`,
      },
      {
        q: "What is the return window?",
        a: `${d} days from the date of delivery.`,
      },
      {
        q: "How do I request a return?",
        a: `Email ${SITE.email} or WhatsApp ${SITE.phoneDisplay} within ${d} days of delivery with your order number, the reason and photos (an unboxing video helps for damaged or wrong items). We will confirm whether it is approved and how to send the item back. Please do not ship anything before approval.`,
      },
    ],
  },
  {
    id: "refunds",
    title: "Refunds",
    items: [
      {
        q: "When will I receive my refund?",
        a: "After we receive and inspect a returned item (or confirm a cancellation), we initiate the refund and email you. Your bank or payment provider then usually takes 5 to 7 business days to show it.",
      },
      {
        q: "How is the refund processed?",
        a: "Refunds go back to the original payment method. We never ask for card numbers, PINs or OTPs.",
      },
      {
        q: "What if I haven't received my refund?",
        a: `Check with your bank after the 5 to 7 business days. If it is still missing, email ${SITE.email} with your order number. If you remain unsatisfied, use our Grievance Redressal process.`,
      },
    ],
  },
  {
    id: "products",
    title: "Products",
    items: [
      {
        q: "Are the saree images accurate?",
        a: "We photograph our sarees to show them as faithfully as we can, but colours can look slightly different on different screens, and handcrafted details such as motif placement can vary a little from piece to piece.",
      },
      {
        q: "Is the blouse included?",
        a: "Each product page states whether a blouse piece is included and its length. Please check the details on the saree you are buying.",
      },
      {
        q: "How do I check saree details?",
        a: "The product page lists the fabric, zari, weave, length, blouse details, occasion and care instructions. If you need more information or additional photos, message us on WhatsApp before you buy.",
      },
    ],
  },
  {
    id: "account",
    title: "Account",
    items: [
      {
        q: "How do I reset my password?",
        a: "On the sign-in page choose Forgot password, enter your email and follow the link we send you.",
      },
      {
        q: "How do I update my address?",
        a: "Sign in and open Account, then Addresses, where you can add, edit, delete and choose your default address.",
      },
    ],
  },
  {
    id: "support",
    title: "Support",
    items: [
      {
        q: "How do I raise a complaint?",
        a: `Email ${SITE.email} or WhatsApp ${SITE.phoneDisplay} with your order number and details. We acknowledge complaints within 48 hours. See Grievance Redressal for the full process.`,
      },
      {
        q: "How do I contact Raveena Sarees?",
        a: `Email ${SITE.email}, WhatsApp or call ${SITE.phoneDisplay}, or use the Contact page.`,
      },
    ],
  },
];
