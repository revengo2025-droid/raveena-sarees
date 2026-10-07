import { shippingFeeFor } from "@/lib/pricing";
// =============================================================================
// Shipping service entry point
// - Fees: PRICING (shared with the browser so totals always match)
// - Shipments, AWB, pickup, tracking: Shiprocket (see ./fulfillment.ts and ./tracking.ts)
// No tracking numbers or tracking events are ever generated locally.
// =============================================================================

export function calculateShippingFee(_pincode: string, orderSubtotal: number): number {
  return shippingFeeFor(orderSubtotal);
}
