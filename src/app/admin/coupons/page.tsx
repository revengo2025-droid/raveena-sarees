"use client";

import React, { useState } from "react";
import { Tag, Plus, CheckCircle, XCircle, Trash2, X, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { Coupon } from "@/lib/types";
import { formatINR } from "@/lib/utils";
import { createCouponAction } from "@/app/actions/coupons";

export default function AdminCouponsPage() {
  const { coupons, addCoupon, toggleCouponStatus, showToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [minOrderValue, setMinOrderValue] = useState<number>(5000);
  const [maxDiscount, setMaxDiscount] = useState<number>(3000);
  const [description, setDescription] = useState("");

  const resetForm = () => {
    setCode("");
    setDiscountType("percentage");
    setDiscountValue(10);
    setMinOrderValue(5000);
    setMaxDiscount(3000);
    setDescription("");
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !discountValue) {
      showToast("Please provide coupon code and discount value.", "error");
      return;
    }

    const newCoupon = {
      code: code.trim().toUpperCase(),
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue),
      maxDiscount: discountType === "percentage" ? Number(maxDiscount) : undefined,
      description:
        description ||
        `${discountType === "percentage" ? `${discountValue}% off` : `Flat ₹${discountValue} off`} on orders above ₹${minOrderValue}`,
      isActive: true,
      expiresAt: "2026-12-31T23:59:59Z",
    };

    addCoupon(newCoupon);
    createCouponAction({
      ...newCoupon,
      usageLimit: 1000,
    } as any).catch((err) => console.error("Database coupon creation error:", err));

    showToast(`Voucher ${newCoupon.code} created and activated`, "success");
    resetForm();
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-adm-line pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">
            Promo Codes & Festive Vouchers
          </h1>
          <p className="text-xs text-adm-muted mt-1">
            Configure discount codes, bridal vouchers, and minimum order values.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5DE88] text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Voucher
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map((c) => (
          <div
            key={c.id}
            className={`bg-adm-surface border rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl transition-all ${
              c.isActive ? "border-adm-gold/50" : "border-adm-line opacity-60"
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-base text-adm-goldsoft bg-adm-raised px-3 py-1 rounded-lg border border-adm-line2">
                  {c.code}
                </span>
                <button
                  onClick={() => toggleCouponStatus(c.id)}
                  className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    c.isActive
                      ? "bg-adm-ok/15 text-adm-ok border border-adm-ok/40"
                      : "bg-adm-danger/15 text-adm-danger border border-adm-danger/40"
                  }`}
                >
                  {c.isActive ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                  {c.isActive ? "Active" : "Disabled"}
                </button>
              </div>

              <p className="text-xs text-adm-text font-medium">{c.description}</p>

              <div className="pt-2 text-xs space-y-1 text-adm-muted">
                <p>
                  Discount:{" "}
                  <strong className="text-adm-strong">
                    {c.discountType === "percentage"
                      ? `${c.discountValue}% OFF`
                      : formatINR(c.discountValue)}
                  </strong>
                </p>
                <p>
                  Min Order Value: <strong className="text-adm-strong">{formatINR(c.minOrderValue)}</strong>
                </p>
                {c.maxDiscount && (
                  <p>
                    Max Savings Cap: <strong className="text-adm-strong">{formatINR(c.maxDiscount)}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-adm-line flex items-center justify-between text-xs">
              <span className="text-[10px] text-adm-faint">Valid until Dec 2026</span>
              <button
                onClick={() => toggleCouponStatus(c.id)}
                className="text-xs text-adm-gold hover:underline"
              >
                {c.isActive ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-adm-surface border border-adm-line rounded-2xl max-w-md w-full p-6 text-adm-strong z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-adm-line pb-3">
              <h2 className="text-base font-serif text-adm-strong font-semibold">
                Create Festive Voucher
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-adm-muted hover:text-adm-strong">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DIWALI2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3.5 py-2 text-adm-strong uppercase font-mono focus:outline-none focus:border-adm-gold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">Discount Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-adm-strong focus:outline-none focus:border-adm-gold"
                >
                  <option value="percentage">Percentage (%) Discount</option>
                  <option value="fixed">Flat Fixed Amount (₹) Discount</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase text-adm-muted block mb-1">
                    {discountType === "percentage" ? "Discount (%) *" : "Discount (₹) *"}
                  </label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-adm-strong"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase text-adm-muted block mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    value={minOrderValue}
                    onChange={(e) => setMinOrderValue(Number(e.target.value))}
                    className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-adm-strong"
                  />
                </div>
              </div>

              {discountType === "percentage" && (
                <div>
                  <label className="text-[10px] uppercase text-adm-muted block mb-1">
                    Max Discount Cap (₹)
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(Number(e.target.value))}
                    className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-adm-strong"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">
                  Voucher Headline Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 15% off on royal bridal wedding purchases"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3 py-2 text-adm-strong"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-adm-line">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-adm-raised text-adm-text rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#D4AF37] text-black font-bold rounded-xl"
                >
                  Create Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
