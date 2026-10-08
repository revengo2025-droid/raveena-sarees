// Single source of truth for Raveena Sarees brand identity and public contact details.
// Production domain comes from NEXT_PUBLIC_SITE_URL (set it in the hosting environment).
//
// Legal/business details are NEVER invented. Set these in the hosting environment once the
// business has them; until then the legal pages show a clear "to be provided" note:
//   NEXT_PUBLIC_BUSINESS_LEGAL_NAME, NEXT_PUBLIC_BUSINESS_ADDRESS, NEXT_PUBLIC_GSTIN,
//   NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME
// Public contact points (shown on the site, so they use the NEXT_PUBLIC_ prefix):
//   NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL, NEXT_PUBLIC_BUSINESS_SUPPORT_EMAIL,
//   NEXT_PUBLIC_BUSINESS_GRIEVANCE_EMAIL, NEXT_PUBLIC_BUSINESS_PHONE
// The private inbox that receives alerts (contact form, tickets) is server-only: see site.server.ts.
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : "");

/** Canonical production origin. Used whenever NEXT_PUBLIC_SITE_URL is missing or points at a dev/preview host in production. */
export const PRODUCTION_URL = "https://www.raveenasarees.com";

function resolveSiteUrl(): string {
  const configured = clean(process.env.NEXT_PUBLIC_SITE_URL).replace(/\/+$/, "");
  if (process.env.NODE_ENV !== "production") return configured || "http://localhost:3000";
  // Never publish localhost or *.vercel.app in production metadata, emails or sitemaps
  if (!configured || /localhost|127\.0\.0\.1|\.vercel\.app/i.test(configured)) return PRODUCTION_URL;
  return configured;
}

/** The business mailbox that already existed in this project (store_info seed, Resend reply-to). Override with env. */
const DEFAULT_CONTACT_EMAIL = "raveenasarees22@gmail.com";
/** The concierge/WhatsApp number confirmed by the owner. Override with NEXT_PUBLIC_BUSINESS_PHONE. */
const DEFAULT_PHONE = "+91 77807 56009";

const contactEmail = clean(process.env.NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL) || DEFAULT_CONTACT_EMAIL;
const phoneDisplay = clean(process.env.NEXT_PUBLIC_BUSINESS_PHONE) || DEFAULT_PHONE;

export const SITE = {
  name: "Raveena Sarees",
  /** Official public contact email. The single source for every page, email template and structured-data block. */
  email: contactEmail,
  /** Customer support address (defaults to the contact email). */
  supportEmail: clean(process.env.NEXT_PUBLIC_BUSINESS_SUPPORT_EMAIL) || contactEmail,
  /** Grievance Officer contact (defaults to the contact email). */
  grievanceEmail: clean(process.env.NEXT_PUBLIC_BUSINESS_GRIEVANCE_EMAIL) || contactEmail,
  /** Digits only, for wa.me and tel: links. */
  whatsappNumber: phoneDisplay.replace(/\D/g, ""),
  phoneDisplay,
  url: resolveSiteUrl(),
  logo: "/images/logo/raveena-logo.jpg",
  mark: "/images/logo/raveena-mark.png",
  /** Returns/refund request window, in days from delivery. */
  returnWindowDays: 7,
  legalName: clean(process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME),
  // Pre-existing address from the project; override with NEXT_PUBLIC_BUSINESS_ADDRESS (and confirm it is correct).
  address: clean(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS) || "Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana - 504299, India",
  gstin: clean(process.env.NEXT_PUBLIC_GSTIN),
  grievanceOfficer: clean(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME),
} as const;
