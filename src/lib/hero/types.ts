/** What the storefront needs to draw one hero slide. */
export interface HeroBanner {
  id: string;
  imageUrl: string;
  alt: string;
  /** Internal path such as /shop or /category/silk-sarees. */
  linkUrl: string;
  /** Optional call-to-action pill; most uploaded artwork already carries its own text, so this is empty by default. */
  buttonText: string | null;
}

/** Extra fields the admin dashboard shows. */
export interface AdminHeroBanner extends HeroBanner {
  position: number;
  isActive: boolean;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  originalFilename: string | null;
  updatedAt: string;
}
