"use client";

import React, { useState } from "react";
import { Layers, Plus, Edit3, Trash2, X, Sparkles } from "lucide-react";
import { useApp } from "@/lib/store";
import { Category } from "@/lib/types";

export default function AdminCategoriesPage() {
  const { categories, products, addCategory, deleteCategory, showToast } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const resetForm = () => {
    setName("");
    setDescription("");
    setImageUrl("");
    setIsModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      showToast("Please enter a category name.", "error");
      return;
    }
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    addCategory({
      name,
      slug,
      description: description || "Authentic luxury handloom collection curated for discerning patrons.",
      imageUrl: imageUrl || "/images/products/rani-pink-silk-1.jpg",
      itemCount: 1,
      featured: true,
    });
    resetForm();
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-adm-line pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">
            Saree Category & Weave Management
          </h1>
          <p className="text-xs text-adm-muted mt-1">
            Organize saree taxonomy, landing page banners, and weave heritage notes.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5DE88] text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Category
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
          >
            <div className="relative aspect-[16/9] bg-adm-raised">
              <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <span className="absolute bottom-3 left-3 text-[10px] text-adm-goldsoft uppercase font-bold tracking-wider bg-black/60 px-2.5 py-0.5 rounded backdrop-blur-md">
                Slug: {cat.slug}
              </span>
            </div>

            <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-serif text-lg text-adm-strong font-medium">{cat.name}</h3>
                <p className="text-xs text-adm-muted line-clamp-2 mt-1">{cat.description}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-adm-line text-xs">
                <span className="text-adm-muted">
                  Total Sarees:{" "}
                  <strong className="text-adm-strong">
                    {products.filter(
                      (p) =>
                        p.categoryId === cat.id ||
                        p.categoryName?.toLowerCase() === cat.name.toLowerCase()
                    ).length}
                  </strong>
                </span>

                <button
                  onClick={() => {
                    if (confirm(`Remove category "${cat.name}"?`)) {
                      deleteCategory(cat.id);
                    }
                  }}
                  className="text-adm-faint hover:text-adm-danger p-1 transition-colors"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-adm-surface border border-adm-line rounded-2xl max-w-lg w-full p-6 text-adm-strong z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-adm-line pb-3">
              <h2 className="text-lg font-serif text-adm-strong font-semibold">Add Saree Category</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-adm-muted hover:text-adm-strong"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chanderi Pure Silk Sarees"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3.5 py-2 text-adm-strong focus:outline-none focus:border-adm-gold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">Hero Image URL</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl px-3.5 py-2 text-adm-strong focus:outline-none focus:border-adm-gold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase text-adm-muted block mb-1">Heritage Description</label>
                <textarea
                  rows={3}
                  placeholder="Short historical background of the weave..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-adm-raised border border-adm-line2 rounded-xl p-2.5 text-adm-strong focus:outline-none focus:border-adm-gold"
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
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
