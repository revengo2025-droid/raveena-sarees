// Browser-side helpers for the Hero Banners dashboard. The server re-validates everything: this is for speed and
// for telling the admin what is wrong before a large file is sent.
import type { AdminHeroBanner } from "./types";

/** Reads the real (EXIF-corrected) pixel size of an image file. */
export async function readImageSize(file: File): Promise<{ width: number; height: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("This image could not be read. Please choose a JPG, PNG or WebP picture.");
  }
  const size = { width: bitmap.width, height: bitmap.height };
  bitmap.close?.();
  return size;
}

export type BannerUploadResult = { ok: true; banner: AdminHeroBanner } | { ok: false; error: string };

/** Uploads one banner image with real byte-level progress. Admin-only endpoint. */
export function uploadHeroBanner(opts: {
  file: File;
  altText?: string;
  linkUrl?: string;
  buttonText?: string;
  /** Replace the picture of this banner instead of adding a new one. */
  replaceId?: string;
  onProgress?: (percent: number) => void;
}): Promise<BannerUploadResult> {
  return new Promise((resolve) => {
    const form = new FormData();
    form.append("file", opts.file);
    if (opts.replaceId) {
      form.append("replaceId", opts.replaceId);
    } else {
      form.append("altText", opts.altText || "");
      form.append("linkUrl", opts.linkUrl || "");
      form.append("buttonText", opts.buttonText || "");
    }

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/hero-banners");
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
          resolve({ ok: true, banner: json.banner as AdminHeroBanner });
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

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
