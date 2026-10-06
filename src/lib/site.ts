// Single source of truth for Raveena Sarees brand identity and public contact details.
// Production domain comes from NEXT_PUBLIC_SITE_URL (set it in the hosting environment).
//
// Legal/business details are NEVER invented. Set these in the hosting environment once the
// business has them; until then the legal pages show a clear "to be provided" note:
//   NEXT_PUBLIC_BUSINESS_LEGAL_NAME, NEXT_PUBLIC_BUSINESS_ADDRESS, NEXT_PUBLIC_GSTIN,
//   NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME
const clean = (v: string | undefined) => (v && v.trim() ? v.trim() : "");

export const SITE = {
  name: "Raveena Sarees",
  email: "raveenasarees22@gmail.com",
  whatsappNumber: "917780756009",
  phoneDisplay: "+91 77807 56009",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  logo: "/images/logo/raveena-logo.jpg",
  mark: "/images/logo/raveena-mark.png",
  /** Returns/refund request window, in days from delivery. */
  returnWindowDays: 7,
  legalName: clean(process.env.NEXT_PUBLIC_BUSINESS_LEGAL_NAME),
  // Pre-existing address from the project; override with NEXT_PUBLIC_BUSINESS_ADDRESS (and confirm it is correct).
  address: clean(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS) || "Marthadi, Bejjur, Komaram Bheem Asifabad, Telangana - 504224, India",
  gstin: clean(process.env.NEXT_PUBLIC_GSTIN),
  grievanceOfficer: clean(process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME),
} as const;
