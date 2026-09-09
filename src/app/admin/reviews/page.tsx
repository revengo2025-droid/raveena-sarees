"use client";

import React, { useState } from "react";
import { Star, CheckCircle, XCircle, Trash2, Search } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatDate } from "@/lib/utils";

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
      <div className="border-b border-[#222] pb-6">
        <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
          Client Review & Rating Moderation
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Moderate verified buyer feedback, publish glowing bridal testimonials, and manage star ratings.
        </p>
      </div>

      <div className="bg-[#121212] p-4 rounded-2xl border border-[#222] flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search reviews by author or keywords..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl py-2 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
        <span className="text-xs text-[#F5DE88] font-semibold">
          {filtered.length} Customer Reviews
        </span>
      </div>

      <div className="space-y-4">
        {filtered.map((rev) => {
          const product = products.find((p) => p.id === rev.productId);
          return (
            <div
              key={rev.id}
              className="bg-[#121212] border border-[#242424] rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">{rev.userName}</span>
                  <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/30">
                    {rev.userCity}
                  </span>
                  <span className="text-[10px] text-gray-500">{formatDate(rev.createdAt)}</span>
                </div>

                {product && (
                  <p className="text-xs text-gray-400 font-medium">
                    Reviewed on: <span className="text-white italic">{product.name}</span>
                  </p>
                )}

                <div className="flex items-center text-[#D4AF37]">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-[#D4AF37]" />
                  ))}
                </div>

                {rev.title && <h4 className="text-xs font-bold text-white">{rev.title}</h4>}
                <p className="text-xs text-gray-300 leading-relaxed">{rev.comment}</p>
              </div>

              {/* Status & Actions */}
              <div className="flex md:flex-col items-center md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-[#1F1F1F]">
                <span
                  className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                    rev.status === "approved"
                      ? "bg-green-950/80 text-green-300 border border-green-800"
                      : "bg-red-950/80 text-red-300 border border-red-800"
                  }`}
                >
                  {rev.status}
                </span>

                <div className="flex items-center gap-2">
                  {rev.status !== "approved" && (
                    <button
                      onClick={() => updateReviewStatus(rev.id, "approved")}
                      className="px-3 py-1.5 bg-green-900/60 hover:bg-green-800 text-green-200 text-xs rounded-lg transition-colors flex items-center gap-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                  )}
                  {rev.status !== "rejected" && (
                    <button
                      onClick={() => updateReviewStatus(rev.id, "rejected")}
                      className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 text-xs rounded-lg transition-colors flex items-center gap-1"
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
