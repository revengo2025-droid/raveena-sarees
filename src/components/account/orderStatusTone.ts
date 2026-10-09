import type { OrderStatus } from "@/lib/types";

/** Status pill colours. Always shown together with the status text, so colour is never the only signal. */
export function statusTone(status: OrderStatus) {
  if (status === "delivered") return "bg-emerald-50 text-emerald-800 border-emerald-200";
  if (status === "cancelled" || status === "returned" || status === "refunded") return "bg-neutral-100 text-neutral-700 border-neutral-200";
  if (status === "shipped" || status === "out_for_delivery") return "bg-sky-50 text-sky-800 border-sky-200";
  return "bg-brand-goldPale text-brand-maroon border-brand-gold/40";
}
