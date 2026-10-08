"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ExternalLink, ImageOff, Loader2, Plus, Repeat2, Search, Sparkles, Trash2, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { formatINR } from "@/lib/utils";
import {
  getFestiveDropsAdminAction,
  saveFestiveDropsAction,
  type PickerProduct,
} from "@/app/actions/featured-drops";

type Slots = [string | null, string | null];

export default function AdminFestiveDropsPage() {
  const { showToast } = useApp();

  const [products, setProducts] = useState<PickerProduct[] | null>(null);
  const [saved, setSaved] = useState<Slots>([null, null]);
  const [draft, setDraft] = useState<Slots>([null, null]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<0 | 1 | null>(null);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await getFestiveDropsAdminAction();
    if (!res.success) {
      setError(res.error);
      setProducts([]);
      return;
    }
    setError(null);
    setProducts(res.products);
    const ids: Slots = [res.slots[0]?.id ?? null, res.slots[1]?.id ?? null];
    setSaved(ids);
    setDraft(ids);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (pickerSlot !== null) searchRef.current?.focus();
  }, [pickerSlot]);

  useEffect(() => {
    if (pickerSlot === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPickerSlot(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pickerSlot]);

  const byId = useMemo(() => new Map((products || []).map((p) => [p.id, p])), [products]);
  const dirty = draft[0] !== saved[0] || draft[1] !== saved[1];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products || []).filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [products, query]);

  const choose = (slot: 0 | 1, id: string | null) => {
    setDraft((prev) => (slot === 0 ? [id, prev[1]] : [prev[0], id]));
    setPickerSlot(null);
    setQuery("");
  };

  const save = async () => {
    setSaving(true);
    const res = await saveFestiveDropsAction(draft[0], draft[1]);
    setSaving(false);
    if (!res.success) {
      showToast(res.error, "error");
      return;
    }
    showToast("Featured Festive Drops updated. The homepage now shows your selection.", "success");
    load();
  };

  const renderSlot = (slot: 0 | 1) => {
    const product = draft[slot] ? byId.get(draft[slot] as string) : undefined;
    return (
      <section
        key={slot}
        aria-label={`Product ${slot + 1}`}
        className="bg-adm-surface border border-adm-line rounded-2xl overflow-hidden flex flex-col"
      >
        <div className="px-5 py-3 border-b border-adm-line flex items-center justify-between">
          <h2 className="text-sm font-semibold text-adm-strong">Product {slot + 1}</h2>
          {product && !product.isActive && (
            <span className="text-[10px] uppercase font-bold text-adm-warn bg-adm-warn/15 border border-adm-warn/40 rounded px-2 py-0.5">
              Hidden in store
            </span>
          )}
        </div>

        {product ? (
          <div className="p-5 flex gap-4">
            <div className="w-28 sm:w-32 aspect-[3/4] shrink-0 rounded-xl overflow-hidden bg-adm-raised border border-adm-line">
              {product.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-adm-faint">
                  <ImageOff className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex flex-col justify-between">
              <div>
                <p className="text-adm-strong font-medium leading-snug line-clamp-3">{product.name}</p>
                <p className="text-[11px] text-adm-faint font-mono mt-1">{product.sku}</p>
                <p className="text-adm-goldsoft font-bold mt-2">
                  {formatINR(product.discountPrice || product.price)}
                  {product.discountPrice && (
                    <span className="ml-2 text-[11px] text-adm-faint line-through font-normal">{formatINR(product.price)}</span>
                  )}
                </p>
                <p className={`text-[11px] mt-1 ${product.stock > 0 ? "text-adm-ok" : "text-adm-danger"}`}>
                  {product.stock > 0 ? `${product.stock} in stock` : "Out of stock (shown as sold out)"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setPickerSlot(slot)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-adm-raised hover:bg-[#2A2A2A] text-xs text-adm-text"
                >
                  <Repeat2 className="w-3.5 h-3.5" /> Replace
                </button>
                <button
                  type="button"
                  onClick={() => choose(slot, null)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-adm-raised hover:bg-adm-danger/15 text-xs text-adm-danger"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3 flex-1">
            <Sparkles className="w-6 h-6 text-adm-gold/70" />
            <p className="text-xs text-adm-muted">No product selected for this slot.</p>
            <button
              type="button"
              onClick={() => setPickerSlot(slot)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F5DE88] text-black text-xs font-bold uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> Select Product
            </button>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-adm-line pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal">Featured Festive Drops</h1>
          <p className="text-xs text-adm-muted mt-1 max-w-xl">
            Choose exactly two sarees to feature on the homepage. Select from your existing catalogue; nothing is
            duplicated. Changes go live as soon as you save.
          </p>
        </div>
        <Link
          href="/"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs text-adm-gold hover:underline self-start sm:self-auto"
        >
          View homepage <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {products === null && (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-adm-muted">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-start gap-3 bg-adm-danger/15 border border-adm-danger/40 rounded-2xl p-4 text-sm text-adm-danger">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {products !== null && !error && (
        <>
          {products.length === 0 && (
            <div className="bg-adm-surface border border-adm-line rounded-2xl p-6 text-center text-sm text-adm-muted">
              Your catalogue is empty.{" "}
              <Link href="/admin/products" className="text-adm-gold underline">
                Add or import sarees first
              </Link>
              .
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {renderSlot(0)}
            {renderSlot(1)}
          </div>

          <div className="flex items-center justify-end gap-3">
            {dirty && <span className="text-[11px] text-adm-warn mr-auto">You have unsaved changes.</span>}
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => setDraft(saved)}
              className="px-5 py-2.5 rounded-xl bg-adm-raised text-adm-text hover:text-adm-strong text-xs disabled:opacity-40"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={save}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-40"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Changes
            </button>
          </div>
        </>
      )}

      {/* Product picker */}
      {pickerSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={`Select product ${pickerSlot + 1}`}>
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm" onClick={() => setPickerSlot(null)} />
          <div className="relative z-10 bg-[#111] border border-adm-line w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-adm-line">
              <h2 className="text-adm-strong font-semibold text-sm">Select Product {pickerSlot + 1}</h2>
              <button type="button" onClick={() => setPickerSlot(null)} className="text-adm-muted hover:text-adm-strong" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-adm-line relative">
              <Search className="w-4 h-4 text-adm-faint absolute left-7 top-7" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or SKU"
                aria-label="Search products"
                className="w-full bg-adm-raised border border-adm-line2 rounded-xl py-2.5 pl-10 pr-3 text-sm text-adm-strong placeholder-adm-faint focus:outline-none focus:border-adm-gold"
              />
            </div>
            <ul className="overflow-y-auto divide-y divide-adm-line">
              {filtered.length === 0 && <li className="p-6 text-center text-xs text-adm-faint">No products found.</li>}
              {filtered.map((p) => {
                const other = draft[pickerSlot === 0 ? 1 : 0];
                const taken = other === p.id;
                const disabled = taken || !p.isActive;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => choose(pickerSlot, p.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-adm-raised disabled:opacity-40 disabled:hover:bg-transparent"
                    >
                      <div className="w-10 h-12 rounded-md overflow-hidden bg-adm-raised shrink-0">
                        {p.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.image} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-adm-strong line-clamp-1">{p.name}</p>
                        <p className="text-[11px] text-adm-faint font-mono">
                          {p.sku} · {formatINR(p.discountPrice || p.price)}
                        </p>
                      </div>
                      {taken && <span className="text-[10px] text-adm-warn">In Product {pickerSlot === 0 ? 2 : 1}</span>}
                      {!taken && !p.isActive && <span className="text-[10px] text-adm-muted">Hidden</span>}
                      {draft[pickerSlot] === p.id && <span className="text-[10px] text-adm-gold">Selected</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
