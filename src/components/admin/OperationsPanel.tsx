"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  PackageCheck,
  PackageX,
  RefreshCw,
  RotateCcw,
  Truck,
  Undo2,
  Wallet,
  XCircle,
  Loader2,
  Plug,
} from "lucide-react";
import type { Order } from "@/lib/types";
import { formatINR, formatDate } from "@/lib/utils";
import { useApp } from "@/lib/store";
import {
  getOperationsOverviewAction,
  retryEmailAction,
  retryFulfillmentAction,
  type OperationsOverview,
} from "@/app/actions/fulfillment";
import { SHIPMENT_STATUS_LABELS, type ShipmentStatus } from "@/lib/services/shipping/status";

const EMAIL_LABELS: Record<string, string> = {
  order_confirmation: "Order confirmation",
  payment_successful: "Payment received",
  payment_failed: "Payment failed",
  order_processing: "Order processing",
  shipment_created: "Shipment created",
  tracking_available: "Tracking available",
  shipment_shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  order_cancelled: "Order cancelled",
  return_requested: "Return requested",
  return_approved: "Return approved",
  return_rejected: "Return rejected",
  refund_initiated: "Refund initiated",
  refund_completed: "Refund completed",
  support_ticket_created: "Support ticket created",
  support_ticket_update: "Support ticket update",
};

function Tile({ label, value, icon: Icon, tone = "default", sub }: { label: string; value: React.ReactNode; icon: React.ElementType; tone?: "default" | "gold" | "good" | "warn" | "bad"; sub?: string }) {
  const tones = {
    default: "text-adm-strong",
    gold: "text-adm-goldsoft",
    good: "text-adm-ok",
    warn: "text-adm-warn",
    bad: "text-adm-danger",
  } as const;
  return (
    <div className="bg-adm-surface border border-adm-line rounded-2xl p-4 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-adm-muted">
        <span className="truncate">{label}</span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${tones[tone]}`} aria-hidden="true" />
      </div>
      <span className={`text-xl font-bold ${tones[tone]}`}>{value}</span>
      {sub && <span className="text-[10px] text-adm-faint truncate">{sub}</span>}
    </div>
  );
}

function HealthPill({ ok, label, hint }: { ok: boolean; label: string; hint?: string }) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
        ok ? "bg-adm-ok/15 text-adm-ok border-adm-ok/40" : "bg-adm-danger/15 text-adm-danger border-adm-danger/40"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />} {label}
    </span>
  );
}

/** Live operations summary: order pipeline, money, Shiprocket sync health and failed emails, with safe retries. */
export function OperationsPanel({ orders }: { orders: Order[] }) {
  const { showToast, refreshOrders } = useApp();
  const [ops, setOps] = useState<OperationsOverview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await getOperationsOverviewAction();
    if (res.success) {
      setOps(res.data);
      setLoadError(null);
    } else setLoadError(res.error);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const count = (...statuses: string[]) => orders.filter((o) => statuses.includes(o.orderStatus)).length;
  const paid = orders.filter((o) => o.paymentStatus === "paid");
  const revenue = paid.reduce((s, o) => s + o.totalAmount, 0);
  const paymentPending = orders.filter((o) => o.paymentStatus === "pending").length;
  const paymentFailed = orders.filter((o) => o.paymentStatus === "failed").length;

  const retryFulfillment = async (orderId: string, orderNumber: string) => {
    setBusy(`f:${orderId}`);
    const r = await retryFulfillmentAction(orderId);
    setBusy(null);
    showToast(r.success ? `${orderNumber}: ${r.message}` : `${orderNumber}: ${r.error}`, r.success ? "success" : "error");
    await Promise.all([load(), refreshOrders()]);
  };

  const retryEmail = async (id: string) => {
    setBusy(`e:${id}`);
    const r = await retryEmailAction(id);
    setBusy(null);
    showToast(r.success ? "Email sent" : r.error || "Email failed again", r.success ? "success" : "error");
    await load();
  };

  return (
    <section aria-label="Operations overview" className="space-y-4">
      {/* Order pipeline + money */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
        <Tile label="Total orders" value={orders.length} icon={PackageCheck} />
        <Tile label="Awaiting payment" value={count("pending")} icon={Clock} tone={count("pending") ? "warn" : "default"} />
        <Tile label="Confirmed" value={count("confirmed")} icon={CheckCircle2} />
        <Tile label="Processing" value={count("processing", "packed")} icon={RefreshCw} />
        <Tile label="Shipped" value={count("shipped")} icon={Truck} />
        <Tile label="Out for delivery" value={count("out_for_delivery")} icon={Truck} tone="gold" />
        <Tile label="Delivered" value={count("delivered")} icon={PackageCheck} tone="good" />
        <Tile label="Cancelled" value={count("cancelled")} icon={PackageX} tone={count("cancelled") ? "bad" : "default"} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <Tile label="Revenue (paid)" value={formatINR(revenue)} icon={Wallet} tone="gold" sub={`${paid.length} paid order${paid.length === 1 ? "" : "s"}`} />
        <Tile label="Payment pending" value={paymentPending} icon={CreditCard} tone={paymentPending ? "warn" : "default"} sub="Online, not yet paid" />
        <Tile label="Payment failed" value={paymentFailed} icon={CreditCard} tone={paymentFailed ? "bad" : "default"} />
        <Tile label="Returns" value={count("return_requested", "returned")} icon={Undo2} tone={count("return_requested") ? "warn" : "default"} />
        <Tile label="Refunds" value={count("refund_processing", "refunded")} icon={RotateCcw} tone={count("refund_processing") ? "warn" : "default"} />
      </div>

      {/* Integrations + sync health */}
      <div className="bg-adm-surface border border-adm-line rounded-2xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-adm-strong flex items-center gap-2">
            <Plug className="w-4 h-4 text-adm-gold" /> Fulfillment & notifications
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {ops ? (
              <>
                <HealthPill ok={ops.integrations.shiprocket.configured} label="Shiprocket" hint={ops.integrations.shiprocket.reason} />
                <HealthPill ok={ops.integrations.webhookToken} label="Tracking webhook" hint="SHIPROCKET_WEBHOOK_TOKEN" />
                <HealthPill ok={ops.integrations.email.configured} label="Resend email" hint={ops.integrations.email.reason} />
                <HealthPill ok={ops.integrations.cronSecret} label="Retry scheduler" hint="CRON_SECRET" />
              </>
            ) : (
              <span className="text-[11px] text-adm-faint">{loadError || "Checking integrations…"}</span>
            )}
            <button type="button" onClick={load} className="p-1.5 text-adm-muted hover:text-adm-strong rounded-lg hover:bg-adm-raised" title="Refresh" aria-label="Refresh operations data">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {ops && !ops.integrations.shiprocket.configured && (
          <p className="text-[11px] text-adm-danger bg-adm-danger/15 border border-adm-danger/40 rounded-xl px-3 py-2">Shiprocket: {ops.integrations.shiprocket.reason}</p>
        )}
        {ops && !ops.integrations.email.configured && (
          <p className="text-[11px] text-adm-danger bg-adm-danger/15 border border-adm-danger/40 rounded-xl px-3 py-2">Email: {ops.integrations.email.reason}</p>
        )}

        {ops && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tile label="Failed Shiprocket syncs" value={ops.failedFulfillments.length} icon={AlertTriangle} tone={ops.failedFulfillments.length ? "bad" : "good"} />
            <Tile label="Shipments in progress" value={ops.pendingShipments} icon={Truck} sub="Created, awaiting courier/pickup" />
            <Tile label="Failed emails" value={ops.failedEmails.length} icon={Mail} tone={ops.failedEmails.length ? "bad" : "good"} />
            <Tile label="Delivery alerts" value={ops.shipmentAlerts.length} icon={AlertTriangle} tone={ops.shipmentAlerts.length ? "warn" : "good"} sub={ops.failedWebhooks ? `${ops.failedWebhooks} webhook event(s) failed` : "RTO / undelivered / lost"} />
          </div>
        )}

        {ops && ops.failedFulfillments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-adm-danger">Shiprocket sync failures</h3>
            <ul className="divide-y divide-adm-line border border-adm-danger/40 rounded-xl overflow-hidden">
              {ops.failedFulfillments.map((f) => (
                <li key={f.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-adm-danger/15">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-adm-strong font-mono font-bold">
                      {f.orderNumber} <span className="font-sans font-normal text-adm-muted">· {f.customerName}</span>
                    </p>
                    <p className="text-[11px] text-adm-danger break-words">
                      {f.operation ? `${f.operation.replace(/_/g, " ")}: ` : ""}
                      {f.error}
                    </p>
                    <p className="text-[10px] text-adm-faint">
                      {f.attempts} attempt{f.attempts === 1 ? "" : "s"}
                      {f.errorAt ? ` · last ${formatDate(f.errorAt)}` : ""}
                      {f.nextRetryAt ? ` · auto-retry ${new Date(f.nextRetryAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : " · needs manual retry"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === `f:${f.id}`}
                    onClick={() => retryFulfillment(f.id, f.orderNumber)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] text-black text-[11px] font-bold disabled:opacity-60"
                  >
                    {busy === `f:${f.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />} Retry sync
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-adm-faint">Retry resumes from the failed step and checks Shiprocket first, so it never creates a duplicate shipment.</p>
          </div>
        )}

        {ops && ops.failedEmails.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-adm-danger">Email delivery failures</h3>
            <ul className="divide-y divide-adm-line border border-adm-danger/40 rounded-xl overflow-hidden">
              {ops.failedEmails.map((e) => (
                <li key={e.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-adm-strong">
                      {EMAIL_LABELS[e.template] || e.template}
                      {e.orderNumber && <span className="font-mono text-adm-muted"> · {e.orderNumber}</span>}
                      <span className="text-adm-faint"> · {e.recipient}</span>
                    </p>
                    <p className="text-[11px] text-adm-danger break-words">{e.error}</p>
                    <p className="text-[10px] text-adm-faint">{e.attempts} attempt{e.attempts === 1 ? "" : "s"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={busy === `e:${e.id}`}
                    onClick={() => retryEmail(e.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-adm-raised border border-adm-line2 text-adm-strong text-[11px] font-bold disabled:opacity-60"
                  >
                    {busy === `e:${e.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />} Resend
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ops && ops.shipmentAlerts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider font-bold text-adm-warn">Delivery alerts</h3>
            <ul className="flex flex-wrap gap-2">
              {ops.shipmentAlerts.map((a) => (
                <li key={a.id}>
                  <Link href={`/admin/orders?q=${encodeURIComponent(a.orderNumber)}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-adm-warn/40 bg-adm-warn/15 text-[11px] text-adm-warn hover:bg-adm-warn/15">
                    <span className="font-mono font-bold">{a.orderNumber}</span>
                    {SHIPMENT_STATUS_LABELS[a.shipmentStatus as ShipmentStatus] || a.shiprocketStatus}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {ops && !ops.failedFulfillments.length && !ops.failedEmails.length && !ops.shipmentAlerts.length && (
          <p className="text-[11px] text-adm-ok flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> No failed syncs, emails or delivery alerts.
          </p>
        )}
      </div>
    </section>
  );
}
