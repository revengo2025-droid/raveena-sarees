"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Truck,
  Printer,
  Search,
  CheckCircle,
  ExternalLink,
  Edit3,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR, formatDate } from "@/lib/utils";
import { Order, OrderStatus } from "@/lib/types";

export default function AdminOrdersPage() {
  const { orders, updateOrderStatus, showToast } = useApp();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  // Edit Tracking Modal states
  const [newStatus, setNewStatus] = useState<OrderStatus>("shipped");
  const [newTracking, setNewTracking] = useState("");
  const [newCourier, setNewCourier] = useState("BlueDart Express");

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setNewStatus(order.orderStatus);
    setNewTracking(order.trackingNumber);
    setNewCourier(order.courierPartner);
  };

  const handleSaveOrderUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      updateOrderStatus(editingOrder.id, newStatus, newTracking, newCourier);
      setEditingOrder(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerPhone.includes(search) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.orderStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="border-b border-[#222] pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
          Order Fulfillment & Dispatch Hub
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Review customer orders, update BlueDart AWB tracking, and manage fulfillment stages.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-[#222]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Order #, Patron Name, Phone, or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">All Statuses ({orders.length})</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 bg-[#161616] border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Order Details</th>
                <th className="py-3 px-4">Patron & Contact</th>
                <th className="py-3 px-4">Delivery Address</th>
                <th className="py-3 px-4">Sarees Ordered</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Courier & AWB</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#151515] transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-mono font-bold text-white text-sm">{ord.orderNumber}</p>
                    <p className="text-[10px] text-gray-500">{formatDate(ord.createdAt)}</p>
                    <span className="text-[10px] uppercase text-[#D4AF37]">
                      {ord.paymentMethod} • {ord.paymentStatus}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-white font-medium">{ord.customerName}</p>
                    <p className="text-[10px] text-gray-400">{ord.customerPhone}</p>
                    <p className="text-[10px] text-gray-500">{ord.customerEmail}</p>
                  </td>

                  <td className="py-3.5 px-4 text-gray-300 max-w-[200px]">
                    <p className="line-clamp-1">{ord.shippingAddress.street}</p>
                    <p className="text-[10px] text-gray-400">
                      {ord.shippingAddress.city}, {ord.shippingAddress.state} - {ord.shippingAddress.pincode}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1">
                      {ord.items.map((it, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                          <span className="font-bold text-[#F5DE88]">{it.quantity}x</span>
                          <span className="text-gray-300 truncate max-w-[140px]">{it.productName}</span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-[#F5DE88] text-sm">
                      {formatINR(ord.totalAmount)}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-white font-medium">{ord.courierPartner}</p>
                    <p className="text-[10px] font-mono text-[#D4AF37]">{ord.trackingNumber}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded text-[10px] uppercase font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
                      {ord.orderStatus.replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenEdit(ord)}
                        className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors"
                        title="Update Dispatch & AWB"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/checkout/success?orderNumber=${ord.orderNumber}`}
                        target="_blank"
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-[#222] rounded-lg transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setEditingOrder(null)}
          />

          <div className="relative bg-[#111111] border border-[#2E2E2E] rounded-2xl max-w-md w-full p-6 text-white z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222] pb-3">
              <h2 className="text-base font-serif text-white font-semibold">
                Update Order #{editingOrder.orderNumber}
              </h2>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOrderUpdate} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase text-gray-400 block mb-1">Order Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                >
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing & Quality Check</option>
                  <option value="shipped">Dispatched / Shipped</option>
                  <option value="out_for_delivery">Out for Delivery</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-400 block mb-1">Courier Partner</label>
                <input
                  type="text"
                  value={newCourier}
                  onChange={(e) => setNewCourier(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-gray-400 block mb-1">AWB Tracking Number</label>
                <input
                  type="text"
                  value={newTracking}
                  onChange={(e) => setNewTracking(e.target.value)}
                  className="w-full bg-[#181818] border border-[#333] rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 bg-[#1E1E1E] text-gray-300 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] text-black font-bold rounded-xl"
                >
                  Save Dispatch Info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
