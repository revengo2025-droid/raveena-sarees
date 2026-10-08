import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { getSeoCategoryBySlug } from "@/lib/seo/catalogue";

// `params` is a Promise in Next 15 (awaiting a plain object also works on Next 14)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = getSeoCategoryBySlug(slug);
  if (!category) return { title: "Sarees", alternates: { canonical: `/category/${slug}` } };
  const description = category.description?.slice(0, 160) || `Browse ${category.name} at ${SITE.name}.`;
  return {
    title: category.name,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    openGraph: { title: `${category.name} | ${SITE.name}`, description, url: `${SITE.url}/category/${category.slug}`, type: "website", locale: "en_IN" },
  };
}

export default function CategoryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
