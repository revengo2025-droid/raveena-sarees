// Normalises courier/Shiprocket status labels into a small, stable set used by the app.
// Mapping is by the human-readable label Shiprocket sends (`current_status` / `shipment_status`
// in webhooks, `current_status` in tracking responses). Labels we do not recognise map to
// "unknown": the raw label is still stored and shown, but the order status is NOT changed.
// Pure module (no I/O) so it can be unit-tested and shared with the browser.
import type { OrderStatus } from "@/lib/types";

export type ShipmentStatus =
  | "created"
  | "awb_assigned"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "undelivered"
  | "rto"
  | "returned"
  | "cancelled"
  | "lost"
  | "exception"
  | "unknown";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  created: "Shipment created",
  awb_assigned: "Courier assigned",
  pickup_scheduled: "Pickup scheduled",
  picked_up: "Picked up",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  undelivered: "Delivery attempt failed",
  rto: "Returning to seller",
  returned: "Returned to seller",
  cancelled: "Shipment cancelled",
  lost: "Shipment lost / damaged",
  exception: "Needs attention",
  unknown: "Status update",
};

/** Statuses an admin should look at. */
export const SHIPMENT_ALERT_STATUSES: ShipmentStatus[] = ["undelivered", "rto", "returned", "lost", "exception"];

const norm = (s: unknown) =>
  String(s ?? "")
    .toUpperCase()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const EXACT: Record<string, ShipmentStatus> = {
  NEW: "created",
  INVOICED: "created",
  "READY TO SHIP": "created",
  "SHIPMENT BOOKED": "created",
  "AWB ASSIGNED": "awb_assigned",
  "LABEL GENERATED": "awb_assigned",
  "PICKUP SCHEDULED": "pickup_scheduled",
  "PICKUP GENERATED": "pickup_scheduled",
  "PICKUP QUEUED": "pickup_scheduled",
  "PICKUP RESCHEDULED": "pickup_scheduled",
  "OUT FOR PICKUP": "pickup_scheduled",
  "MANIFEST GENERATED": "pickup_scheduled",
  "PICKUP ERROR": "exception",
  "PICKUP EXCEPTION": "exception",
  "PICKED UP": "picked_up",
  SHIPPED: "picked_up",
  "HANDOVER TO COURIER": "picked_up",
  "IN TRANSIT": "in_transit",
  "IN FLIGHT": "in_transit",
  "REACHED AT DESTINATION HUB": "in_transit",
  "REACHED DESTINATION HUB": "in_transit",
  "REACHED WAREHOUSE": "in_transit",
  "MISROUTED": "in_transit",
  DELAYED: "in_transit",
  "OUT FOR DELIVERY": "out_for_delivery",
  DELIVERED: "delivered",
  UNDELIVERED: "undelivered",
  "FAILED DELIVERY": "undelivered",
  "DELIVERY FAILED": "undelivered",
  NDR: "undelivered",
  CANCELED: "cancelled",
  CANCELLED: "cancelled",
  "CANCELLED BEFORE DISPATCHED": "cancelled",
  LOST: "lost",
  DAMAGED: "lost",
  DESTROYED: "lost",
  UNTRACEABLE: "lost",
  "DISPOSED OFF": "lost",
};

export function normalizeShipmentStatus(label: unknown): ShipmentStatus {
  const s = norm(label);
  if (!s) return "unknown";
  if (s.startsWith("RTO")) return s === "RTO DELIVERED" ? "returned" : "rto";
  return EXACT[s] ?? "unknown";
}

// Order lifecycle order for forward-only automatic updates
const RANK: Partial<Record<OrderStatus, number>> = {
  pending: 0,
  confirmed: 1,
  processing: 2,
  packed: 3,
  shipped: 4,
  out_for_delivery: 5,
  delivered: 6,
};

/**
 * The order status a shipment status should move the order to, or null for "leave it alone".
 * Automatic updates only move forward and never touch cancelled/returned/refund states.
 */
export function orderStatusForShipment(shipment: ShipmentStatus, current: OrderStatus): OrderStatus | null {
  const rank = RANK[current];
  if (rank === undefined) return null; // cancelled / return / refund states are managed by the store
  let target: OrderStatus | null = null;
  switch (shipment) {
    case "picked_up":
    case "in_transit":
      target = "shipped";
      break;
    case "out_for_delivery":
      target = "out_for_delivery";
      break;
    case "delivered":
      target = "delivered";
      break;
    case "returned":
      // Parcel came back undelivered (RTO) - only valid before delivery
      return rank >= RANK.shipped! && rank < RANK.delivered! ? "returned" : null;
    case "cancelled":
      // A shipment cancelled before pickup cancels the order; after dispatch the store decides
      return rank < RANK.shipped! ? "cancelled" : null;
    default:
      return null;
  }
  return RANK[target]! > rank ? target : null;
}

/** Shiprocket timestamps arrive as IST strings: "2026-10-07 14:05:11" or "07 10 2026 14:05:11". */
export function parseShiprocketTime(raw: unknown): Date | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || "00"}+05:30`);
  m = s.match(/^(\d{2})[ \-/](\d{2})[ \-/](\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || "00"}+05:30`);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
