"use server";

import { createServerClient, createAdminClient } from "@/lib/supabase";
import { mapOrderRow } from "@/lib/orders/mapper";
import { refreshTrackingFromApi } from "@/lib/services/shipping/tracking";

const LIVE_STATES = ["confirmed", "processing", "packed", "shipped", "out_for_delivery"];

const GENERIC_ERROR = "We could not load your orders. Please try again.";

/**
 * The signed-in customer's orders. Ownership is enforced twice: the explicit user_id filter and
 * the database row-level-security policy, so a customer can never read another customer's order.
 */
export async function getMyOrdersAction() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: "Please sign in to see your orders." };

    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items (*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { success: false as const, error: GENERIC_ERROR };

    return { success: true as const, data: (data || []).map((row: any) => mapOrderRow(row)) };
  } catch {
    return { success: false as const, error: GENERIC_ERROR };
  }
}

/** One order by number, only if it belongs to the signed-in customer (IDOR-safe). */
export async function getMyOrderAction(orderNumber: string) {
  try {
    if (typeof orderNumber !== "string" || !/^[A-Za-z0-9-]{6,40}$/.test(orderNumber)) {
      return { success: false as const, error: "Order not found." };
    }
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false as const, error: "Please sign in to view this order." };

    let { data, error } = await supabase
      .from("orders")
      .select("*, order_items (*)")
      .eq("order_number", orderNumber)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !data) return { success: false as const, error: "Order not found." };

    // Live courier tracking from Shiprocket (throttled to once per 30 minutes per order)
    if (data.shiprocket_awb && LIVE_STATES.includes(data.order_status)) {
      const r = await refreshTrackingFromApi(data.id, 30 * 60_000);
      if (r.ok && r.message === "Tracking refreshed") {
        const again = await supabase.from("orders").select("*, order_items (*)").eq("id", data.id).eq("user_id", user.id).maybeSingle();
        if (again.data) data = again.data;
      }
    }

    // Status history: ownership was verified above, so reading it with the service role is safe.
    // Only the status and time are returned (internal notes are never exposed to customers).
    const { data: history } = await createAdminClient()
      .from("order_status_history")
      .select("new_status, created_at")
      .eq("order_id", data.id)
      .order("created_at", { ascending: true });

    // Courier scan history (only what the courier reported; nothing is generated)
    const { data: scans } = await createAdminClient()
      .from("shipment_tracking_events")
      .select("status_label, activity, location, event_time, raw_time")
      .eq("order_id", data.id)
      .order("event_time", { ascending: false, nullsFirst: false })
      .limit(60);

    return {
      success: true as const,
      data: mapOrderRow(data),
      history: (history || []).map((h: { new_status: string; created_at: string }) => ({
        status: h.new_status,
        at: h.created_at,
      })),
      scans: (scans || []).map((s: any) => ({
        label: (s.status_label as string | null) || null,
        activity: (s.activity as string | null) || null,
        location: (s.location as string | null) || null,
        at: (s.event_time as string | null) || null,
      })),
      trackingUrl: (data.tracking_url as string | null) || null,
    };
  } catch {
    return { success: false as const, error: GENERIC_ERROR };
  }
}
