"use server";

import { matchIndianState, INDIAN_PINCODE_RE } from "@/lib/geo/india";
import { rateLimit } from "@/lib/security/rate-limit";
import { requestIpHash } from "@/lib/support/context";
import { SITE } from "@/lib/site";

export interface AddressSuggestion {
  houseNumber?: string;
  streetAddress?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

const USER_AGENT = `${SITE.name} checkout (${SITE.email})`;

/**
 * Turns browser coordinates into an editable address suggestion using OpenStreetMap Nominatim.
 * The coordinates are used for this single lookup and are NOT stored or logged.
 * Nominatim usage policy: identify the app (User-Agent), max ~1 request/second.
 */
export async function reverseGeocodeAction(lat: number, lon: number) {
  const limit = await rateLimit("geo", await requestIpHash());
  if (!limit.ok) return { success: false as const, error: "Too many lookups. Please enter your address manually." };
  if (
    typeof lat !== "number" || typeof lon !== "number" ||
    !Number.isFinite(lat) || !Number.isFinite(lon) ||
    lat < 6 || lat > 38 || lon < 68 || lon > 98 // rough bounding box of India
  ) {
    return { success: false as const, error: "We can only look up locations within India." };
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("accept-language", "en");
    url.searchParams.set("lat", lat.toFixed(6));
    url.searchParams.set("lon", lon.toFixed(6));

    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { success: false as const, error: "Location lookup is unavailable right now. Please enter your address manually." };

    const data = await res.json();
    const a = data?.address || {};
    const state = matchIndianState(a.state);
    const postcode = typeof a.postcode === "string" ? a.postcode.replace(/\s/g, "") : "";

    const suggestion: AddressSuggestion = {
      houseNumber: a.house_number || undefined,
      streetAddress: [a.building, a.road].filter(Boolean).join(", ") || undefined,
      locality: a.suburb || a.neighbourhood || a.village || a.hamlet || undefined,
      city: a.city || a.town || a.state_district || a.county || undefined,
      state: state || undefined,
      pincode: INDIAN_PINCODE_RE.test(postcode) ? postcode : undefined,
    };

    if (!suggestion.city && !suggestion.pincode && !suggestion.streetAddress) {
      return { success: false as const, error: "We could not find an address for your location. Please enter it manually." };
    }
    return { success: true as const, data: suggestion };
  } catch {
    return { success: false as const, error: "Location lookup failed. Please enter your address manually." };
  }
}

/** Suggests city / state for a PIN code (India Post data). Suggestions only; the customer confirms. */
export async function lookupPincodeAction(pincode: string) {
  const limit = await rateLimit("geo", await requestIpHash());
  if (!limit.ok) return { success: false as const, error: "Too many lookups. Please try again shortly." };
  if (!INDIAN_PINCODE_RE.test(pincode)) return { success: false as const, error: "Enter a valid 6-digit PIN code." };
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return { success: false as const, error: "PIN code lookup unavailable." };
    const json = await res.json();
    const offices = json?.[0]?.Status === "Success" ? json[0].PostOffice || [] : [];
    if (!offices.length) return { success: false as const, error: "We could not find this PIN code." };

    const state = matchIndianState(offices[0].State);
    const districts = Array.from(new Set<string>(offices.map((o: any) => String(o.District)).filter(Boolean)));
    const places = Array.from(new Set<string>(offices.map((o: any) => String(o.Name)).filter(Boolean)));
    return { success: true as const, data: { state: state || undefined, districts, places } };
  } catch {
    return { success: false as const, error: "PIN code lookup unavailable." };
  }
}
