import { NextRequest, NextResponse } from "next/server";
import sharp, { type OutputInfo } from "sharp";
import { randomUUID } from "crypto";
import { requireAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGES_PER_PRODUCT,
  MAX_SERVER_UPLOAD_BYTES,
  MIN_IMAGE_DIMENSION,
  PRODUCT_IMAGE_BUCKET,
  STORED_MAX_DIMENSION,
  STORED_WEBP_QUALITY,
} from "@/lib/images/constants";
import { mapImageRow } from "@/lib/products/mapper";
import { removeStorageObjects, syncProductImages } from "@/lib/products/images";
import { rateLimit } from "@/lib/security/rate-limit";
import { audit } from "@/lib/security/audit";
import { log } from "@/lib/security/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * POST multipart/form-data: productId, file, [replaceImageId], [altText]
 * Admin only. Every file is re-validated and re-encoded here regardless of what the browser did.
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

  const auth = await requireAdmin();
  if (!auth.ok) return fail(auth.error, auth.error.startsWith("Please sign in") ? 401 : 403);

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

  const productId = String(form.get("productId") || "");
  const replaceImageId = form.get("replaceImageId") ? String(form.get("replaceImageId")) : null;
  const altInput = form.get("altText") ? String(form.get("altText")).slice(0, 200) : null;
  const file = form.get("file");

  if (!UUID_RE.test(productId)) return fail("Invalid product.", 400);
  if (replaceImageId && !UUID_RE.test(replaceImageId)) return fail("Invalid image.", 400);
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

  const admin = createAdminClient();

  const { data: product } = await admin.from("products").select("id, name").eq("id", productId).maybeSingle();
  if (!product) return fail("Product not found. Save the product first.", 404);

  const { data: existing } = await admin
    .from("product_images")
    .select("id, storage_path, is_primary, display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });
  const rows = existing || [];

  const target = replaceImageId ? rows.find((r) => r.id === replaceImageId) : null;
  if (replaceImageId && !target) return fail("Image to replace was not found.", 404);
  if (!replaceImageId && rows.length >= MAX_IMAGES_PER_PRODUCT) {
    return fail(`A product can have at most ${MAX_IMAGES_PER_PRODUCT} photos.`, 400);
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
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (Math.min(w, h) < MIN_IMAGE_DIMENSION) {
      return fail(`Image is too small. Minimum ${MIN_IMAGE_DIMENSION}px on each side.`, 422);
    }
    if (Math.max(w, h) > MAX_IMAGE_DIMENSION) {
      return fail(`Image is too large. Maximum ${MAX_IMAGE_DIMENSION}px on a side.`, 422);
    }
    output = await sharp(input, { limitInputPixels: pixelLimit })
      .rotate()
      .resize({ width: STORED_MAX_DIMENSION, height: STORED_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: STORED_WEBP_QUALITY, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return fail("This image could not be processed. Try another file.", 422);
  }

  const imageId = randomUUID();
  const storagePath = `${productId}/${imageId}.webp`;

  const { error: uploadError } = await admin.storage.from(PRODUCT_IMAGE_BUCKET).upload(storagePath, output.data, {
    contentType: "image/webp",
    cacheControl: "31536000", // unique path => safe to cache for a year
    upsert: false,
  });
  if (uploadError) {
    console.error("[image-upload] storage error:", uploadError.message);
    return fail("Upload to storage failed. Please retry.", 502);
  }

  const publicUrl = admin.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  const base = {
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: "image/webp",
    file_size: output.info.size,
    width: output.info.width,
    height: output.info.height,
    original_filename: file.name.slice(0, 200),
  };

  let saved: any;
  if (target) {
    const { data, error } = await admin
      .from("product_images")
      .update({ ...base, ...(altInput !== null && { alt_text: altInput }) })
      .eq("id", target.id)
      .select()
      .single();
    if (error) {
      await removeStorageObjects(admin, [storagePath]);
      console.error("[image-upload] db update error:", error.message);
      return fail("Could not save the replacement image.", 500);
    }
    saved = data;
    await removeStorageObjects(admin, [target.storage_path]);
  } else {
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.display_order)) + 1 : 0;
    const { data, error } = await admin
      .from("product_images")
      .insert({
        product_id: productId,
        ...base,
        alt_text: altInput || `${product.name} - photo ${rows.length + 1}`,
        display_order: nextOrder,
        is_primary: !rows.some((r) => r.is_primary),
      })
      .select()
      .single();
    if (error) {
      await removeStorageObjects(admin, [storagePath]);
      console.error("[image-upload] db insert error:", error.message);
      return fail("Could not save the image record.", 500);
    }
    saved = data;
  }

  await syncProductImages(admin, productId);
  log.info("image_upload.ok", { product: productId, image: saved.id, bytes: output.info.size });
  await audit({ action: "product.images_changed", actorId: auth.userId, entityType: "product", entityId: productId, meta: { image: saved.id, replaced: Boolean(target) } });
  return NextResponse.json({ success: true, image: mapImageRow(saved) });
}
