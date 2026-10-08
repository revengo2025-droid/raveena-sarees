// Shared (client + server) vocabulary for the contact inbox and customer support tickets.
// No imports: safe to ship in the browser bundle.

export const TICKET_CATEGORIES = [
  { value: "order", label: "Order-related issue" },
  { value: "product", label: "Product-related question" },
  { value: "payment", label: "Payment issue" },
  { value: "delivery", label: "Delivery issue" },
  { value: "return_refund", label: "Return / refund issue" },
  { value: "account", label: "Account issue" },
  { value: "other", label: "Other" },
] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number]["value"];
export const TICKET_CATEGORY_VALUES = TICKET_CATEGORIES.map((c) => c.value) as TicketCategory[];
export const ticketCategoryLabel = (v: string) => TICKET_CATEGORIES.find((c) => c.value === v)?.label ?? v;

export const TICKET_STATUSES = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "waiting_for_customer", label: "Waiting for Customer" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number]["value"];
export const TICKET_STATUS_VALUES = TICKET_STATUSES.map((s) => s.value) as TicketStatus[];
export const ticketStatusLabel = (v: string) => TICKET_STATUSES.find((s) => s.value === v)?.label ?? v;

export const CONTACT_STATUSES = [
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "closed", label: "Closed" },
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number]["value"];
export const CONTACT_STATUS_VALUES = CONTACT_STATUSES.map((s) => s.value) as ContactStatus[];
export const contactStatusLabel = (v: string) => CONTACT_STATUSES.find((s) => s.value === v)?.label ?? v;

/** Shown to customers who are not allowed to reply any more. */
export const TICKET_CLOSED_MESSAGE = "This request is closed. Please raise a new query if you still need help.";

/** Order states in which an order is still being fulfilled or settled (blocks account deletion). */
export const IN_PROGRESS_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "return_requested",
  "refund_processing",
] as const;

/** The word a customer must type to delete their account. */
export const DELETE_CONFIRMATION_WORD = "DELETE";
