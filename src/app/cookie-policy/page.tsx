import type { Metadata } from "next";
import { LegalPage, Section } from "@/components/legal/LegalPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `What cookies and browser storage ${SITE.name} uses, and how you can control them.`,
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro="This page explains the cookies and similar browser storage used on this website. At present we use only what is needed to make the store work."
    >
      <Section title="What we use">
        <ul>
          <li>
            <strong>Sign-in cookies (essential):</strong> set by our authentication provider (Supabase) to keep you signed in
            securely.
          </li>
          <li>
            <strong>Browser storage (essential):</strong> your bag, wishlist and recently viewed sarees are saved in your
            browser&rsquo;s local storage so they are still there when you return. This data stays on your device until you clear it.
          </li>
          <li>
            <strong>Payment provider (at checkout only):</strong> when you pay online, Razorpay loads its own payment window,
            which may set its own cookies to process and secure the payment.
          </li>
        </ul>
      </Section>

      <Section title="What we do not use">
        <p>
          We do not currently use advertising cookies, cross-site tracking or third-party analytics on this website. If that
          changes, we will update this policy and ask for your consent where required.
        </p>
      </Section>

      <Section title="Your choices">
        <ul>
          <li>You can delete cookies and site data in your browser settings. You will be signed out and your bag and wishlist on that device will be cleared.</li>
          <li>If you block essential cookies, sign-in and checkout will not work.</li>
        </ul>
      </Section>
    </LegalPage>
  );
}
