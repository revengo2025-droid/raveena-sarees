// Role helpers shared by middleware, server actions and route handlers.
// The ONLY source of truth for a role is the `profiles.role` column (written by the database,
// protected by RLS and the prevent_role_escalation trigger). User metadata is never trusted.

export type AppRole = "customer" | "admin" | "staff";

export const isStaffRole = (role: unknown): role is "admin" | "staff" => role === "admin" || role === "staff";

export const ADMIN_HOME = "/admin";
export const CUSTOMER_HOME = "/account";

/**
 * Returns a same-origin relative path, or the fallback. Blocks open redirects such as
 * "//evil.com", "/\\evil.com", "https://evil.com" and "javascript:".
 */
export function safeRedirectPath(path: unknown, fallback: string): string {
  if (typeof path !== "string" || path.length === 0 || path.length > 512) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(path)) return fallback;
  return path;
}

/** Where a user should land after signing in. Admin/staff always go to the dashboard; customers never do. */
export function postLoginPath(role: unknown, requested: unknown): string {
  if (isStaffRole(role)) return ADMIN_HOME;
  const target = safeRedirectPath(requested, CUSTOMER_HOME);
  return target.startsWith("/admin") ? CUSTOMER_HOME : target;
}
