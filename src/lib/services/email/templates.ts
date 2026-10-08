// =============================================================================
// Raveena Sarees transactional email templates
// -----------------------------------------------------------------------------
// One registry, pure functions: data in -> { subject, html, text } out. No I/O here, so templates
// can be unit-tested, previewed, or later moved to Resend's hosted templates by mapping the same
// `EmailTemplate` names and data fields. Every dynamic value is HTML-escaped.
// =============================================================================
import { SITE } from "@/lib/site";

export type EmailTemplate =
  | "order_confirmation"
  | "payment_successful"
  | "payment_failed"
  | "order_processing"
  | "shipment_created"
  | "tracking_available"
  | "shipment_shipped"
  | "out_for_delivery"
  | "delivered"
  | "order_cancelled"
  | "return_requested"
  | "return_approved"
  | "return_rejected"
  | "refund_initiated"
  | "refund_completed"
  | "support_ticket_created"
  | "support_ticket_update"
  | "admin_notice";

export interface EmailLineItem {
  name: string;
  sku?: string;
  color?: string;
  quantity: number;
  unitPrice: number;
}

/** Snapshot of an order used by every order email. Built from the real order row (see order-data.ts). */
export interface OrderEmailData {
  customerName: string;
  orderNumber: string;
  orderDate: string; // ISO
  items: EmailLineItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  giftWrapFee: number;
  total: number;
  paymentMethod: string; // always Razorpay for new orders
  paymentStatus: string; // 'paid' | 'pending' | 'failed' | 'refunded'
  addressLines: string[];
  courierName?: string | null;
  awb?: string | null;
  trackingUrl?: string | null;
  estimatedDelivery?: string | null;
  /** Free text supplied by the store for cancellations / returns / refunds. */
  note?: string | null;
  refundAmount?: number | null;
}

export interface SupportEmailData {
  customerName: string;
  ticketRef: string;
  subject: string;
  message: string;
  /** Page the customer can open to see the conversation (https only). */
  url?: string | null;
}

/** Internal alert to the business inbox (new contact message, new ticket, customer reply, subscriber). */
export interface AdminNoticeData {
  title: string;
  /** Short key/value facts shown in a box. */
  facts: { label: string; value: string }[];
  /** Customer-written text, rendered escaped. */
  body?: string;
  /** Admin page to open. */
  url?: string | null;
  /** Replying to the alert goes straight to the customer. */
  replyTo?: string | null;
}

export type EmailData = OrderEmailData | SupportEmailData | AdminNoticeData;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  /** Overrides the default reply-to (used so replying to an alert reaches the customer). */
  replyTo?: string | null;
}

// ─── helpers ────────────────────────────────────────────────────────────────
const COLORS = {
  maroon: "#7A1F2B",
  gold: "#C8A24D",
  goldPale: "#F5EDD6",
  ivory: "#FAF9F6",
  text: "#222222",
  muted: "#6B6B6B",
  border: "#EADFC8",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

/** Only http(s) links are ever rendered (blocks javascript:/data: URLs from upstream data). */
export function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export const inr = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number.isFinite(amount) ? amount : 0
  );

const dateIN = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
};

const paymentLabel = (d: OrderEmailData) => {
  return (
    { paid: "Paid online (Razorpay)", pending: "Awaiting payment", failed: "Payment failed", refunded: "Refunded" }[
      d.paymentStatus
    ] || d.paymentStatus
  );
};

const orderUrl = (orderNumber: string) => `${SITE.url}/account/track/${encodeURIComponent(orderNumber)}`;
const firstName = (name: string) => (name || "").trim().split(/\s+/)[0] || "there";

function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px"><tr><td style="background:${COLORS.maroon};border-radius:999px">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 28px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#ffffff;text-decoration:none">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function para(text: string) {
  return `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${COLORS.text}">${text}</p>`;
}

function infoRow(label: string, value: string) {
  return `<tr><td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.muted};width:42%;vertical-align:top">${escapeHtml(label)}</td>
<td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.text};font-weight:bold;vertical-align:top">${value}</td></tr>`;
}

function infoBox(rows: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.ivory};border:1px solid ${COLORS.border};border-radius:12px;margin:8px 0 20px"><tr><td style="padding:14px 18px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows}</table></td></tr></table>`;
}

function itemsTable(d: OrderEmailData) {
  const rows = d.items
    .map(
      (i) => `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.text}">
<strong>${escapeHtml(i.name)}</strong>${i.color ? `<br><span style="font-size:12px;color:${COLORS.muted}">Colour: ${escapeHtml(i.color)}</span>` : ""}${i.sku ? `<br><span style="font-size:11px;color:${COLORS.muted}">SKU ${escapeHtml(i.sku)}</span>` : ""}
</td>
<td align="center" style="padding:10px 6px;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.text};white-space:nowrap">&times; ${escapeHtml(i.quantity)}</td>
<td align="right" style="padding:10px 0;border-bottom:1px solid ${COLORS.border};font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${COLORS.text};white-space:nowrap">${escapeHtml(inr(i.unitPrice * i.quantity))}</td>
</tr>`
    )
    .join("");

  const totalRow = (label: string, value: string, strong = false) =>
    `<tr><td colspan="2" align="right" style="padding:5px 8px 5px 0;font-family:Arial,Helvetica,sans-serif;font-size:${strong ? 15 : 13}px;color:${strong ? COLORS.text : COLORS.muted};${strong ? "font-weight:bold;" : ""}">${escapeHtml(label)}</td>
<td align="right" style="padding:5px 0;font-family:Arial,Helvetica,sans-serif;font-size:${strong ? 16 : 13}px;color:${strong ? COLORS.maroon : COLORS.text};font-weight:bold;white-space:nowrap">${escapeHtml(value)}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px">
<tr><td style="padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted}">Item</td><td align="center" style="padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted}">Qty</td><td align="right" style="padding:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted}">Price</td></tr>
${rows}
${totalRow("Subtotal", inr(d.subtotal))}
${d.discount > 0 ? totalRow("Discount", `- ${inr(d.discount)}`) : ""}
${totalRow("Shipping", d.shippingFee > 0 ? inr(d.shippingFee) : "Free")}
${d.giftWrapFee > 0 ? totalRow("Gift wrap", inr(d.giftWrapFee)) : ""}
${totalRow("Total", inr(d.total), true)}
</table>`;
}

function addressBlock(d: OrderEmailData) {
  if (!d.addressLines.length) return "";
  return `<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted}">Delivery address</p>
<p style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:${COLORS.text}">${d.addressLines.map(escapeHtml).join("<br>")}</p>`;
}

function trackingBox(d: OrderEmailData) {
  const url = safeUrl(d.trackingUrl);
  const rows =
    (d.courierName ? infoRow("Courier", escapeHtml(d.courierName)) : "") +
    (d.awb ? infoRow("Tracking number (AWB)", `<span style="font-family:Consolas,Menlo,monospace">${escapeHtml(d.awb)}</span>`) : "") +
    (d.estimatedDelivery ? infoRow("Expected delivery", escapeHtml(dateIN(d.estimatedDelivery))) : "") +
    (url ? infoRow("Courier tracking", `<a href="${escapeHtml(url)}" style="color:${COLORS.maroon}">Open tracking page</a>`) : "");
  return rows ? infoBox(rows) : "";
}

/** Shared premium shell: logo header, gold rule, content, support footer. */
export function layout(opts: { preheader: string; heading: string; body: string }) {
  const logo = `${SITE.url}${SITE.logo}`;
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(opts.heading)}</title>
<style>@media (max-width:620px){.container{width:100%!important}.px{padding-left:20px!important;padding-right:20px!important}}</style>
</head>
<body style="margin:0;padding:0;background:#F3EEE6">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3EEE6"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${COLORS.border}">
<tr><td align="center" style="background:${COLORS.ivory};padding:28px 24px 18px;border-bottom:3px solid ${COLORS.gold}">
<a href="${escapeHtml(SITE.url)}" style="text-decoration:none"><img src="${escapeHtml(logo)}" width="84" height="84" alt="${escapeHtml(SITE.name)}" style="display:block;border:0;border-radius:14px;width:84px;height:84px"></a>
<p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:20px;letter-spacing:4px;text-transform:uppercase;color:${COLORS.maroon}">${escapeHtml(SITE.name)}</p>
</td></tr>
<tr><td class="px" style="padding:32px 40px 12px">
<h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:normal;line-height:1.3;color:${COLORS.text}">${escapeHtml(opts.heading)}</h1>
${opts.body}
</td></tr>
<tr><td class="px" style="padding:20px 40px 28px;background:${COLORS.ivory};border-top:1px solid ${COLORS.border}">
<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${COLORS.text}"><strong>Need help?</strong> Reply to this email, write to <a href="mailto:${escapeHtml(SITE.email)}" style="color:${COLORS.maroon}">${escapeHtml(SITE.email)}</a> or WhatsApp <a href="https://wa.me/${escapeHtml(SITE.whatsappNumber)}" style="color:${COLORS.maroon}">${escapeHtml(SITE.phoneDisplay)}</a>.</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${COLORS.muted}"><a href="${escapeHtml(SITE.url)}" style="color:${COLORS.muted}">${escapeHtml(SITE.url.replace(/^https?:\/\//, ""))}</a> &middot; &copy; ${year} ${escapeHtml(SITE.legalName || SITE.name)}</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

/** Plain-text alternative (improves deliverability and accessibility). */
function orderText(d: OrderEmailData, intro: string) {
  const lines = [
    `Hi ${firstName(d.customerName)},`,
    "",
    intro,
    "",
    `Order: ${d.orderNumber}`,
    `Placed: ${dateIN(d.orderDate)}`,
    `Payment: ${paymentLabel(d)}`,
    d.courierName ? `Courier: ${d.courierName}` : "",
    d.awb ? `Tracking number (AWB): ${d.awb}` : "",
    safeUrl(d.trackingUrl) ? `Courier tracking: ${safeUrl(d.trackingUrl)}` : "",
    "",
    ...d.items.map((i) => `- ${i.name} x ${i.quantity}: ${inr(i.unitPrice * i.quantity)}`),
    `Total: ${inr(d.total)}`,
    "",
    `Track your order: ${orderUrl(d.orderNumber)}`,
    "",
    `Questions? Reply to this email or write to ${SITE.email} / WhatsApp ${SITE.phoneDisplay}.`,
    SITE.name,
  ];
  return lines.filter((l, idx, arr) => !(l === "" && arr[idx - 1] === "")).join("\n");
}

// ─── order templates ────────────────────────────────────────────────────────
type OrderTemplateDef = {
  subject: (d: OrderEmailData) => string;
  heading: (d: OrderEmailData) => string;
  intro: (d: OrderEmailData) => string; // plain text, escaped when rendered
  showItems?: boolean;
  showAddress?: boolean;
  showTracking?: boolean;
  cta?: (d: OrderEmailData) => { href: string; label: string } | null;
};

const trackCta = (d: OrderEmailData) => ({ href: orderUrl(d.orderNumber), label: "Track your order" });

const ORDER_TEMPLATES: Record<Exclude<EmailTemplate, "support_ticket_created" | "support_ticket_update" | "admin_notice">, OrderTemplateDef> = {
  order_confirmation: {
    subject: (d) => `Order confirmed: ${d.orderNumber} | ${SITE.name}`,
    heading: () => "Thank you, your order is confirmed",
    intro: (d) => `We have received your payment and confirmed your order ${d.orderNumber}. We will email you as soon as it ships.`,
    showItems: true,
    showAddress: true,
    showTracking: true,
    cta: trackCta,
  },
  payment_successful: {
    subject: (d) => `Payment received for ${d.orderNumber} | ${SITE.name}`,
    heading: () => "Payment received",
    intro: (d) => `We have received your payment of ${inr(d.total)} for order ${d.orderNumber}. Thank you.`,
    showItems: true,
    cta: trackCta,
  },
  payment_failed: {
    subject: (d) => `Payment not completed for ${d.orderNumber} | ${SITE.name}`,
    heading: () => "Your payment did not go through",
    intro: (d) =>
      `The payment for order ${d.orderNumber} was not completed, so the order is not confirmed yet. If money was debited from your account, your bank will reverse it automatically. You can place the order again from your cart, or contact us and we will help.`,
    showItems: true,
    cta: () => ({ href: `${SITE.url}/cart`, label: "Return to your cart" }),
  },
  order_processing: {
    subject: (d) => `We are preparing your order ${d.orderNumber}`,
    heading: () => "Your order is being prepared",
    intro: (d) => `Your order ${d.orderNumber} is being checked and packed with care. We will share the courier details as soon as it is ready.`,
    cta: trackCta,
  },
  shipment_created: {
    subject: (d) => `Shipment created for ${d.orderNumber}`,
    heading: () => "Your shipment has been created",
    intro: (d) =>
      `We have created the shipment for order ${d.orderNumber} with our shipping partner. You will receive the courier and tracking number as soon as a courier is assigned.`,
    showTracking: true,
    cta: trackCta,
  },
  tracking_available: {
    subject: (d) => `Tracking number for ${d.orderNumber}${d.courierName ? ` (${d.courierName})` : ""}`,
    heading: () => "Your tracking details are ready",
    intro: (d) => `A courier has been assigned to order ${d.orderNumber}. You can follow it using the details below.`,
    showTracking: true,
    cta: trackCta,
  },
  shipment_shipped: {
    subject: (d) => `Shipped: your order ${d.orderNumber} is on its way`,
    heading: () => "Your order is on its way",
    intro: (d) => `Good news! Order ${d.orderNumber} has been picked up by the courier and is on its way to you.`,
    showTracking: true,
    showAddress: true,
    cta: trackCta,
  },
  out_for_delivery: {
    subject: (d) => `Out for delivery today: ${d.orderNumber}`,
    heading: () => "Your order is out for delivery",
    intro: (d) => `Order ${d.orderNumber} is out for delivery and should reach you soon.`,
    showTracking: true,
    cta: trackCta,
  },
  delivered: {
    subject: (d) => `Delivered: ${d.orderNumber} | ${SITE.name}`,
    heading: () => "Your order has been delivered",
    intro: (d) =>
      `Order ${d.orderNumber} has been delivered. We hope you love your saree! If anything is not right, you can request a return within ${SITE.returnWindowDays} days of delivery.`,
    showItems: true,
    cta: trackCta,
  },
  order_cancelled: {
    subject: (d) => `Order cancelled: ${d.orderNumber}`,
    heading: () => "Your order has been cancelled",
    intro: (d) =>
      `Order ${d.orderNumber} has been cancelled.${d.paymentStatus === "paid" ? " Any amount you paid will be refunded to your original payment method; we will email you when the refund is initiated." : ""}`,
    showItems: true,
    cta: trackCta,
  },
  return_requested: {
    subject: (d) => `Return request received for ${d.orderNumber}`,
    heading: () => "We have received your return request",
    intro: (d) => `We have received your return request for order ${d.orderNumber}. Our team will review it and update you by email.`,
    cta: trackCta,
  },
  return_approved: {
    subject: (d) => `Return approved for ${d.orderNumber}`,
    heading: () => "Your return has been approved",
    intro: (d) => `Your return for order ${d.orderNumber} has been approved. We will share the pickup details shortly.`,
    cta: trackCta,
  },
  return_rejected: {
    subject: (d) => `Update on your return for ${d.orderNumber}`,
    heading: () => "Update on your return request",
    intro: (d) => `We were unable to approve the return for order ${d.orderNumber}. Please reply to this email if you have any questions.`,
    cta: trackCta,
  },
  refund_initiated: {
    subject: (d) => `Refund initiated for ${d.orderNumber}`,
    heading: () => "Your refund has been initiated",
    intro: (d) =>
      `We have initiated a refund${d.refundAmount ? ` of ${inr(d.refundAmount)}` : ""} for order ${d.orderNumber} to your original payment method. Banks usually take 5-7 working days to credit it.`,
    cta: trackCta,
  },
  refund_completed: {
    subject: (d) => `Refund completed for ${d.orderNumber}`,
    heading: () => "Your refund is complete",
    intro: (d) =>
      `The refund${d.refundAmount ? ` of ${inr(d.refundAmount)}` : ""} for order ${d.orderNumber} has been processed. It should now be visible in your account.`,
    cta: trackCta,
  },
};

function renderOrderEmail(name: keyof typeof ORDER_TEMPLATES, d: OrderEmailData): RenderedEmail {
  const t = ORDER_TEMPLATES[name];
  const intro = t.intro(d);
  const summary = infoBox(
    infoRow("Order ID", `<span style="font-family:Consolas,Menlo,monospace">${escapeHtml(d.orderNumber)}</span>`) +
      infoRow("Order date", escapeHtml(dateIN(d.orderDate))) +
      infoRow("Payment", escapeHtml(paymentLabel(d))) +
      infoRow("Order total", escapeHtml(inr(d.total)))
  );
  const cta = t.cta?.(d);
  const body = [
    para(`Hi ${escapeHtml(firstName(d.customerName))},`),
    para(escapeHtml(intro)),
    d.note ? para(`<em>${escapeHtml(d.note)}</em>`) : "",
    t.showTracking ? trackingBox(d) : "",
    summary,
    t.showItems ? itemsTable(d) : "",
    t.showAddress ? addressBlock(d) : "",
    cta ? button(cta.href, cta.label) : "",
  ].join("\n");

  return {
    subject: t.subject(d),
    html: layout({ preheader: intro, heading: t.heading(d), body }),
    text: orderText(d, d.note ? `${intro}\n\n${d.note}` : intro),
  };
}

function renderAdminNotice(d: AdminNoticeData): RenderedEmail {
  const url = safeUrl(d.url);
  const body = [
    infoBox(d.facts.map((f) => infoRow(f.label, escapeHtml(f.value))).join("")),
    d.body
      ? `<div style="margin:0 0 20px;padding:14px 18px;border-left:3px solid ${COLORS.gold};background:${COLORS.ivory};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.text}">${escapeHtml(d.body).replace(/\n/g, "<br>")}</div>`
      : "",
    url ? button(url, "Open in admin") : "",
  ].join("\n");
  return {
    subject: d.title.slice(0, 200),
    html: layout({ preheader: d.title, heading: d.title, body }),
    text: [d.title, "", ...d.facts.map((f) => `${f.label}: ${f.value}`), ...(d.body ? ["", d.body] : []), ...(url ? ["", url] : [])].join("\n"),
    replyTo: d.replyTo || null,
  };
}

function renderSupportEmail(name: "support_ticket_created" | "support_ticket_update", d: SupportEmailData): RenderedEmail {
  const created = name === "support_ticket_created";
  const heading = created ? "We have received your message" : "There is an update on your request";
  const intro = created
    ? `Thank you for contacting ${SITE.name}. Your reference is ${d.ticketRef}. We usually reply within one working day.`
    : `We have replied to your request ${d.ticketRef}.`;
  const body = [
    para(`Hi ${escapeHtml(firstName(d.customerName))},`),
    para(escapeHtml(intro)),
    infoBox(infoRow("Reference", escapeHtml(d.ticketRef)) + infoRow("Subject", escapeHtml(d.subject))),
    `<div style="margin:0 0 20px;padding:14px 18px;border-left:3px solid ${COLORS.gold};background:${COLORS.ivory};font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:${COLORS.text}">${escapeHtml(d.message).replace(/\n/g, "<br>")}</div>`,
    safeUrl(d.url) ? button(safeUrl(d.url) as string, "View conversation") : "",
  ].join("\n");
  return {
    subject: created ? `We received your message [${d.ticketRef}] | ${SITE.name}` : `Re: ${d.subject} [${d.ticketRef}]`,
    html: layout({ preheader: intro, heading, body }),
    text: `Hi ${firstName(d.customerName)},\n\n${intro}\n\nSubject: ${d.subject}\n\n${d.message}\n\n${SITE.name} - ${SITE.email}`,
  };
}

export function renderEmail(template: EmailTemplate, data: EmailData): RenderedEmail {
  if (template === "admin_notice") return renderAdminNotice(data as AdminNoticeData);
  if (template === "support_ticket_created" || template === "support_ticket_update") {
    return renderSupportEmail(template, data as SupportEmailData);
  }
  return renderOrderEmail(template, data as OrderEmailData);
}

export const EMAIL_TEMPLATES = [...Object.keys(ORDER_TEMPLATES), "support_ticket_created", "support_ticket_update"] as EmailTemplate[];
