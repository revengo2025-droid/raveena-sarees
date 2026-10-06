"use client";

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Loader2,
  RefreshCw,
  Repeat2,
  Star,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { MAX_IMAGES_PER_PRODUCT } from "@/lib/images/constants";
import { prepareImage, uploadProductImage, validateClientFile } from "@/lib/images/client";
import type { ProductImageRow } from "@/lib/products/mapper";
import {
  deleteProductImageAction,
  reorderProductImagesAction,
  setPrimaryImageAction,
  updateImageAltTextAction,
} from "@/app/actions/product-images";

export interface ProductImageManagerHandle {
  /** Uploads every queued / failed photo for a (just created) product. Resolves true when all succeeded. */
  uploadPending: (productId: string) => Promise<boolean>;
  /** Number of photos (uploaded + waiting). */
  count: () => number;
}

interface Item {
  key: string;
  id?: string;
  url: string;
  file?: File;
  status: "done" | "queued" | "uploading" | "error";
  progress: number;
  error?: string;
  isPrimary: boolean;
  alt: string;
}

interface Props {
  productId: string | null;
  initial?: ProductImageRow[];
  onCountChange?: (count: number) => void;
}

let keyCounter = 0;
const newKey = () => `img-${Date.now()}-${keyCounter++}`;

export const ProductImageManager = forwardRef<ProductImageManagerHandle, Props>(function ProductImageManager(
  { productId, initial = [], onCountChange },
  ref
) {
  const toItem = (r: ProductImageRow): Item => ({
    key: r.id,
    id: r.id,
    url: r.url,
    status: "done",
    progress: 100,
    isPrimary: r.isPrimary,
    alt: r.altText || "",
  });

  const itemsRef = useRef<Item[]>(initial.map(toItem));
  const [items, setItems] = useState<Item[]>(itemsRef.current);
  const [notice, setNotice] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const queueRef = useRef<Promise<unknown>>(Promise.resolve());
  const inputRef = useRef<HTMLInputElement>(null);
  const productIdRef = useRef(productId);
  productIdRef.current = productId;

  const commit = useCallback((fn: (prev: Item[]) => Item[]) => {
    itemsRef.current = fn(itemsRef.current);
    setItems(itemsRef.current);
  }, []);

  const patch = useCallback(
    (key: string, changes: Partial<Item>) => commit((prev) => prev.map((i) => (i.key === key ? { ...i, ...changes } : i))),
    [commit]
  );

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  // Free object URLs on unmount
  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => i.file && URL.revokeObjectURL(i.url));
    },
    []
  );

  const setBusy = (key: string, busy: boolean) =>
    setBusyKeys((prev) => {
      const next = new Set(prev);
      if (busy) next.add(key);
      else next.delete(key);
      return next;
    });

  /** Compress → upload → swap the preview for the stored image. Returns success. */
  const processUpload = useCallback(
    async (key: string, pid: string, file: File, replaceImageId?: string): Promise<boolean> => {
      patch(key, { status: "uploading", progress: 0, error: undefined });
      try {
        const prepared = await prepareImage(file);
        const result = await uploadProductImage({
          productId: pid,
          file: prepared,
          replaceImageId,
          onProgress: (p) => patch(key, { progress: p }),
        });
        if (!result.ok) {
          patch(key, { status: replaceImageId ? "done" : "error", error: result.error, progress: 0 });
          if (replaceImageId) setNotice(result.error);
          return false;
        }
        const current = itemsRef.current.find((i) => i.key === key);
        if (current?.file) URL.revokeObjectURL(current.url);
        patch(key, {
          id: result.image.id,
          url: result.image.url,
          file: undefined,
          status: "done",
          progress: 100,
          error: undefined,
          isPrimary: result.image.isPrimary,
          alt: result.image.altText || "",
        });
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed. Please retry.";
        patch(key, { status: replaceImageId ? "done" : "error", error: message, progress: 0 });
        if (replaceImageId) setNotice(message);
        return false;
      }
    },
    [patch]
  );

  const enqueue = useCallback(
    (key: string, pid: string, file: File, replaceImageId?: string) => {
      const run = queueRef.current.then(() => processUpload(key, pid, file, replaceImageId));
      queueRef.current = run.catch(() => undefined);
      return run;
    },
    [processUpload]
  );

  const addFiles = (list: FileList | File[] | null) => {
    if (!list) return;
    const files = Array.from(list);
    if (files.length === 0) return;
    setNotice(null);

    const room = MAX_IMAGES_PER_PRODUCT - itemsRef.current.length;
    if (room <= 0) {
      setNotice(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos.`);
      return;
    }

    const problems: string[] = [];
    const accepted: Item[] = [];
    for (const file of files) {
      const problem = validateClientFile(file);
      if (problem) {
        problems.push(problem);
        continue;
      }
      if (accepted.length >= room) {
        problems.push(`Only ${MAX_IMAGES_PER_PRODUCT} photos are allowed; some files were skipped.`);
        break;
      }
      accepted.push({
        key: newKey(),
        url: URL.createObjectURL(file),
        file,
        status: "queued",
        progress: 0,
        isPrimary: false,
        alt: "",
      });
    }
    if (problems.length) setNotice(problems[0]);
    if (accepted.length === 0) return;

    commit((prev) => [...prev, ...accepted]);
    const pid = productIdRef.current;
    if (pid) accepted.forEach((item) => enqueue(item.key, pid, item.file as File));
  };

  const retry = (item: Item) => {
    const pid = productIdRef.current;
    if (!pid) {
      setNotice("Save the product first, then retry the upload.");
      return;
    }
    if (item.file) enqueue(item.key, pid, item.file);
  };

  const replace = (item: Item, file: File | undefined) => {
    if (!file || !item.id) return;
    const pid = productIdRef.current;
    if (!pid) return;
    const problem = validateClientFile(file);
    if (problem) {
      setNotice(problem);
      return;
    }
    setNotice(null);
    enqueue(item.key, pid, file, item.id);
  };

  const remove = async (item: Item) => {
    if (item.id) {
      if (!confirm("Delete this photo permanently?")) return;
      setBusy(item.key, true);
      const res = await deleteProductImageAction(item.id);
      setBusy(item.key, false);
      if (!res.success) {
        setNotice(res.error);
        return;
      }
      commit((prev) => {
        const next = prev.filter((i) => i.key !== item.key);
        if (item.isPrimary) {
          const firstDone = next.find((i) => i.id);
          return next.map((i) => ({ ...i, isPrimary: i === firstDone }));
        }
        return next;
      });
    } else {
      if (item.file) URL.revokeObjectURL(item.url);
      commit((prev) => prev.filter((i) => i.key !== item.key));
    }
  };

  const persistOrder = async (next: Item[]) => {
    const pid = productIdRef.current;
    if (!pid) return;
    const ids = next.filter((i) => i.id).map((i) => i.id as string);
    if (ids.length < 2) return;
    const res = await reorderProductImagesAction(pid, ids);
    if (!res.success) setNotice(res.error);
  };

  const reorder = (from: number, to: number) => {
    if (from === to || to < 0 || to >= itemsRef.current.length) return;
    const next = [...itemsRef.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(() => next);
    persistOrder(next);
  };

  const makePrimary = async (item: Item) => {
    if (item.id) {
      setBusy(item.key, true);
      const res = await setPrimaryImageAction(item.id);
      setBusy(item.key, false);
      if (!res.success) {
        setNotice(res.error);
        return;
      }
    }
    commit((prev) => {
      const moved = prev.find((i) => i.key === item.key);
      if (!moved) return prev;
      return [moved, ...prev.filter((i) => i.key !== item.key)].map((i) => ({ ...i, isPrimary: i.key === item.key }));
    });
  };

  const saveAlt = async (item: Item) => {
    if (!item.id) return;
    const res = await updateImageAltTextAction(item.id, item.alt);
    if (!res.success) setNotice(res.error);
  };

  useImperativeHandle(ref, () => ({
    uploadPending: async (pid: string) => {
      const pending = itemsRef.current.filter((i) => i.file && (i.status === "queued" || i.status === "error"));
      const results = await Promise.all(pending.map((i) => enqueue(i.key, pid, i.file as File)));
      return results.every(Boolean);
    },
    count: () => itemsRef.current.length,
  }));

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          if (dragIndex !== null) return; // reordering, not file drop
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (dragIndex !== null) return;
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-5 text-center transition-colors ${
          dragOver ? "border-[#D4AF37] bg-[#D4AF37]/10" : "border-[#333] bg-[#141414] hover:border-[#555]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#F5DE88] text-black text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <UploadCloud className="w-4 h-4" /> {items.length ? "Add More Photos" : "Upload Photos"}
        </button>
        <p className="text-[11px] text-gray-400 mt-2">
          Drag &amp; drop photos here, or choose from your device. JPG, PNG or WebP · up to {MAX_IMAGES_PER_PRODUCT}{" "}
          photos · automatically optimised for fast loading.
        </p>
        {!productId && items.length > 0 && (
          <p className="text-[11px] text-amber-300 mt-1">Photos upload when you save the saree.</p>
        )}
      </div>

      {notice && (
        <div role="alert" className="flex items-start gap-2 text-[11px] text-red-300 bg-red-950/40 border border-red-900 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-red-200 hover:text-white" aria-label="Dismiss message">
            ✕
          </button>
        </div>
      )}

      {/* Thumbnails */}
      {items.length > 0 ? (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map((item, index) => {
            const busy = busyKeys.has(item.key) || item.status === "uploading";
            return (
              <li
                key={item.key}
                draggable={item.status === "done" || item.status === "queued"}
                onDragStart={() => setDragIndex(index)}
                onDragEnd={() => setDragIndex(null)}
                onDragOver={(e) => {
                  if (dragIndex !== null) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (dragIndex === null) return;
                  e.preventDefault();
                  e.stopPropagation();
                  reorder(dragIndex, index);
                  setDragIndex(null);
                }}
                className={`group relative rounded-xl overflow-hidden border bg-[#181818] ${
                  item.isPrimary ? "border-[#D4AF37]" : "border-[#2E2E2E]"
                } ${dragIndex === index ? "opacity-50" : ""}`}
              >
                <div className="relative aspect-[3/4] bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.url} alt={item.alt || "Product photo"} className="w-full h-full object-cover" draggable={false} />

                  {item.isPrimary && (
                    <span className="absolute top-1.5 left-1.5 bg-[#D4AF37] text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                  {index === 0 && !item.isPrimary && !productId && (
                    <span className="absolute top-1.5 left-1.5 bg-[#D4AF37] text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                  {item.status === "queued" && (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-gray-200 text-[9px] uppercase px-2 py-0.5 rounded-full">
                      Ready to upload
                    </span>
                  )}

                  {busy && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 px-4">
                      <Loader2 className="w-5 h-5 text-[#D4AF37] animate-spin" />
                      {item.status === "uploading" && (
                        <div
                          className="w-full h-1.5 bg-white/15 rounded-full overflow-hidden"
                          role="progressbar"
                          aria-valuenow={item.progress}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <div className="h-full bg-[#D4AF37] transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                      )}
                    </div>
                  )}

                  {item.status === "error" && (
                    <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2 p-3 text-center">
                      <AlertCircle className="w-5 h-5 text-red-400" />
                      <p className="text-[10px] text-red-200 leading-snug">{item.error}</p>
                      <button
                        type="button"
                        onClick={() => retry(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4AF37] text-black text-[10px] font-bold"
                      >
                        <RefreshCw className="w-3 h-3" /> Retry
                      </button>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-0.5 p-1.5 bg-[#101010]">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => reorder(index, index - 1)}
                      disabled={index === 0 || busy}
                      aria-label="Move photo earlier"
                      className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => reorder(index, index + 1)}
                      disabled={index === items.length - 1 || busy}
                      aria-label="Move photo later"
                      className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => makePrimary(item)}
                      disabled={busy || item.isPrimary || item.status === "error"}
                      aria-label="Set as primary photo"
                      title="Set as primary"
                      className="p-1.5 text-gray-400 hover:text-[#D4AF37] disabled:opacity-30"
                    >
                      <Star className={`w-3.5 h-3.5 ${item.isPrimary ? "fill-[#D4AF37] text-[#D4AF37]" : ""}`} />
                    </button>
                    {item.id && (
                      <label
                        title="Replace photo"
                        className={`p-1.5 cursor-pointer text-gray-400 hover:text-white ${busy ? "pointer-events-none opacity-30" : ""}`}
                      >
                        <Repeat2 className="w-3.5 h-3.5" />
                        <span className="sr-only">Replace photo</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={(e) => {
                            replace(item, e.target.files?.[0]);
                            e.target.value = "";
                          }}
                        />
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => remove(item)}
                      disabled={busy}
                      aria-label="Delete photo"
                      title="Delete"
                      className="p-1.5 text-gray-400 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.id && (
                  <input
                    type="text"
                    value={item.alt}
                    onChange={(e) => patch(item.key, { alt: e.target.value })}
                    onBlur={() => saveAlt(item)}
                    placeholder="Alt text (describes the photo)"
                    aria-label="Photo alt text"
                    maxLength={200}
                    className="w-full bg-[#0C0C0C] border-t border-[#222] px-2 py-1.5 text-[10px] text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-[#141414]"
                  />
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-1 py-4 text-gray-500 text-[11px]">
          <ImagePlus className="w-5 h-5" />
          No photos yet. At least one photo is required.
        </div>
      )}
    </div>
  );
});
