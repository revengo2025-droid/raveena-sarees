"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search,
  ExternalLink,
  Edit3,
  X,
  Printer,
  RotateCcw,
  Eye,
  Loader2,
  RefreshCw,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";
import { Order, OrderStatus } from "@/lib/types";
import { updateOrderStatusAction } from "@/app/actions/orders";
import {
  getShipmentDetailsAction,
  refreshTrackingAction,
  retryEmailAction,
  retryFulfillmentAction,
  type ShipmentDetails,
} from "@/app/actions/fulfillment";
import { orderStatusLabel, ORDER_STATUS_LABELS } from "@/lib/orders/mapper";
import { SHIPMENT_ALERT_STATUSES, SHIPMENT_STATUS_LABELS, type ShipmentStatus } from "@/lib/services/shipping/status";

const ORDER_TONE: Record<string, string> = {
  pending: "bg-gray-800 text-gray-300 border-gray-700",
  confirmed: "bg-blue-950/60 text-blue-300 border-blue-800",
  processing: "bg-indigo-950/60 text-indigo-300 border-indigo-800",
  packed: "bg-indigo-950/60 text-indigo-300 border-indigo-800",
  shipped: "bg-amber-950/60 text-amber-300 border-amber-800",
  out_for_delivery: "bg-orange-950/60 text-orange-300 border-orange-800",
  delivered: "bg-emerald-950/60 text-emerald-300 border-emerald-800",
  cancelled: "bg-red-950/60 text-red-300 border-red-800",
  return_requested: "bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800",
  returned: "bg-fuchsia-950/60 text-fuchsia-300 border-fuchsia-800",
  refund_processing: "bg-purple-950/60 text-purple-300 border-purple-800",
  refunded: "bg-purple-950/60 text-purple-300 border-purple-800",
};

const SYNC_LABEL: Record<string, { text: string; tone: string }> = {
  pending: { text: "Queued", tone: "bg-gray-800 text-gray-300 border-gray-700" },
  processing: { text: "Syncing", tone: "bg-blue-950/60 text-blue-300 border-blue-800" },
  order_created: { text: "Order created", tone: "bg-blue-950/60 text-blue-300 border-blue-800" },
  awb_assigned: { text: "AWB assigned", tone: "bg-indigo-950/60 text-indigo-300 border-indigo-800" },
  pickup_scheduled: { text: "Pickup scheduled", tone: "bg-emerald-950/60 text-emerald-300 border-emerald-800" },
  failed: { text: "Sync failed", tone: "bg-red-950/60 text-red-300 border-red-800" },
  cancelled: { text: "Cancelled", tone: "bg-gray-800 text-gray-400 border-gray-700" },
};

const PAYMENT_TONE: Record<string, string> = {
  paid: "text-emerald-300",
  pending: "text-amber-300",
  failed: "text-red-300",
  refunded: "text-purple-300",
};

const Badge = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] uppercase font-bold border whitespace-nowrap ${className}`}>{children}</span>
);

function AdminOrdersContent() {
  const { orders, refreshOrders, showToast } = useApp();
  const searchParams = useSearchParams();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [details, setDetails] = useState<{ order: Order; data: ShipmentDetails | null; error?: string } | null>(null);

  const [newStatus, setNewStatus] = useState<OrderStatus>("shipped");
  const [newTracking, setNewTracking] = useState("");
  const [newCourier, setNewCourier] = useState("");

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setNewStatus(order.orderStatus);
    setNewTracking(order.trackingNumber);
    setNewCourier(order.courierPartner || "");
  };

  const handleSaveOrderUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder || saving) return;
    setSaving(true);
    const managed = Boolean(editingOrder.ops?.shiprocketOrderId);
    const res = await updateOrderStatusAction(
      editingOrder.id,
      newStatus,
      managed ? undefined : newTracking || undefined,
      undefined,
      managed ? undefined : newCourier || undefined
    );
    setSaving(false);
    if (!res.success) {
      showToast(res.error || "Could not update the order.", "error");
      return;
    }
    await refreshOrders();
    showToast(`Order #${editingOrder.orderNumber} updated to ${orderStatusLabel(newStatus)}`, "success");
    setEditingOrder(null);
  };

  const loadDetails = async (order: Order) => {
    setDetails({ order, data: null });
    const res = await getShipmentDetailsAction(order.id);
    setDetails({ order, data: res.success ? res.data : null, error: res.success ? undefined : res.error });
  };

  const retrySync = async (order: Order) => {
    setBusy(`sync:${order.id}`);
    const r = await retryFulfillmentAction(order.id);
    setBusy(null);
    showToast(r.success ? `${order.orderNumber}: ${r.message}` : `${order.orderNumber}: ${r.error}`, r.success ? "success" : "error");
    await refreshOrders();
    if (details?.order.id === order.id) loadDetails(order);
  };

  const refreshTracking = async (order: Order) => {
    setBusy(`track:${order.id}`);
    const r = await refreshTrackingAction(order.id);
    setBusy(null);
    showToast(r.success ? r.message || "Tracking refreshed" : r.error || "Could not refresh", r.success ? "success" : "error");
    await refreshOrders();
    loadDetails(order);
  };

  const resendEmail = async (id: string, order: Order) => {
    setBusy(`mail:${id}`);
    const r = await retryEmailAction(id);
    setBusy(null);
    showToast(r.success ? "Email sent" : r.error || "Email failed", r.success ? "success" : "error");
    loadDetails(order);
  };

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const term = search.trim().toLowerCase();
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !term ||
      o.orderNumber.toLowerCase().includes(term) ||
      o.customerName.toLowerCase().includes(term) ||
      o.customerPhone.includes(term) ||
      o.customerEmail.toLowerCase().includes(term) ||
      (o.trackingNumber || "").toLowerCase().includes(term);
    const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
    const sync = o.ops?.fulfillmentStatus || "none";
    const matchesSync = syncFilter === "all" || sync === syncFilter;
    return matchesSearch && matchesStatus && matchesSync;
  });
  const failedCount = orders.filter((o) => o.ops?.fulfillmentStatus === "failed").length;

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-[#222] pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">Orders & Shipping</h1>
          <p className="text-xs text-gray-400 mt-1">Every order, its payment, and its Shiprocket shipment. Retries never create duplicate shipments.</p>
        </div>
        {failedCount > 0 && (
          <button type="button" onClick={() => setSyncFilter("failed")} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-red-800 bg-red-950/40 text-red-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" /> {failedCount} Shiprocket sync{failedCount === 1 ? "" : "s"} failed
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-[#121212] p-4 rounded-2xl border border-[#222]">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="search"
            aria-label="Search orders"
            placeholder="Order #, customer, phone, email or AWB…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <select aria-label="Order status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]">
          <option value="all">All order statuses ({orders.length})</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </select>
        <select aria-label="Shiprocket sync" value={syncFilter} onChange={(e) => setSyncFilter(e.target.value)} className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]">
          <option value="all">All sync states</option>
          {Object.entries(SYNC_LABEL).map(([value, v]) => (
            <option key={value} value={value}>{v.text}</option>
          ))}
          <option value="none">Not sent (unpaid)</option>
        </select>
      </div>

      {/* Orders table */}
      <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 bg-[#161616] border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Order status</th>
                <th className="py-3 px-4">Shiprocket</th>
                <th className="py-3 px-4">Courier & AWB</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-gray-500">No orders match these filters.</td>
                </tr>
              )}
              {filteredOrders.map((ord) => {
                const sync = ord.ops?.fulfillmentStatus ? SYNC_LABEL[ord.ops.fulfillmentStatus] : null;
                const ship = (ord.shipmentStatus || null) as ShipmentStatus | null;
                const shipAlert = ship ? SHIPMENT_ALERT_STATUSES.includes(ship) : false;
                return (
                  <tr key={ord.id} className="hover:bg-[#151515] transition-colors align-top">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-white text-sm whitespace-nowrap">{ord.orderNumber}</p>
                      <p className="text-[10px] text-gray-500">{formatDate(ord.createdAt)}</p>
                      <p className="text-[10px] uppercase">
                        <span className="text-gray-400">{ord.paymentMethod === "cod" ? "COD" : "Online"}</span>{" "}
                        <span className={`font-bold ${PAYMENT_TONE[ord.paymentStatus] || "text-gray-300"}`}>{ord.paymentStatus}</span>
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-white font-medium">{ord.customerName}</p>
                      <p className="text-[10px] text-gray-400">{ord.customerPhone}</p>
                      <p className="text-[10px] text-gray-500 break-all">{ord.customerEmail}</p>
                      <p className="text-[10px] text-gray-500">{ord.shippingAddress.city} {ord.shippingAddress.pincode}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                            <span className="font-bold text-[#F5DE88]">{it.quantity}×</span>
                            <span className="text-gray-300 truncate max-w-[150px]" title={it.productName}>{it.productName}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-[#F5DE88] text-sm whitespace-nowrap">{formatINR(ord.totalAmount)}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge className={ORDER_TONE[ord.orderStatus] || ORDER_TONE.pending}>{orderStatusLabel(ord.orderStatus)}</Badge>
                    </td>
                    <td className="py-3.5 px-4 space-y-1">
                      {sync ? <Badge className={sync.tone}>{sync.text}</Badge> : <span className="text-[10px] text-gray-500">Not sent</span>}
                      {ship && ship !== "unknown" && (
                        <p className={`text-[10px] ${shipAlert ? "text-amber-300 font-bold" : "text-gray-300"}`}>{SHIPMENT_STATUS_LABELS[ship]}</p>
                      )}
                      {ord.ops?.shiprocketOrderId && (
                        <p className="text-[10px] text-gray-500 font-mono">
                          SR #{ord.ops.shiprocketOrderId}
                          {ord.ops.shipmentId ? ` · Ship ${ord.ops.shipmentId}` : ""}
                        </p>
                      )}
                      {ord.ops?.fulfillmentStatus === "failed" && ord.ops.fulfillmentError && (
                        <p className="text-[10px] text-red-300 max-w-[220px] break-words" title={ord.ops.fulfillmentError}>
                          {ord.ops.fulfillmentError.length > 90 ? `${ord.ops.fulfillmentError.slice(0, 90)}…` : ord.ops.fulfillmentError}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.trackingNumber ? (
                        <>
                          <p className="text-white font-medium">{ord.courierPartner || "Courier"}</p>
                          <p className="text-[10px] font-mono text-[#D4AF37] break-all">{ord.trackingNumber}</p>
                          {ord.trackingUrl && (
                            <a href={ord.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-gray-400 hover:text-white">
                              Track <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] text-gray-500">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(ord.ops?.fulfillmentStatus === "failed" ||
                          (ord.ops?.fulfillmentStatus && !["pickup_scheduled", "cancelled"].includes(ord.ops.fulfillmentStatus))) && (
                          <button
                            onClick={() => retrySync(ord)}
                            disabled={busy === `sync:${ord.id}`}
                            className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors disabled:opacity-50"
                            title="Retry Shiprocket sync (safe, no duplicates)"
                            aria-label={`Retry Shiprocket sync for ${ord.orderNumber}`}
                          >
                            {busy === `sync:${ord.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => loadDetails(ord)} className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors" title="Shipment details" aria-label={`Shipment details for ${ord.orderNumber}`}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenEdit(ord)} className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors" title="Update status" aria-label={`Update status for ${ord.orderNumber}`}>
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <Link href={`/checkout/success?orderNumber=${ord.orderNumber}`} target="_blank" className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors" title="Order summary">
                          <Printer className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shipment details drawer */}
      {details && (
        <div className="fixed inset-0 z-50 flex justify-end font-sans" role="dialog" aria-modal="true" aria-label={`Shipment details for ${details.order.orderNumber}`}>
          <div className="fixed inset-0 bg-black/80" onClick={() => setDetails(null)} />
          <div className="relative w-full max-w-lg h-full overflow-y-auto bg-[#0F0F0F] border-l border-[#262626] p-6 space-y-5 text-white">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-serif">Shipment · <span className="font-mono">{details.order.orderNumber}</span></h2>
              <button onClick={() => setDetails(null)} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!details.data && !details.error && (
              <p className="text-xs text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>
            )}
            {details.error && <p className="text-xs text-red-300">{details.error}</p>}

            {details.data && (
              <>
                <dl className="grid grid-cols-2 gap-3 text-xs bg-[#151515] border border-[#262626] rounded-xl p-4">
                  {[
                    ["Shiprocket order", details.data.order.shiprocketOrderId ?? "—"],
                    ["Shipment ID", details.data.order.shipmentId ?? "—"],
                    ["AWB", details.data.order.awb ?? "—"],
                    ["Courier", details.data.order.courier ?? "—"],
                    ["Shiprocket status", details.data.order.shiprocketStatus ?? "—"],
                    ["Pickup", details.data.order.pickupStatus ?? "—"],
                    ["Sync state", details.data.order.fulfillmentStatus ?? "—"],
                    ["Sync attempts", details.data.order.attempts],
                    ["Last synced", details.data.order.syncedAt ? new Date(details.data.order.syncedAt).toLocaleString("en-IN") : "—"],
                    ["Last tracking", details.data.order.lastTrackingUpdate ? new Date(details.data.order.lastTrackingUpdate).toLocaleString("en-IN") : "—"],
                  ].map(([k, v]) => (
                    <div key={String(k)}>
                      <dt className="text-[10px] uppercase text-gray-500">{k}</dt>
                      <dd className="font-mono break-all">{String(v)}</dd>
                    </div>
                  ))}
                </dl>

                {details.data.order.fulfillmentError && (
                  <p className="text-xs text-red-300 bg-red-950/30 border border-red-900 rounded-xl p-3 break-words">
                    <strong>{details.data.order.fulfillmentOperation?.replace(/_/g, " ") || "error"}:</strong> {details.data.order.fulfillmentError}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {details.data.order.fulfillmentStatus !== "pickup_scheduled" && details.data.order.fulfillmentStatus !== "cancelled" && (
                    <button onClick={() => retrySync(details.order)} disabled={busy === `sync:${details.order.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#D4AF37] text-black text-xs font-bold disabled:opacity-60">
                      <RotateCcw className="w-3.5 h-3.5" /> Retry Shiprocket sync
                    </button>
                  )}
                  {details.data.order.awb && (
                    <button onClick={() => refreshTracking(details.order)} disabled={busy === `track:${details.order.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1C1C] border border-[#333] text-xs font-bold disabled:opacity-60">
                      {busy === `track:${details.order.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh tracking
                    </button>
                  )}
                  {details.data.order.trackingUrl && (
                    <a href={details.data.order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1C1C1C] border border-[#333] text-xs font-bold">
                      Courier tracking <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <section className="space-y-2">
                  <h3 className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Courier scans</h3>
                  {details.data.scans.length === 0 ? (
                    <p className="text-xs text-gray-500">No scans yet.</p>
                  ) : (
                    <ol className="space-y-2">
                      {details.data.scans.map((s, i) => (
                        <li key={i} className="text-xs border-l-2 border-[#D4AF37]/40 pl-3">
                          <p className="text-white">{s.activity || s.label}</p>
                          <p className="text-[10px] text-gray-500">
                            {s.at ? new Date(s.at).toLocaleString("en-IN") : ""} {s.location ? `· ${s.location}` : ""}
                          </p>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Customer emails</h3>
                  {details.data.emails.length === 0 ? (
                    <p className="text-xs text-gray-500">No emails yet.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {details.data.emails.map((e) => (
                        <li key={e.id} className="flex items-center justify-between gap-2 text-xs">
                          <span className="min-w-0">
                            <span className="text-white">{e.template.replace(/_/g, " ")}</span>{" "}
                            <span className={e.status === "sent" ? "text-emerald-300" : e.status === "failed" ? "text-red-300" : "text-gray-400"}>{e.status}</span>
                            {e.error && <span className="block text-[10px] text-red-300 break-words">{e.error}</span>}
                          </span>
                          {e.status === "failed" && (
                            <button onClick={() => resendEmail(e.id, details.order)} disabled={busy === `mail:${e.id}`} className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#1C1C1C] border border-[#333] text-[10px] font-bold disabled:opacity-60">
                              <Mail className="w-3 h-3" /> Resend
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Webhook log</h3>
                  {details.data.webhooks.length === 0 ? (
                    <p className="text-xs text-gray-500">No webhook events received for this order.</p>
                  ) : (
                    <ul className="space-y-1 text-[11px]">
                      {details.data.webhooks.map((w, i) => (
                        <li key={i} className="text-gray-300">
                          {new Date(w.receivedAt).toLocaleString("en-IN")} · {w.label || "event"} · <span className={w.status === "failed" ? "text-red-300" : "text-gray-500"}>{w.status}</span>
                          {w.error ? ` · ${w.error}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit order modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setEditingOrder(null)} />
          <div className="relative bg-[#111111] border border-[#2E2E2E] rounded-2xl max-w-md w-full p-6 text-white z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h2 className="text-base font-serif text-white font-semibold">Update order #{editingOrder.orderNumber}</h2>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderUpdate} className="space-y-3 text-xs">
              <div>
                <label htmlFor="order-status" className="text-[10px] uppercase text-gray-400 block mb-1">Order status</label>
                <select id="order-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value as OrderStatus)} className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]">
                  {Object.entries(ORDER_STATUS_LABELS).map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">The customer is emailed for processing, shipped, out for delivery, delivered, cancelled, return and refund updates.</p>
                {newStatus === "cancelled" && editingOrder.ops?.shiprocketOrderId && (
                  <p className="text-[10px] text-amber-300 mt-1">This also cancels the order in Shiprocket (only possible before pickup).</p>
                )}
              </div>

              {editingOrder.ops?.shiprocketOrderId ? (
                <p className="text-[11px] text-gray-400 bg-[#181818] border border-[#262626] rounded-xl p-3">
                  Courier and AWB are managed by Shiprocket for this order and update automatically.
                </p>
              ) : (
                <>
                  <div>
                    <label htmlFor="courier" className="text-[10px] uppercase text-gray-400 block mb-1">Courier (manual shipments only)</label>
                    <input id="courier" type="text" value={newCourier} onChange={(e) => setNewCourier(e.target.value)} className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]" />
                  </div>
                  <div>
                    <label htmlFor="awb" className="text-[10px] uppercase text-gray-400 block mb-1">AWB / tracking number</label>
                    <input id="awb" type="text" value={newTracking} onChange={(e) => setNewTracking(e.target.value)} className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]" />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                <button type="button" onClick={() => setEditingOrder(null)} className="px-4 py-2 bg-[#1E1E1E] text-gray-300 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-5 py-2 bg-[#D4AF37] text-black font-bold rounded-xl disabled:opacity-60">
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="text-xs text-gray-400">Loading orders…</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}
