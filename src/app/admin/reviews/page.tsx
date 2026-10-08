"use client";

import React, { useState } from "react";
import { Star, CheckCircle, XCircle, Trash2, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import { moderateReviewAction } from "@/app/actions/reviews";

export default function AdminReviewsPage() {
  const { reviews, updateReviewStatus, products } = useApp();
  const [search, setSearch] = useState("");

  const filtered = reviews.filter(
    (r) =>
      r.userName.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      (r.title && r.title.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 font-sans">
      <div className="border-b border-adm-line pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">
          Client Review & Rating Moderation
        </h1>
        <p className="text-xs text-adm-muted mt-1">
          Moderate verified buyer feedback, publish glowing bridal testimonials, and manage star ratings.
        </p>
      </div>

      <div className="bg-adm-surface p-4 rounded-2xl border border-adm-line flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-adm-muted absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search reviews by author or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-adm-raised border border-adm-line2 rounded-xl py-2 pl-10 pr-3 text-xs text-adm-strong focus:outline-none focus:border-adm-gold"
          />
        </div>
        <span className="text-xs text-adm-goldsoft font-semibold">
          {filtered.length} Customer Reviews
        </span>
      </div>

      <div className="space-y-4">
        {filtered.map((rev) => {
          const product = products.find((p) => p.id === rev.productId);
          return (
            <div
              key={rev.id}
              className="bg-adm-surface border border-[#242424] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-adm-strong text-sm">{rev.userName}</span>
                  <span className="text-[10px] text-adm-gold bg-adm-gold/10 px-2 py-0.5 rounded border border-adm-gold/30">
                    {rev.userCity}
                  </span>
                  <span className="text-[10px] text-adm-faint">{formatDate(rev.createdAt)}</span>
                </div>

                {product && (
                  <p className="text-xs text-adm-muted font-medium">
                    Reviewed on: <span className="text-adm-strong italic">{product.name}</span>
                  </p>
                )}

                <div className="flex items-center text-adm-gold">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D4AF37]" />
                  ))}
                </div>

                {rev.title && <h4 className="text-xs font-bold text-adm-strong">{rev.title}</h4>}
                <p className="text-xs text-adm-text leading-relaxed">{rev.comment}</p>
              </div>

              {/* Status & Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-adm-line">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    rev.status === "approved"
                      ? "bg-adm-ok/15 text-adm-ok border border-adm-ok/40"
                      : "bg-adm-danger/15 text-adm-danger border border-adm-danger/40"
                  }`}
                >
                  {rev.status}
                </span>

                <div className="flex items-center gap-2">
                  {rev.status !== "approved" && (
                    <button
                      onClick={() => {
                        updateReviewStatus(rev.id, "approved");
                        moderateReviewAction(rev.id, "approved").catch((err) =>
                          console.error("Database review approval error:", err)
                        );
                      }}
                      className="px-3 py-1.5 bg-adm-ok/15 hover:bg-green-800 text-adm-ok text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {rev.status !== "rejected" && (
                    <button
                      onClick={() => {
                        updateReviewStatus(rev.id, "rejected");
                        moderateReviewAction(rev.id, "rejected").catch((err) =>
                          console.error("Database review rejection error:", err)
                        );
                      }}
                      className="px-3 py-1.5 bg-adm-danger/15 hover:bg-red-800 text-adm-danger text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
