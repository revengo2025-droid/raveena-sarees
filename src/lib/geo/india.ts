// Indian states & union territories (used for the checkout state selector and server validation).
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
  "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

const norm = (v: string) => v.toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");

/** Maps free text from a geocoder / postal API to one of the official state names, or null. */
export function matchIndianState(value: string | undefined | null): IndianState | null {
  if (!value) return null;
  const n = norm(value);
  const aliases: Record<string, IndianState> = {
    nctofdelhi: "Delhi",
    newdelhi: "Delhi",
    orissa: "Odisha",
    pondicherry: "Puducherry",
    uttaranchal: "Uttarakhand",
    jammuandkashmir: "Jammu and Kashmir",
    andamanandnicobar: "Andaman and Nicobar Islands",
    dadraandnagarhavelianddamananddiu: "Dadra and Nagar Haveli and Daman and Diu",
    daman: "Dadra and Nagar Haveli and Daman and Diu",
    dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu",
  };
  if (aliases[n]) return aliases[n];
  return INDIAN_STATES.find((s) => norm(s) === n) ?? null;
}

export function isIndianState(value: string): value is IndianState {
  return (INDIAN_STATES as readonly string[]).includes(value);
}

/** Valid Indian mobile number: 10 digits starting 6-9 (after stripping +91 / spaces). */
export function normaliseIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length > 10 && digits.startsWith("91") ? digits.slice(-10) : digits;
}
export const INDIAN_MOBILE_RE = /^[6-9]\d{9}$/;
export const INDIAN_PINCODE_RE = /^[1-9]\d{5}$/;
