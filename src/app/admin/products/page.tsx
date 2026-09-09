"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Edit3,
  Trash2,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
  Check,
  Eye,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { SareeProduct } from "@/lib/types";
import { formatINR } from "@/lib/utils";

export default function AdminProductsPage() {
  const { products, categories, addProduct, updateProduct, deleteProduct, showToast } = useApp();

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "cat-1");
  const [price, setPrice] = useState<number>(25000);
  const [discountPrice, setDiscountPrice] = useState<number>(21999);
  const [stock, setStock] = useState<number>(10);
  const [fabric, setFabric] = useState("Pure Mulberry Kanchipuram Silk");
  const [zariType, setZariType] = useState("Pure Gold Zari");
  const [weaveType, setWeaveType] = useState("Korvai Handloom Technique");
  const [occasion, setOccasion] = useState("Bridal / Wedding");
  const [primaryColor, setPrimaryColor] = useState("Crimson Red");
  const [availableColors, setAvailableColors] = useState("Crimson Red, Royal Gold, Maroon");
  const [images, setImages] = useState(
    "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85"
  );
  const [description, setDescription] = useState(
    "Exquisite handwoven heirloom saree with pure gold zari temple border and heavy brocade pallu."
  );
  const [isFeatured, setIsFeatured] = useState(true);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);

  const resetForm = () => {
    setName("");
    setSku(`RAV-SLK-${Math.floor(100 + Math.random() * 900)}`);
    setCategoryId(categories[0]?.id || "cat-1");
    setPrice(25000);
    setDiscountPrice(21999);
    setStock(10);
    setFabric("Pure Mulberry Kanchipuram Silk");
    setZariType("Pure Gold Zari");
    setWeaveType("Korvai Handloom Technique");
    setOccasion("Bridal / Wedding");
    setPrimaryColor("Crimson Red");
    setAvailableColors("Crimson Red, Royal Gold, Maroon");
    setImages("https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=85");
    setDescription("Exquisite handwoven heirloom saree with pure gold zari temple border.");
    setIsFeatured(false);
    setIsBestseller(false);
    setIsNewArrival(true);
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleEdit = (p: SareeProduct) => {
    setEditingId(p.id);
    setName(p.name);
    setSku(p.sku);
    setCategoryId(p.categoryId);
    setPrice(p.price);
    setDiscountPrice(p.discountPrice || p.price);
    setStock(p.stock);
    setFabric(p.fabric);
    setZariType(p.zariType);
    setWeaveType(p.weaveType);
    setOccasion(p.occasion);
    setPrimaryColor(p.primaryColor);
    setAvailableColors(p.availableColors.join(", "));
    setImages(p.images.join("\n"));
    setDescription(p.description);
    setIsFeatured(p.isFeatured || false);
    setIsBestseller(p.isBestseller || false);
    setIsNewArrival(p.isNewArrival || false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !price) {
      showToast("Please fill in Saree name, SKU, and Price.", "error");
      return;
    }

    const catObj = categories.find((c) => c.id === categoryId);
    const imageList = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const colorList = availableColors
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    if (editingId) {
      updateProduct(editingId, {
        name,
        sku,
        slug,
        categoryId,
        categoryName: catObj?.name || "Silk Sarees",
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        stock: Number(stock),
        fabric,
        zariType,
        weaveType,
        occasion,
        primaryColor,
        availableColors: colorList,
        images: imageList.length > 0 ? imageList : [images],
        description,
        isFeatured,
        isBestseller,
        isNewArrival,
      });
    } else {
      addProduct({
        sku,
        name,
        slug,
        categoryId,
        categoryName: catObj?.name || "Silk Sarees",
        description,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : undefined,
        stock: Number(stock),
        fabric,
        zariType,
        weaveType,
        sareeLength: "5.5 Meters",
        blouseIncluded: true,
        blouseLength: "0.80 Meters (Unstitched)",
        occasion,
        careInstructions: "Dry Clean Only. Wrap in mul-mul cloth.",
        availableColors: colorList,
        primaryColor,
        images: imageList.length > 0 ? imageList : [images],
        rating: 5.0,
        reviewCount: 0,
        isFeatured,
        isBestseller,
        isNewArrival,
      });
    }

    resetForm();
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.fabric.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === "all" || p.categoryId === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">
            Saree Catalog & Inventory
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage your masterloom inventory, upload new weaves, and adjust stock counts.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
          className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5DE88] text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Saree
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-[#222]">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by Saree name, SKU, or Fabric..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Category:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="all">All Weaves ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Saree Inventory Table */}
      <div className="bg-[#121212] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-[10px] uppercase font-bold text-gray-400 bg-[#161616] border-b border-[#262626]">
              <tr>
                <th className="py-3 px-4">Saree</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Stock</th>
                <th className="py-3 px-4">Tags</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-[#151515] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0]}
                        alt={p.name}
                        className="w-12 h-14 object-cover rounded-lg border border-[#2E2E2E]"
                      />
                      <div className="min-w-0">
                        <Link
                          href={`/product/${p.slug}`}
                          target="_blank"
                          className="font-medium text-white hover:text-[#D4AF37] line-clamp-1 block"
                        >
                          {p.name}
                        </Link>
                        <p className="text-[11px] text-gray-400 italic">{p.fabric}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-gray-300 font-semibold">{p.sku}</td>

                  <td className="py-3 px-4 text-gray-300">{p.categoryName}</td>

                  <td className="py-3 px-4">
                    <div className="space-y-0.5">
                      <span className="font-bold text-[#F5DE88] block">
                        {formatINR(p.discountPrice || p.price)}
                      </span>
                      {p.discountPrice && (
                        <span className="text-[10px] text-gray-500 line-through">
                          {formatINR(p.price)}
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                          p.stock <= 3
                            ? "bg-red-950/80 text-red-300 border border-red-800"
                            : p.stock <= 6
                            ? "bg-amber-950/80 text-amber-300 border border-amber-800"
                            : "bg-green-950/80 text-green-300 border border-green-800"
                        }`}
                      >
                        {p.stock} units
                      </span>
                      <button
                        onClick={() => updateProduct(p.id, { stock: p.stock + 5 })}
                        className="text-[10px] text-[#D4AF37] hover:underline"
                        title="Add 5 more to stock"
                      >
                        +5
                      </button>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {p.isFeatured && (
                        <span className="px-1.5 py-0.5 bg-[#D4AF37]/20 text-[#F5DE88] rounded text-[9px] uppercase font-bold">
                          Featured
                        </span>
                      )}
                      {p.isBestseller && (
                        <span className="px-1.5 py-0.5 bg-blue-950 text-blue-300 rounded text-[9px] uppercase font-bold">
                          Bestseller
                        </span>
                      )}
                      {p.isNewArrival && (
                        <span className="px-1.5 py-0.5 bg-purple-950 text-purple-300 rounded text-[9px] uppercase font-bold">
                          New Drop
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors"
                        title="Edit Saree"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                            deleteProduct(p.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#222] rounded-lg transition-colors"
                        title="Delete Saree"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Saree Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 font-sans">
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
          />

          <div className="relative bg-[#111111] border border-[#2E2E2E] rounded-2xl max-w-3xl w-full p-6 sm:p-8 text-white z-10 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h2 className="text-xl font-serif text-white font-semibold">
                {editingId ? "Edit Saree Specifications" : "Add New Royal Handloom Saree"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Saree Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Crimson Gold Temple Border Kanjivaram Silk Saree"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Category *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Regular Price (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Festive Discount Price (₹)
                  </label>
                  <input
                    type="number"
                    value={discountPrice}
                    onChange={(e) => setDiscountPrice(Number(e.target.value))}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Inventory Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Fabric Type
                  </label>
                  <input
                    type="text"
                    value={fabric}
                    onChange={(e) => setFabric(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Zari Specification
                  </label>
                  <input
                    type="text"
                    value={zariType}
                    onChange={(e) => setZariType(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Occasion / Event
                  </label>
                  <input
                    type="text"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Primary Shade / Color
                  </label>
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Available Shades (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={availableColors}
                    onChange={(e) => setAvailableColors(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Image URLs (One per line) *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={images}
                    onChange={(e) => setImages(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-[#D4AF37] font-mono text-[11px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] uppercase text-gray-400 block mb-1">
                    Product Description & Provenance *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#181818] border border-[#333] rounded-xl p-3 text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Promotional Badges Checkboxes */}
              <div className="flex flex-wrap gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>Mark as Featured</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isBestseller}
                    onChange={(e) => setIsBestseller(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>Mark as Best Seller</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>Mark as New Drop</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#222]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-[#1E1E1E] text-gray-300 hover:text-white rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold rounded-xl"
                >
                  {editingId ? "Save Changes" : "Publish Saree"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
