// Single source of truth for charges. Used by the browser (to show totals) AND the server
// (to compute the amount that is actually charged), so the two can never disagree.
// To change a charge, change it here only.
export const PRICING = {
  /** Orders with a merchandise subtotal at or above this ship free (₹). */
  freeShippingThreshold: 2500,
  /** Flat shipping fee below the free-shipping threshold (₹). */
  shippingFee: 150,
  /** Optional gift packaging (₹). */
  giftWrapFee: 150,
} as const;

export function shippingFeeFor(subtotal: number): number {
  return subtotal <= 0 || subtotal >= PRICING.freeShippingThreshold ? 0 : PRICING.shippingFee;
}
