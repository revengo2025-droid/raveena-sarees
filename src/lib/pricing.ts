// Single source of truth for charges. Used by the browser (to show totals) AND the server
// (to compute the amount that is actually charged), so the two can never disagree.
// To change a charge, change it here only.
export const PRICING = {
  /** Delivery fee (₹). Delivery is free on every order. */
  shippingFee: 0,
  /** Optional gift packaging (₹). */
  giftWrapFee: 150,
} as const;

export function shippingFeeFor(_subtotal: number): number {
  return PRICING.shippingFee;
}
