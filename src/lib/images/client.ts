import {
  ALLOWED_IMAGE_TYPES,
  MAX_RAW_UPLOAD_BYTES,
  MAX_SERVER_UPLOAD_BYTES,
  STORED_MAX_DIMENSION,
} from "@/lib/images/constants";
import type { ProductImageRow } from "@/lib/products/mapper";

export function validateClientFile(file: File): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `"${file.name}" is not a JPG, PNG or WebP image.`;
  }
  if (file.size > MAX_RAW_UPLOAD_BYTES) {
    return `"${file.name}" is larger than ${MAX_RAW_UPLOAD_BYTES / 1024 / 1024} MB.`;
  }
  return null;
}

/**
 * Downscales very large photos and converts to WebP in the browser so uploads are fast on mobile
 * networks. The server re-validates and re-encodes everything, so this is purely an optimisation.
 */
export async function prepareImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be read. Please choose a JPG, PNG or WebP photo.");
  }

  try {
    const scale = Math.min(1, STORED_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const small = file.size <= 1.5 * 1024 * 1024 && scale === 1 && file.type === "image/webp";
    if (small) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.9));
    if (!blob) return file;
    // Keep the original when it is already smaller and within the server limit
    if (blob.size >= file.size && file.size <= MAX_SERVER_UPLOAD_BYTES) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close?.();
  }
}

export type UploadResult = { ok: true; image: ProductImageRow } | { ok: false; error: string };

/** Uploads one image with real byte-level progress. Admin-only endpoint. */
export function uploadProductImage(opts: {
  productId: string;
  file: File;
  replaceImageId?: string;
  onProgress?: (percent: number) => void;
}): Promise<UploadResult> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("productId", opts.productId);
    form.append("file", opts.file);
    if (opts.replaceImageId) form.append("replaceImageId", opts.replaceImageId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/product-images");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error. Check your connection and retry." });
    xhr.ontimeout = () => resolve({ ok: false, error: "The upload timed out. Please retry." });
    xhr.timeout = 120000;
    xhr.onload = () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && json.success) {
          resolve({ ok: true, image: json.image as ProductImageRow });
        } else {
          resolve({ ok: false, error: json.error || "Upload failed. Please retry." });
        }
      } catch {
        resolve({ ok: false, error: "Upload failed. Please retry." });
      }
    };
    xhr.send(form);
  });
}
