import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE } from "@/lib/site";
import { absoluteUrl, getSeoCategoryBySlug, getSeoProductBySlug } from "@/lib/seo/catalogue";

type Props = { params: Promise<{ slug: string }>; children: React.ReactNode };

const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n - 1).trimEnd()}…` : text);

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getSeoProductBySlug(slug);
  if (!product) return { title: "Saree not found", robots: { index: false } };

  const image = product.images[0] ? absoluteUrl(SITE.url, product.images[0]) : undefined;
  const description = clip(product.description.replace(/\s+/g, " "), 160);
  return {
    title: product.name,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      url: `${SITE.url}/product/${product.slug}`,
      siteName: SITE.name,
      type: "website",
      locale: "en_IN",
      ...(image && { images: [{ url: image, alt: product.name }] }),
    },
    twitter: { card: "summary_large_image", title: product.name, description, ...(image && { images: [image] }) },
  };
}

export default async function ProductLayout({ params, children }: Props) {
  const { slug } = await params;
  const product = await getSeoProductBySlug(slug);
  if (!product) notFound();

  const url = `${SITE.url}/product/${product.slug}`;
  const category = getSeoCategoryBySlug(
    product.categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  );

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((i) => absoluteUrl(SITE.url, i)),
    brand: { "@type": "Brand", name: SITE.name },
    category: product.categoryName,
    material: product.fabric,
    color: product.primaryColor,
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      price: product.discountPrice || product.price,
      itemCondition: "https://schema.org/NewCondition",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE.name },
    },
    // Only real, verified reviews are ever published in structured data
    ...(product.reviewCount > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: product.rating,
        reviewCount: product.reviewCount,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE.url },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${SITE.url}/shop` },
      ...(category ? [{ "@type": "ListItem", position: 3, name: category.name, item: `${SITE.url}/category/${category.slug}` }] : []),
      { "@type": "ListItem", position: category ? 4 : 3, name: product.name, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {children}
    </>
  );
}
