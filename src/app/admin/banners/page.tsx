"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ExternalLink,
  ImagePlus,
  Images,
  Loader2,
  Monitor,
  Pencil,
  Repeat2,
  Smartphone,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import {
  deleteHeroBannerAction,
  getHeroBannersAdminAction,
  moveHeroBannerAction,
  updateHeroBannerAction,
} from "@/app/actions/hero-banners";
import { DEFAULT_HERO_BANNERS } from "@/lib/hero/defaults";
import { isRenderableBannerUrl } from "@/lib/hero/mapper";
import { formatBytes, readImageSize, uploadHeroBanner } from "@/lib/hero/client";
import { checkBannerDimensions, parseBannerFields } from "@/lib/hero/validation";
import {
  HERO_ALT_MAX,
  HERO_BUTTON_MAX,
  HERO_DEFAULT_ALT,
  HERO_DEFAULT_LINK,
  HERO_RECOMMENDED_HEIGHT,
  HERO_RECOMMENDED_WIDTH,
  MAX_HERO_BANNERS,
} from "@/lib/hero/constants";
import type { AdminHeroBanner, HeroBanner } from "@/lib/hero/types";
import { prepareImage, validateClientFile } from "@/lib/images/client";

const input = "w-full bg-adm-raised border border-adm-line2 rounded-xl px-3.5 py-2.5 text-adm-strong text-xs focus:outline-none focus:border-adm-gold transition-colors";
const label = "text-[10px] uppercase text-adm-muted font-bold tracking-wider block mb-1.5";
const ghostBtn = "inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-lg bg-adm-raised hover:bg-adm-hover text-xs text-adm-text disabled:opacity-40 disabled:pointer-events-none transition-colors";
const goldBtn =
  "inline-flex items-center justify-center gap-2 px-5 min-h-[40px] rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#AA820A] text-black text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:pointer-events-none";

const CUSTOM = "__custom__";

/** Where a banner can send visitors: the shop, each collection, or any page on this site. */
function LinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { categories } = useApp();
  const options = useMemo(
    () => [{ value: "/shop", text: "All sarees (/shop)" }, ...categories.map((c) => ({ value: `/category/${c.slug}`, text: `${c.name} collection` }))],
    [categories]
  );
  const known = options.some((o) => o.value === value);
  const [custom, setCustom] = useState(!known);
  const selected = custom ? CUSTOM : value;

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className={input}
        aria-label="Where the banner links to"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
        <option value={CUSTOM}>Another page on this site…</option>
      </select>
      {custom && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/shop?sort=newest"
          maxLength={200}
          className={input}
          aria-label="Custom page link"
        />
      )}
    </div>
  );
}

/** The storefront hero drawn at desktop or phone width, using the exact component visitors see. */
function PreviewFrame({ banners, device }: { banners: HeroBanner[]; device: "desktop" | "mobile" }) {
  if (device === "mobile") {
    return (
      <div className="mx-auto w-full max-w-[380px] rounded-[28px] border-[6px] border-adm-line2 bg-white overflow-hidden shadow-lg">
        <div className="h-5 bg-neutral-100 flex items-center justify-center">
          <span className="h-1 w-12 rounded-full bg-neutral-300" />
        </div>
        <HeroCarousel banners={banners} variant="mobile" preview />
        <div className="h-24 bg-gradient-to-b from-neutral-50 to-white px-4 pt-4 space-y-2" aria-hidden="true">
          <div className="h-2.5 w-2/3 rounded bg-neutral-200" />
          <div className="h-2.5 w-1/2 rounded bg-neutral-100" />
        </div>
      </div>
    );
  }
  return (
    <div className="w-full rounded-xl border border-adm-line2 bg-white overflow-hidden shadow-lg">
      <div className="h-7 bg-neutral-100 flex items-center gap-1.5 px-3" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-red-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        <span className="ml-3 h-3.5 flex-1 max-w-xs rounded bg-white/80" />
      </div>
      <HeroCarousel banners={banners} variant="desktop" preview />
    </div>
  );
}

interface Draft {
  file: File;
  url: string;
  width: number;
  height: number;
  warning?: string;
}

export default function AdminHeroBannersPage() {
  const { showToast } = useApp();

  const [banners, setBanners] = useState<AdminHeroBanner[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add-banner form
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState(HERO_DEFAULT_LINK);
  const [button, setButton] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replaceTarget = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await getHeroBannersAdminAction();
    if (!res.success) {
      setError(res.error);
      setBanners((prev) => prev ?? []);
      return;
    }
    setError(null);
    setBanners(res.banners);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Release the temporary preview address when it is replaced or the page closes
  useEffect(() => {
    if (!draft) return;
    const url = draft.url;
    return () => URL.revokeObjectURL(url);
  }, [draft]);

  const full = (banners?.length ?? 0) >= MAX_HERO_BANNERS;
  const active = useMemo(() => (banners || []).filter((b) => b.isActive && isRenderableBannerUrl(b.imageUrl)), [banners]);
  const usingDefaults = banners !== null && active.length === 0;
  const previewBanners: HeroBanner[] = usingDefaults ? DEFAULT_HERO_BANNERS : active;

  // Checks a chosen file in the browser and returns it ready to upload (compressed, size verified)
  const prepare = async (file: File): Promise<{ ok: true; file: File; width: number; height: number; warning?: string } | { ok: false; error: string }> => {
    const invalid = validateClientFile(file);
    if (invalid) return { ok: false, error: invalid };
    try {
      const ready = await prepareImage(file);
      const { width, height } = await readImageSize(ready);
      const check = checkBannerDimensions(width, height);
      if (check.error) return { ok: false, error: check.error };
      return { ok: true, file: ready, width, height, warning: check.warning };
    } catch (e: any) {
      return { ok: false, error: e?.message || "This image could not be read." };
    }
  };

  const pickFile = async (file: File | undefined | null) => {
    if (!file) return;
    setPickError(null);
    const res = await prepare(file);
    if (!res.ok) {
      setPickError(res.error);
      return;
    }
    setDraft({ file: res.file, url: URL.createObjectURL(res.file), width: res.width, height: res.height, warning: res.warning });
  };

  const resetDraft = () => {
    setDraft(null);
    setPickError(null);
    setAlt("");
    setLink(HERO_DEFAULT_LINK);
    setButton("");
    setProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  };

  const publish = async () => {
    if (!draft || uploading) return;
    const fields = parseBannerFields({ altText: alt, linkUrl: link, buttonText: button });
    if (!fields.ok) {
      showToast(fields.error, "error");
      return;
    }
    setUploading(true);
    setProgress(0);
    const res = await uploadHeroBanner({ file: draft.file, altText: alt, linkUrl: link, buttonText: button, onProgress: setProgress });
    setUploading(false);
    if (!res.ok) {
      showToast(res.error, "error");
      return;
    }
    showToast("Banner published. It is live on the homepage now.", "success");
    resetDraft();
    await load();
  };

  const replaceImage = async (id: string, file: File | undefined | null) => {
    if (!file) return;
    setBusyId(id);
    try {
      const res = await prepare(file);
      if (!res.ok) {
        showToast(res.error, "error");
        return;
      }
      if (res.warning) showToast(res.warning, "info");
      const up = await uploadHeroBanner({ file: res.file, replaceId: id });
      if (!up.ok) {
        showToast(up.error, "error");
        return;
      }
      showToast("Picture replaced. It is live on the homepage now.", "success");
      await load();
    } finally {
      setBusyId(null);
      if (replaceInput.current) replaceInput.current.value = "";
    }
  };

  const toggle = async (b: AdminHeroBanner) => {
    setBusyId(b.id);
    const res = await updateHeroBannerAction(b.id, { altText: b.alt, linkUrl: b.linkUrl, buttonText: b.buttonText || "", isActive: !b.isActive });
    setBusyId(null);
    if (!res.success) return showToast(res.error, "error");
    showToast(b.isActive ? "Banner hidden from the homepage." : "Banner is live on the homepage.", "success");
    await load();
  };

  const move = async (b: AdminHeroBanner, direction: "up" | "down") => {
    setBusyId(b.id);
    const res = await moveHeroBannerAction(b.id, direction);
    setBusyId(null);
    if (!res.success) return showToast(res.error, "error");
    await load();
  };

  const remove = async (b: AdminHeroBanner) => {
    setBusyId(b.id);
    const res = await deleteHeroBannerAction(b.id);
    setBusyId(null);
    setConfirmDeleteId(null);
    if (!res.success) return showToast(res.error, "error");
    showToast("Banner deleted.", "success");
    await load();
  };

  return (
    <div className="space-y-8 font-sans max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-adm-line pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif text-adm-strong font-normal flex items-center gap-3">
            <Images className="w-7 h-7 text-adm-gold" aria-hidden="true" /> Hero Banners
          </h1>
          <p className="text-xs text-adm-muted mt-1 max-w-2xl">
            Upload up to {MAX_HERO_BANNERS} banners for the top of the homepage. They rotate in the order shown below, and every change goes live as soon as you
            save it.
          </p>
        </div>
        <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 text-xs text-adm-gold hover:underline self-start sm:self-auto">
          View homepage <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {banners === null && (
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

      {banners !== null && !error && (
        <>
          {/* LIVE PREVIEW */}
          <section aria-labelledby="preview-heading" className="bg-adm-surface border border-adm-line rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="preview-heading" className="text-sm font-semibold text-adm-strong">
                  Live preview
                </h2>
                <p className="text-[11px] text-adm-muted mt-0.5">
                  {usingDefaults
                    ? "No uploaded banner is showing, so visitors see the built-in default banners."
                    : `Exactly what visitors see: ${active.length} active ${active.length === 1 ? "banner" : "banners"}, in this order.`}
                </p>
              </div>
              <div role="group" aria-label="Preview device" className="inline-flex rounded-xl bg-adm-raised p-1">
                {(
                  [
                    ["desktop", "Desktop", Monitor],
                    ["mobile", "Mobile", Smartphone],
                  ] as const
                ).map(([key, text, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setDevice(key)}
                    aria-pressed={device === key}
                    className={`inline-flex items-center gap-1.5 px-3.5 min-h-[34px] rounded-lg text-xs font-semibold transition-colors ${
                      device === key ? "bg-adm-gold text-black" : "text-adm-muted hover:text-adm-strong"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {text}
                  </button>
                ))}
              </div>
            </div>
            <PreviewFrame banners={previewBanners} device={device} />
          </section>

          {/* BANNER LIST */}
          <section aria-labelledby="list-heading" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="list-heading" className="text-sm font-semibold text-adm-strong">
                Your banners <span className="text-adm-muted font-normal">({banners.length} of {MAX_HERO_BANNERS})</span>
              </h2>
            </div>

            {banners.length === 0 && (
              <div className="bg-adm-surface border border-dashed border-adm-line2 rounded-2xl p-8 text-center text-sm text-adm-muted">
                You have not uploaded any banners yet. Add your first one below.
              </div>
            )}

            <input
              ref={replaceInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Choose a replacement picture"
              onChange={(e) => replaceTarget.current && replaceImage(replaceTarget.current, e.target.files?.[0])}
            />

            <ul className="space-y-4">
              {banners.map((b, i) => {
                const busy = busyId === b.id;
                const editing = editingId === b.id;
                return (
                  <li key={b.id} className={`bg-adm-surface border rounded-2xl overflow-hidden ${b.isActive ? "border-adm-line" : "border-adm-line opacity-80"}`}>
                    <div className="flex flex-col md:flex-row">
                      <div className="relative md:w-[340px] shrink-0 bg-adm-raised">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b.imageUrl} alt={b.alt} className="w-full aspect-[2.4/1] object-cover" loading="lazy" />
                        <span className="absolute top-2 left-2 rounded-full bg-black/70 text-white text-[10px] font-bold px-2.5 py-1">#{b.position}</span>
                        <span
                          className={`absolute top-2 right-2 rounded-full text-[10px] font-bold px-2.5 py-1 ${b.isActive ? "bg-emerald-600 text-white" : "bg-neutral-700 text-white"}`}
                        >
                          {b.isActive ? "Live" : "Hidden"}
                        </span>
                        {busy && (
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </span>
                        )}
                      </div>

                      <div className="flex-1 p-4 sm:p-5 space-y-3 min-w-0">
                        {editing ? (
                          <EditForm
                            banner={b}
                            onCancel={() => setEditingId(null)}
                            onSaved={async () => {
                              setEditingId(null);
                              await load();
                            }}
                          />
                        ) : (
                          <>
                            <div className="space-y-1 text-xs">
                              <p className="text-adm-strong font-semibold truncate">{b.alt || HERO_DEFAULT_ALT}</p>
                              <p className="text-adm-muted truncate">
                                Links to <span className="text-adm-text">{b.linkUrl}</span>
                                {b.buttonText && <> · Button: “{b.buttonText}”</>}
                              </p>
                              <p className="text-adm-faint">
                                {b.width && b.height ? `${b.width}×${b.height}px` : ""} {b.fileSize ? `· ${formatBytes(b.fileSize)}` : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button type="button" className={ghostBtn} disabled={busy || i === 0} onClick={() => move(b, "up")} aria-label={`Move banner ${b.position} earlier`}>
                                <ArrowUp className="w-3.5 h-3.5" /> Earlier
                              </button>
                              <button
                                type="button"
                                className={ghostBtn}
                                disabled={busy || i === banners.length - 1}
                                onClick={() => move(b, "down")}
                                aria-label={`Move banner ${b.position} later`}
                              >
                                <ArrowDown className="w-3.5 h-3.5" /> Later
                              </button>
                              <button type="button" className={ghostBtn} disabled={busy} onClick={() => toggle(b)}>
                                {b.isActive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} {b.isActive ? "Hide" : "Show"}
                              </button>
                              <button type="button" className={ghostBtn} disabled={busy} onClick={() => setEditingId(b.id)}>
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                type="button"
                                className={ghostBtn}
                                disabled={busy}
                                onClick={() => {
                                  replaceTarget.current = b.id;
                                  replaceInput.current?.click();
                                }}
                              >
                                <Repeat2 className="w-3.5 h-3.5" /> Replace picture
                              </button>
                              {confirmDeleteId === b.id ? (
                                <span className="inline-flex items-center gap-2 rounded-lg bg-adm-danger/15 px-3 min-h-[36px] text-xs text-adm-danger">
                                  Delete this banner?
                                  <button type="button" onClick={() => remove(b)} disabled={busy} className="font-bold underline">
                                    Yes, delete
                                  </button>
                                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="underline">
                                    Cancel
                                  </button>
                                </span>
                              ) : (
                                <button type="button" className={`${ghostBtn} !text-adm-danger`} disabled={busy} onClick={() => setConfirmDeleteId(b.id)}>
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ADD A BANNER */}
          <section aria-labelledby="add-heading" className="bg-adm-surface border border-adm-line rounded-2xl p-5 sm:p-6 space-y-5">
            <div>
              <h2 id="add-heading" className="text-sm font-semibold text-adm-strong flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-adm-gold" /> Add a banner
              </h2>
              <p className="text-[11px] text-adm-muted mt-1">
                Best size: <strong className="text-adm-text">{HERO_RECOMMENDED_WIDTH} × {HERO_RECOMMENDED_HEIGHT} pixels</strong> (wide, 2.4 : 1). JPG, PNG or WebP. Pictures are
                optimised automatically, so large files are fine. Keep important text away from the edges: phones show a narrower area.
              </p>
            </div>

            {full ? (
              <div className="rounded-xl bg-adm-warn/10 border border-adm-warn/30 p-4 text-xs text-adm-warn">
                You already have {MAX_HERO_BANNERS} banners, which is the maximum. Delete or replace one to add a new picture.
              </div>
            ) : !draft ? (
              <>
                <label
                  htmlFor="banner-file"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    pickFile(e.dataTransfer.files?.[0]);
                  }}
                  className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
                    dragging ? "border-adm-gold bg-adm-gold/10" : "border-adm-line2 hover:border-adm-gold/70"
                  }`}
                >
                  <Upload className="w-7 h-7 text-adm-gold" aria-hidden="true" />
                  <span className="text-sm text-adm-strong font-semibold">Choose a banner picture</span>
                  <span className="text-xs text-adm-muted">or drag and drop it here</span>
                </label>
                <input id="banner-file" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
              </>
            ) : (
              <div className="space-y-5">
                <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-adm-muted">
                      <span>Preview before publishing</span>
                      <span className="text-adm-faint">· {draft.width}×{draft.height}px · {formatBytes(draft.file.size)}</span>
                    </div>
                    <PreviewFrame
                      device={device}
                      banners={[{ id: "draft", imageUrl: draft.url, alt: alt || HERO_DEFAULT_ALT, linkUrl: link || HERO_DEFAULT_LINK, buttonText: button.trim() || null }]}
                    />
                    <div role="group" aria-label="Preview device" className="inline-flex rounded-xl bg-adm-raised p-1">
                      {(
                        [
                          ["desktop", "Desktop", Monitor],
                          ["mobile", "Mobile", Smartphone],
                        ] as const
                      ).map(([key, text, Icon]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDevice(key)}
                          aria-pressed={device === key}
                          className={`inline-flex items-center gap-1.5 px-3 min-h-[32px] rounded-lg text-xs font-semibold ${device === key ? "bg-adm-gold text-black" : "text-adm-muted"}`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {text}
                        </button>
                      ))}
                    </div>
                    {draft.warning && (
                      <div role="status" className="flex items-start gap-2 rounded-xl bg-adm-warn/10 border border-adm-warn/30 p-3 text-[11px] text-adm-warn">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {draft.warning}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label htmlFor="banner-alt" className={label}>
                        Short description (for accessibility and search)
                      </label>
                      <input id="banner-alt" type="text" value={alt} maxLength={HERO_ALT_MAX} onChange={(e) => setAlt(e.target.value)} placeholder={HERO_DEFAULT_ALT} className={input} />
                    </div>
                    <div>
                      <span className={label}>When visitors click it, open</span>
                      <LinkField value={link} onChange={setLink} />
                    </div>
                    <div>
                      <label htmlFor="banner-button" className={label}>
                        Button text on desktop (optional)
                      </label>
                      <input
                        id="banner-button"
                        type="text"
                        value={button}
                        maxLength={HERO_BUTTON_MAX}
                        onChange={(e) => setButton(e.target.value)}
                        placeholder="Leave empty if your picture already has a button"
                        className={input}
                      />
                    </div>

                    {uploading && (
                      <div aria-live="polite" className="space-y-1.5">
                        <div className="h-1.5 rounded-full bg-adm-raised overflow-hidden">
                          <div className="h-full bg-adm-gold transition-[width] duration-200" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[11px] text-adm-muted">{progress < 100 ? `Uploading… ${progress}%` : "Processing the picture…"}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" onClick={publish} disabled={uploading} className={goldBtn}>
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Upload &amp; publish
                      </button>
                      <button type="button" onClick={resetDraft} disabled={uploading} className={ghostBtn}>
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {pickError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl bg-adm-danger/15 border border-adm-danger/40 p-3 text-xs text-adm-danger">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> {pickError}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/** Inline editor for a banner's description, link and button text. The picture is changed with "Replace picture". */
function EditForm({ banner, onCancel, onSaved }: { banner: AdminHeroBanner; onCancel: () => void; onSaved: () => Promise<void> }) {
  const { showToast } = useApp();
  const [alt, setAlt] = useState(banner.alt);
  const [link, setLink] = useState(banner.linkUrl);
  const [button, setButton] = useState(banner.buttonText || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const fields = parseBannerFields({ altText: alt, linkUrl: link, buttonText: button });
    if (!fields.ok) return showToast(fields.error, "error");
    setSaving(true);
    const res = await updateHeroBannerAction(banner.id, { altText: alt, linkUrl: link, buttonText: button, isActive: banner.isActive });
    setSaving(false);
    if (!res.success) return showToast(res.error, "error");
    showToast("Banner updated. It is live on the homepage now.", "success");
    await onSaved();
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`alt-${banner.id}`} className={label}>
          Short description
        </label>
        <input id={`alt-${banner.id}`} type="text" value={alt} maxLength={HERO_ALT_MAX} onChange={(e) => setAlt(e.target.value)} className={input} />
      </div>
      <div>
        <span className={label}>When visitors click it, open</span>
        <LinkField value={link} onChange={setLink} />
      </div>
      <div>
        <label htmlFor={`btn-${banner.id}`} className={label}>
          Button text on desktop (optional)
        </label>
        <input id={`btn-${banner.id}`} type="text" value={button} maxLength={HERO_BUTTON_MAX} onChange={(e) => setButton(e.target.value)} className={input} />
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={save} disabled={saving} className={goldBtn}>
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save changes
        </button>
        <button type="button" onClick={onCancel} disabled={saving} className={ghostBtn}>
          Cancel
        </button>
      </div>
    </div>
  );
}
