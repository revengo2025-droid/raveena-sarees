export const PRODUCT_IMAGE_BUCKET = "product-images";
export const MAX_IMAGES_PER_PRODUCT = 10;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;
/** Largest raw file the browser will accept before compressing. */
export const MAX_RAW_UPLOAD_BYTES = 20 * 1024 * 1024;
/** Largest request body the server will accept (the browser compresses first). */
export const MAX_SERVER_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MIN_IMAGE_DIMENSION = 400;
export const MAX_IMAGE_DIMENSION = 12000;
/** Long side of the stored image; keeps zari / weave detail crisp. */
export const STORED_MAX_DIMENSION = 2400;
export const STORED_WEBP_QUALITY = 88;
