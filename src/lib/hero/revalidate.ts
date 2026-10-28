import { revalidatePath, revalidateTag } from "next/cache";

/** Makes the homepage pick up banner changes immediately instead of waiting for the cache to expire. */
export function revalidateHeroBanners() {
  try {
    revalidateTag("hero-banners");
    revalidatePath("/");
  } catch {
    // Not in a request scope (e.g. scripts); safe to ignore.
  }
}
