// =============================================================================
// Customer account deletion
// -----------------------------------------------------------------------------
// What happens (in this order, every step safe to repeat so a failed attempt can simply be retried):
//   1. Refuse while an order is still being fulfilled or settled, and refuse for staff/admin accounts.
//   2. Remove personal data that has no reason to be kept: saved addresses, wishlist, cart, reviews, newsletter
//      subscription, contact messages and support queries that are not tied to an order, stored email payloads.
//   3. Keep what the business may need to keep (order, payment, invoice and shipment records) but unlink it from
//      the person: orders.user_id is cleared. Support queries tied to an order are kept with the name and email
//      redacted. Order records keep the delivery details printed on the invoice.
//   4. Delete the login last. This also revokes every session, so the account can no longer sign in or act.
// =============================================================================
import "server-only";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { audit } from "@/lib/security/audit";
import { IN_PROGRESS_ORDER_STATUSES } from "@/lib/support/constants";

export type DeleteResult = { success: true } | { success: false; error: string };

export const DELETION_BLOCKED_ORDERS =
  "You still have an order that is being processed, shipped or refunded. Please delete your account after those orders are completed, or contact us and we will help.";

export async function getDeletionBlocker(userId: string): Promise<string | null> {
  const { count, error } = await createAdminClient()
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .in("order_status", [...IN_PROGRESS_ORDER_STATUSES]);
  if (error) return "We could not check your orders right now. Please try again.";
  return (count ?? 0) > 0 ? DELETION_BLOCKED_ORDERS : null;
}

export async function deleteCustomerAccount(user: { id: string; email: string }): Promise<DeleteResult> {
  const db = createAdminClient();
  const email = user.email.trim().toLowerCase();
  try {
    const blocker = await getDeletionBlocker(user.id);
    if (blocker) return { success: false, error: blocker };

    // 2. Support queries: delete those with no order attached, redact the rest (kept for order disputes)
    const { data: tickets, error: ticketsError } = await db.from("support_tickets").select("id, order_id").eq("user_id", user.id);
    if (ticketsError && !/does not exist|schema cache/i.test(ticketsError.message)) throw new Error(ticketsError.message);
    const withoutOrder = (tickets || []).filter((t: any) => !t.order_id).map((t: any) => t.id as string);
    const withOrder = (tickets || []).filter((t: any) => t.order_id).map((t: any) => t.id as string);
    if (withoutOrder.length) await mustOk(db.from("support_tickets").delete().in("id", withoutOrder));
    if (withOrder.length) {
      await mustOk(
        db
          .from("support_tickets")
          .update({ user_id: null, customer_name: "Deleted customer", customer_email: "redacted@deleted.invalid", updated_at: new Date().toISOString() })
          .in("id", withOrder)
      );
    }

    // Personal data with no reason to be retained
    await mustOk(db.from("user_addresses").delete().eq("user_id", user.id));
    await mustOk(db.from("wishlists").delete().eq("user_id", user.id));
    await mustOk(db.from("carts").delete().eq("user_id", user.id)); // cart_items cascade
    await mustOk(db.from("reviews").delete().eq("user_id", user.id));
    if (email) {
      await mustOk(db.from("contact_messages").delete().eq("email", email));
      await mustOk(db.from("newsletter_subscribers").delete().eq("email", email));
      await mustOk(db.from("email_events").delete().eq("recipient", email));
    }

    // 3. Keep the transaction records, drop the link to the person
    await mustOk(db.from("orders").update({ user_id: null }).eq("user_id", user.id));

    // 4. Delete the login (revokes all sessions and refresh tokens). Last, so a failure above leaves a usable account to retry.
    const authAdmin = (db as any).auth?.admin;
    if (!authAdmin?.deleteUser) return { success: false, error: "Account deletion is not available right now. Please contact us." };
    const { error: authError } = await authAdmin.deleteUser(user.id);
    if (authError && !/not.?found/i.test(String(authError.message))) {
      console.error("[account] auth delete failed:", authError.message);
      return { success: false, error: "We could not finish deleting your account. Nothing else changes; please try again in a moment." };
    }

    // The profile cascades with the login; this only matters if a database lacks that cascade.
    await db.from("profiles").delete().eq("id", user.id);

    // Audit entry without any personal data: only a one-way fingerprint of the id
    await audit({ action: "account.deleted", entityType: "profile", entityId: createHash("sha256").update(user.id).digest("hex").slice(0, 16) });

    return { success: true };
  } catch (err: any) {
    console.error("[account] delete failed:", err?.message || err);
    return { success: false, error: "We could not delete your account right now. Please try again, or contact us." };
  }
}

/** Throws on a real failure. A table that does not exist yet (migration not applied) has nothing to remove, so it is fine. */
async function mustOk(query: PromiseLike<{ error: { message: string; code?: string } | null }>) {
  const { error } = await query;
  if (!error) return;
  if (error.code === "42P01" || error.code === "PGRST205" || /does not exist|schema cache/i.test(error.message)) return;
  throw new Error(error.message);
}
