"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Edit3, Trash2, Search, X, Eye, EyeOff, ImageOff, Loader2, DatabaseZap, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import type { AdminProduct } from "@/lib/products/mapper";
import {
  createProductAction,
  updateProductAction,
  deleteProductAction,
} from "@/app/actions/products";
import { getAdminProductsAction, importStarterCatalogueAction } from "@/app/actions/catalogue";
import { ProductImageManager, type ProductImageManagerHandle } from "@/components/admin/ProductImageManager";

const inputCls =
  "w-full bg-[#181818] border border-[#333] rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-[#D4AF37]";
const labelCls = "text-[10px] uppercase text-gray-400 block mb-1";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export default function AdminProductsPage() {
  const { categories, showToast } = useApp();

  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);
  const [importing, setImporting] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const imagesRef = useRef<ProductImageManagerHandle>(null);

  // Form fields
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [discountPrice, setDiscountPrice] = useState<number | "">("");
  const [stock, setStock] = useState<number>(1);
  const [fabric, setFabric] = useState("");
  const [zariType, setZariType] = useState("");
  const [weaveType, setWeaveType] = useState("");
  const [sareeLength, setSareeLength] = useState("5.5 Meters");
  const [blouseIncluded, setBlouseIncluded] = useState(true);
  const [blouseLength, setBlouseLength] = useState("0.80 Meters (Unstitched)");
  const [careInstructions, setCareInstructions] = useState("Dry Clean Only. Store wrapped in pure cotton or muslin fabric.");
  const [occasion, setOccasion] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [availableColors, setAvailableColors] = useState("");
  const [description, setDescription] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isBestseller, setIsBestseller] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const load = useCallback(async () => {
    const res = await getAdminProductsAction();
    if (res.success) {
      setProducts(res.data);
      setLoadError(null);
      setNotConfigured(false);
    } else {
      setProducts([]);
      setLoadError(res.error);
      setNotConfigured(Boolean(res.notConfigured));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setName("");
    setSku("");
    setCategoryName(categories[0]?.name || "");
    setPrice("");
    setDiscountPrice("");
    setStock(1);
    setFabric("");
    setZariType("");
    setWeaveType("");
    setSareeLength("5.5 Meters");
    setBlouseIncluded(true);
    setBlouseLength("0.80 Meters (Unstitched)");
    setCareInstructions("Dry Clean Only. Store wrapped in pure cotton or muslin fabric.");
    setOccasion("");
    setPrimaryColor("");
    setAvailableColors("");
    setDescription("");
    setIsFeatured(false);
    setIsBestseller(false);
    setIsNewArrival(true);
    setIsActive(true);
    setEditingId(null);
    setEditingProduct(null);
    setFormError(null);
    setFormKey((k) => k + 1);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEdit = (p: AdminProduct) => {
    resetForm();
    setEditingId(p.id);
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku);
    setCategoryName(p.categoryName);
    setPrice(p.price);
    setDiscountPrice(p.discountPrice ?? "");
    setStock(p.stock);
    setFabric(p.fabric || "");
    setZariType(p.zariType || "");
    setWeaveType(p.weaveType || "");
    setSareeLength(p.sareeLength || "5.5 Meters");
    setBlouseIncluded(p.blouseIncluded);
    setBlouseLength(p.blouseLength || "");
    setCareInstructions(p.careInstructions || "");
    setOccasion(p.occasion || "");
    setPrimaryColor(p.primaryColor || "");
    setAvailableColors(p.availableColors?.join(", ") || "");
    setDescription(p.description || "");
    setIsFeatured(Boolean(p.isFeatured));
    setIsBestseller(Boolean(p.isBestseller));
    setIsNewArrival(Boolean(p.isNewArrival));
    setIsActive(p.isActive);
    setIsModalOpen(true);
  };

  const friendlyError = (message?: string) => {
    if (!message) return "Could not save. Please try again.";
    if (/duplicate key|already exists|unique/i.test(message)) {
      return "A saree with this SKU or name already exists. Use a different SKU or name.";
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setFormError(null);

    if (!name.trim() || price === "" || Number(price) <= 0) {
      setFormError("Please enter the saree name and a valid price.");
      return;
    }
    if (discountPrice !== "" && Number(discountPrice) >= Number(price)) {
      setFormError("The discount price must be lower than the regular price.");
      return;
    }
    const photoCount = imagesRef.current?.count() ?? 0;
    if (photoCount === 0) {
      setFormError("Please upload at least one photo of the saree.");
      return;
    }

    const matchedCategory = categories.find((c) => c.name === categoryName);
    const resolvedCatId =
      matchedCategory?.id &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(matchedCategory.id)
        ? matchedCategory.id
        : null;

    const payload = {
      sku: sku.trim() || `RVN-${Date.now().toString().slice(-6)}`,
      name: name.trim(),
      categoryId: resolvedCatId,
      categoryName: categoryName || categories[0]?.name || "Sarees",
      description: description.trim(),
      price: Number(price),
      discountPrice: discountPrice === "" ? null : Number(discountPrice),
      stock: Number(stock),
      fabric: fabric.trim(),
      zariType: zariType.trim() || "Not specified",
      weaveType: weaveType.trim() || "Not specified",
      sareeLength: sareeLength.trim() || "5.5 Meters",
      blouseIncluded,
      blouseLength: blouseLength.trim() || "0.80 Meters (Unstitched)",
      occasion: occasion.trim(),
      careInstructions: careInstructions.trim() || "Dry Clean Only. Store wrapped in pure cotton or muslin fabric.",
      availableColors: availableColors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      primaryColor: primaryColor.trim(),
      isFeatured,
      isBestseller,
      isNewArrival,
    };

    setSaving(true);
    try {
      let productId = editingId;

      if (!productId) {
        // Created hidden first; it goes live only after its photos have uploaded.
        const created = await createProductAction({
          ...payload,
          slug: slugify(payload.name),
          images: [],
          rating: 0,
          reviewCount: 0,
          isActive: false,
        } as any);
        if (!created.success || !(created as any).data?.id) {
          setFormError(friendlyError((created as any).error));
          return;
        }
        productId = (created as any).data.id as string;
        setEditingId(productId); // the uploader now targets this product
      }

      const photosOk = await (imagesRef.current?.uploadPending(productId) ?? Promise.resolve(true));
      if (!photosOk) {
        setFormError(
          "Some photos failed to upload. The saree is saved but hidden. Retry the failed photos, then press Save again."
        );
        await load();
        return;
      }

      const res = await updateProductAction(productId, {
        ...payload,
        ...(editingProduct ? {} : { slug: slugify(payload.name) }),
        isActive,
      } as any);
      if (!res.success) {
        setFormError(friendlyError((res as any).error));
        return;
      }

      showToast(editingProduct ? "Saree updated" : "New saree published to the catalogue", "success");
      await load();
      closeModal();
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: AdminProduct) => {
    if (!confirm(`Delete "${p.name}" and all its photos? This cannot be undone.`)) return;
    const res = await deleteProductAction(p.id);
    if (!res.success) {
      showToast((res as any).error || "Could not delete the saree.", "error");
      return;
    }
    showToast(`"${p.name}" deleted`, "info");
    load();
  };

  const toggleVisibility = async (p: AdminProduct) => {
    if (!p.isActive && p.imageRows.length === 0) {
      showToast("Add at least one photo before making this saree visible.", "error");
      return;
    }
    const res = await updateProductAction(p.id, { isActive: !p.isActive });
    if (!res.success) {
      showToast((res as any).error || "Could not update visibility.", "error");
      return;
    }
    load();
  };

  const adjustStock = async (p: AdminProduct, delta: number) => {
    const res = await updateProductAction(p.id, { stock: Math.max(0, p.stock + delta) });
    if (!res.success) {
      showToast((res as any).error || "Could not update stock.", "error");
      return;
    }
    load();
  };

  const handleImport = async () => {
    setImporting(true);
    const res = await importStarterCatalogueAction();
    setImporting(false);
    if (!res.success) {
      showToast(res.error, "error");
      return;
    }
    showToast(`Catalogue imported: ${res.imported} new saree(s), ${res.skipped} already present.`, "success");
    load();
  };

  const filteredProducts = useMemo(
    () =>
      (products || []).filter((p) => {
        const q = search.toLowerCase();
        const matchesSearch =
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.fabric || "").toLowerCase().includes(q);
        const matchesCat = selectedCategory === "all" || p.categoryName === selectedCategory;
        return matchesSearch && matchesCat;
      }),
    [products, search, selectedCategory]
  );

  const categoryOptions = useMemo(() => {
    const names = new Set<string>(categories.map((c) => c.name));
    (products || []).forEach((p) => p.categoryName && names.add(p.categoryName));
    return Array.from(names);
  }, [categories, products]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-white font-normal">Saree Catalog & Inventory</h1>
          <p className="text-xs text-gray-400 mt-1">
            Add sarees, upload photos from your device, and manage stock. Changes appear on the website automatically.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={notConfigured}
          className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5DE88] disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider rounded-xl flex items-center gap-1.5 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Saree
        </button>
      </div>

      {/* States: loading / error / empty */}
      {products === null && (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue…
        </div>
      )}

      {loadError && (
        <div role="alert" className="flex items-start gap-3 bg-red-950/40 border border-red-900 rounded-2xl p-4 text-sm text-red-200">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">The catalogue could not be loaded.</p>
            <p className="text-xs mt-1 text-red-300">
              {loadError}
              {notConfigured && " Add your Supabase URL and keys to the server environment, then reload."}
            </p>
          </div>
        </div>
      )}

      {products !== null && !loadError && products.length === 0 && (
        <div className="bg-[#121212] border border-[#2E2E2E] rounded-2xl p-6 sm:p-8 text-center space-y-3">
          <DatabaseZap className="w-8 h-8 text-[#D4AF37] mx-auto" />
          <h2 className="text-lg font-serif text-white">Your database catalogue is empty</h2>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Import the starter catalogue once to manage those sarees, photos and festive drops from this dashboard, or add
            your first saree manually. Starter ratings are not imported.
          </p>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-5 py-2.5 bg-[#D4AF37] hover:bg-[#F5DE88] disabled:opacity-60 text-black font-bold text-xs uppercase tracking-wider rounded-xl inline-flex items-center gap-2"
          >
            {importing && <Loader2 className="w-4 h-4 animate-spin" />} Import Starter Catalogue
          </button>
        </div>
      )}

      {products !== null && products.length > 0 && (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#121212] p-4 rounded-2xl border border-[#222]">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Search by name, SKU, or fabric..."
                aria-label="Search sarees"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-[#333] rounded-xl py-2 pl-10 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="cat-filter" className="text-xs text-gray-400">
                Category:
              </label>
              <select
                id="cat-filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-[#1A1A1A] border border-[#333] text-xs text-white rounded-xl px-3 py-2 focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="all">All Weaves ({products.length})</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
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
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1A1A1A]">
                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-gray-500">
                        No sarees match your search.
                      </td>
                    </tr>
                  )}
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#151515] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.images[0]}
                              alt={p.name}
                              className="w-12 h-14 object-cover rounded-lg border border-[#2E2E2E]"
                            />
                          ) : (
                            <div className="w-12 h-14 rounded-lg border border-[#2E2E2E] bg-[#1A1A1A] flex items-center justify-center text-gray-600">
                              <ImageOff className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <Link
                              href={`/product/${p.slug}`}
                              target="_blank"
                              className="font-medium text-white hover:text-[#D4AF37] line-clamp-1 block"
                            >
                              {p.name}
                            </Link>
                            <p className="text-[11px] text-gray-400 italic">
                              {p.fabric} · {p.imageRows.length} photo{p.imageRows.length === 1 ? "" : "s"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-300 font-semibold">{p.sku}</td>
                      <td className="py-3 px-4 text-gray-300">{p.categoryName}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-[#F5DE88] block">{formatINR(p.discountPrice || p.price)}</span>
                        {p.discountPrice && (
                          <span className="text-[10px] text-gray-500 line-through">{formatINR(p.price)}</span>
                        )}
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
                            onClick={() => adjustStock(p, 5)}
                            className="text-[10px] text-[#D4AF37] hover:underline"
                            title="Add 5 to stock"
                          >
                            +5
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {!p.isActive && (
                            <span className="px-1.5 py-0.5 bg-gray-800 text-gray-300 rounded text-[9px] uppercase font-bold">
                              Hidden
                            </span>
                          )}
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
                              New
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => toggleVisibility(p)}
                            className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors"
                            title={p.isActive ? "Hide from store" : "Show in store"}
                            aria-label={p.isActive ? "Hide from store" : "Show in store"}
                          >
                            {p.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#222] rounded-lg transition-colors"
                            title="Edit saree"
                            aria-label="Edit saree"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#222] rounded-lg transition-colors"
                            title="Delete saree"
                            aria-label="Delete saree"
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
        </>
      )}

      {/* Add / Edit Saree Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 font-sans" role="dialog" aria-modal="true" aria-label={editingProduct ? "Edit saree" : "Add new saree"}>
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => !saving && closeModal()} />

          <div className="relative bg-[#111111] border border-[#2E2E2E] rounded-2xl max-w-3xl w-full p-5 sm:p-8 text-white z-10 shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <h2 className="text-xl font-serif text-white font-semibold">
                {editingProduct ? "Edit Saree" : "Add New Saree"}
              </h2>
              <button onClick={() => !saving && closeModal()} className="text-gray-400 hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* Photos */}
              <section aria-labelledby="photos-heading" className="space-y-2">
                <h3 id="photos-heading" className="text-[11px] uppercase tracking-wider text-[#D4AF37] font-bold">
                  Photos *
                </h3>
                <ProductImageManager
                  key={formKey}
                  ref={imagesRef}
                  productId={editingId}
                  initial={editingProduct?.imageRows}
                />
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="p-name">Saree Name *</label>
                  <input id="p-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-sku">SKU Code</label>
                  <input id="p-sku" type="text" placeholder="Auto-generated if empty" value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-cat">Category *</label>
                  <select id="p-cat" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className={inputCls}>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-price">Regular Price (₹) *</label>
                  <input id="p-price" type="number" min={1} required value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-disc">Discount Price (₹)</label>
                  <input id="p-disc" type="number" min={1} value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value === "" ? "" : Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-stock">Stock Quantity *</label>
                  <input id="p-stock" type="number" min={0} required value={stock} onChange={(e) => setStock(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-fabric">Fabric *</label>
                  <input id="p-fabric" type="text" required value={fabric} onChange={(e) => setFabric(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-zari">Zari</label>
                  <input id="p-zari" type="text" value={zariType} onChange={(e) => setZariType(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-weave">Weave</label>
                  <input id="p-weave" type="text" value={weaveType} onChange={(e) => setWeaveType(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-occasion">Occasion *</label>
                  <input id="p-occasion" type="text" required value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-color">Primary Colour *</label>
                  <input id="p-color" type="text" required value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-colors">Available Colours (comma separated)</label>
                  <input id="p-colors" type="text" value={availableColors} onChange={(e) => setAvailableColors(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-length">Saree Length</label>
                  <input id="p-length" type="text" value={sareeLength} onChange={(e) => setSareeLength(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls} htmlFor="p-blouse">Blouse Piece</label>
                  <input id="p-blouse" type="text" value={blouseLength} onChange={(e) => setBlouseLength(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="p-care">Care Instructions</label>
                  <input id="p-care" type="text" value={careInstructions} onChange={(e) => setCareInstructions(e.target.value)} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelCls} htmlFor="p-desc">Description *</label>
                  <textarea id="p-desc" rows={4} required minLength={10} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} p-3`} />
                </div>
              </section>

              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {[
                  ["Visible in store", isActive, setIsActive],
                  ["Blouse included", blouseIncluded, setBlouseIncluded],
                  ["Featured", isFeatured, setIsFeatured],
                  ["Best seller", isBestseller, setIsBestseller],
                  ["New arrival", isNewArrival, setIsNewArrival],
                ].map(([label, checked, setter]) => (
                  <label key={label as string} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked as boolean}
                      onChange={(e) => (setter as (v: boolean) => void)(e.target.checked)}
                      className="accent-[#D4AF37] w-4 h-4"
                    />
                    <span>{label as string}</span>
                  </label>
                ))}
              </div>

              {formError && (
                <div role="alert" className="flex items-start gap-2 text-[12px] text-red-300 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-[#222]">
                <button type="button" disabled={saving} onClick={closeModal} className="px-5 py-2.5 bg-[#1E1E1E] text-gray-300 hover:text-white rounded-xl disabled:opacity-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black font-bold rounded-xl inline-flex items-center gap-2 disabled:opacity-70">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? "Saving…" : editingProduct ? "Save Changes" : "Publish Saree"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
