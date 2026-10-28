import { NextRequest, NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, MAX_IMAGE_DIMENSION, MAX_SERVER_UPLOAD_BYTES } from "@/lib/images/constants";
import { HERO_BANNER_BUCKET, HERO_STORED_MAX_WIDTH, HERO_WEBP_QUALITY, MAX_HERO_BANNERS } from "@/lib/hero/constants";
import { mapAdminHeroRow } from "@/lib/hero/mapper";
import { revalidateHeroBanners } from "@/lib/hero/revalidate";
import { checkBannerDimensions, parseBannerFields } from "@/lib/hero/validation";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { log } from "@/lib/security/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SETUP_MESSAGE = "Hero banners are not set up yet. Run migration 010 in Supabase, then try again.";

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

/** Postgres reports a missing table / function as 42P01 / 42883 / PGRST205 / PGRST202 depending on the layer. */
function isMissingSetup(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return ["42P01", "42883", "PGRST205", "PGRST202"].includes(error.code || "") || /homepage_banners.*(does not exist|schema cache)/i.test(error.message || "");
}

async function removeBannerObjects(admin: ReturnType<typeof createAdminClient>, paths: (string | null)[]) {
  const real = paths.filter((p): p is string => Boolean(p));
  if (real.length === 0) return;
  const { error } = await admin.storage.from(HERO_BANNER_BUCKET).remove(real);
  if (error) console.error("[hero-banner] storage remove failed:", error.message);
}

/**
 * POST multipart/form-data: file, [altText], [linkUrl], [buttonText], [replaceId]
 * Admin only. Adds a new banner (max five) or, with replaceId, swaps the picture of an existing one.
 * Every file is re-validated and re-encoded here regardless of what the browser did.
 */
export async function POST(req: NextRequest) {
  // CSRF defence in depth: same-origin requests only
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host;
    } catch {
      /* malformed origin is treated as foreign */
    }
    if (originHost !== req.headers.get("host")) return fail("Cross-origin requests are not allowed.", 403);
  }

  const auth = await requireAdmin({ adminOnly: true });
  if (!auth.ok) return fail(auth.error, auth.status === 401 ? 401 : 403);

  const limit = await rateLimit("adminWrite", auth.userId);
  if (!limit.ok) {
    return NextResponse.json({ success: false, error: "Too many uploads. Please wait a moment." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  // Refuse oversized bodies before they are buffered into memory (multipart overhead allowance: 1 MB)
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_SERVER_UPLOAD_BYTES + 1024 * 1024) return fail("That upload is too large.", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("The upload could not be read. Please try again.", 400);
  }

  const replaceId = form.get("replaceId") ? String(form.get("replaceId")) : null;
  const file = form.get("file");

  if (replaceId && !UUID_RE.test(replaceId)) return fail("Invalid banner.", 400);
  if (!(file instanceof File)) return fail("No image was received.", 400);
  if (file.size === 0) return fail("The selected file is empty.", 400);
  if (file.size > MAX_SERVER_UPLOAD_BYTES) {
    return fail(`Image is too large (max ${MAX_SERVER_UPLOAD_BYTES / 1024 / 1024} MB after compression).`, 413);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (
    !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type) ||
    !(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)
  ) {
    return fail("Only JPG, PNG or WebP images are allowed.", 415);
  }

  // Text fields apply to a new banner; replacing a picture leaves them untouched.
  let fields: { altText: string; linkUrl: string; buttonText: string | null } | null = null;
  if (!replaceId) {
    const parsed = parseBannerFields({ altText: form.get("altText"), linkUrl: form.get("linkUrl"), buttonText: form.get("buttonText") });
    if (!parsed.ok) return fail(parsed.error, 400);
    fields = parsed;
  }

  const admin = createAdminClient();

  const { data: existing, error: listError } = await admin
    .from("homepage_banners")
    .select("id, position, storage_path")
    .order("position", { ascending: true });
  if (listError) {
    if (isMissingSetup(listError)) return fail(SETUP_MESSAGE, 503);
    console.error("[hero-banner] list failed:", listError.message);
    return fail("Could not load the current banners. Please retry.", 500);
  }
  const rows = existing || [];

  const target = replaceId ? rows.find((r) => r.id === replaceId) : null;
  if (replaceId && !target) return fail("That banner no longer exists. Refresh the page.", 404);
  if (!replaceId && rows.length >= MAX_HERO_BANNERS) {
    return fail(`You can have at most ${MAX_HERO_BANNERS} banners. Delete one first.`, 400);
  }

  // Validate real content (magic bytes) and re-encode: strips EXIF/GPS, normalises to WebP.
  let output: { data: Buffer; info: OutputInfo };
  try {
    const input = Buffer.from(await file.arrayBuffer());
    const pixelLimit = MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION;
    const meta = await sharp(input, { limitInputPixels: pixelLimit }).metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format)) {
      return fail("This file is not a valid JPG, PNG or WebP image.", 415);
    }
    // EXIF-rotated phone photos report their sensor size, so measure the oriented dimensions
    const rotated = (meta.orientation || 1) >= 5;
    const w = (rotated ? meta.height : meta.width) || 0;
    const h = (rotated ? meta.width : meta.height) || 0;
    if (Math.max(w, h) > MAX_IMAGE_DIMENSION) {
      return fail(`Image is too large. Maximum ${MAX_IMAGE_DIMENSION}px on a side.`, 422);
    }
    const size = checkBannerDimensions(w, h);
    if (size.error) return fail(size.error, 422);

    output = await sharp(input, { limitInputPixels: pixelLimit })
      .rotate()
      .resize({ width: HERO_STORED_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: HERO_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return fail("This image could not be processed. Try another file.", 422);
  }

  const storagePath = `${randomUUID()}.webp`;
  const { error: uploadError } = await admin.storage.from(HERO_BANNER_BUCKET).upload(storagePath, output.data, {
    contentType: "image/webp",
    cacheControl: "31536000", // unique path => safe to cache for a year
    upsert: false,
  });
  if (uploadError) {
    console.error("[hero-banner] storage error:", uploadError.message);
    const hint = /bucket.*not found/i.test(uploadError.message) ? SETUP_MESSAGE : "Upload to storage failed. Please retry.";
    return fail(hint, /bucket.*not found/i.test(uploadError.message) ? 503 : 502);
  }

  const publicUrl = admin.storage.from(HERO_BANNER_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const imageColumns = {
    storage_path: storagePath,
    public_url: publicUrl,
    width: output.info.width,
    height: output.info.height,
    file_size: output.info.size,
    original_filename: file.name.slice(0, 200),
    updated_by: auth.userId,
  };

  let saved: any;
  if (target) {
    const { data, error } = await admin.from("homepage_banners").update(imageColumns).eq("id", target.id).select().single();
    if (error) {
      await removeBannerObjects(admin, [storagePath]);
      console.error("[hero-banner] db update error:", error.message);
      return fail("Could not save the replacement image.", 500);
    }
    saved = data;
    await removeBannerObjects(admin, [target.storage_path]);
  } else {
    // Positions are kept contiguous 1..n; close any gap before appending so the new banner always goes last.
    if (rows.some((r, i) => r.position !== i + 1)) {
      await admin.rpc("save_homepage_banner_order", { p_ids: rows.map((r) => r.id) });
    }
    const { data, error } = await admin
      .from("homepage_banners")
      .insert({
        ...imageColumns,
        position: rows.length + 1,
        alt_text: fields!.altText,
        link_url: fields!.linkUrl,
        button_text: fields!.buttonText,
        is_active: true,
        created_by: auth.userId,
      })
      .select()
      .single();
    if (error) {
      await removeBannerObjects(admin, [storagePath]);
      if (error.code === "23505") return fail("Another banner was added at the same moment. Refresh the page and try again.", 409);
      if (isMissingSetup(error)) return fail(SETUP_MESSAGE, 503);
      console.error("[hero-banner] db insert error:", error.message);
      return fail("Could not save the banner. Please retry.", 500);
    }
    saved = data;
  }

  revalidateHeroBanners();
  log.info("hero_banner.upload_ok", { banner: saved.id, bytes: output.info.size });
  await audit({ action: "settings.hero_banners", actorId: auth.userId, entityType: "hero_banner", entityId: saved.id, meta: { op: target ? "replace_image" : "create" } });
  return NextResponse.json({ success: true, banner: mapAdminHeroRow(saved) });
}
