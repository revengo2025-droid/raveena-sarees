import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter, Poppins } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { StoreLayoutWrapper } from "@/components/StoreLayoutWrapper";
import { getPublicCatalogue } from "@/lib/products/public";
import { SITE } from "@/lib/site";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-button",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

const DESCRIPTION =
  "Shop sarees online from Raveena Sarees. Browse silk, party wear, designer and wedding sarees with secure payment, order tracking and a 7-day return window.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Raveena Sarees | Silk, Party Wear, Designer & Wedding Sarees",
    template: "%s | Raveena Sarees",
  },
  description: DESCRIPTION,
  applicationName: SITE.name,
  authors: [{ name: SITE.name }],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Raveena Sarees",
    description: DESCRIPTION,
    url: SITE.url,
    siteName: SITE.name,
    images: [{ url: `${SITE.url}/images/hero/hero-banner-1.png`, width: 1944, height: 809, alt: "Raveena Sarees collection" }],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Raveena Sarees",
    description: DESCRIPTION,
    images: [`${SITE.url}/images/hero/hero-banner-1.png`],
  },
  robots: { index: true, follow: true },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const catalogue = await getPublicCatalogue();

  return (
    <html lang="en" className={`${playfair.variable} ${inter.variable} ${poppins.variable}`}>
      <head>
        {/* Structured data: Organization + WebSite (with site search). Only real, configured details are included. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "OnlineStore",
                name: SITE.name,
                url: SITE.url,
                logo: `${SITE.url}${SITE.logo}`,
                image: `${SITE.url}${SITE.logo}`,
                email: SITE.email,
                telephone: "+" + SITE.whatsappNumber,
                ...(SITE.legalName && { legalName: SITE.legalName }),
                ...(SITE.address && { address: { "@type": "PostalAddress", streetAddress: SITE.address, addressCountry: "IN" } }),
                contactPoint: [
                  {
                    "@type": "ContactPoint",
                    contactType: "customer support",
                    email: SITE.email,
                    telephone: "+" + SITE.whatsappNumber,
                    areaServed: "IN",
                    availableLanguage: ["en", "hi", "te"],
                  },
                ],
              },
              {
                "@context": "https://schema.org",
                "@type": "WebSite",
                name: SITE.name,
                url: SITE.url,
                potentialAction: {
                  "@type": "SearchAction",
                  target: { "@type": "EntryPoint", urlTemplate: `${SITE.url}/shop?q={search_term_string}` },
                  "query-input": "required name=search_term_string",
                },
              },
            ]),
          }}
        />
      </head>
      <body className="bg-white text-[#222222] min-h-screen flex flex-col antialiased selection:bg-[#C8A24D] selection:text-white relative overflow-x-hidden font-body">
        <AppProvider initialCatalogue={catalogue}>
          <StoreLayoutWrapper>{children}</StoreLayoutWrapper>
        </AppProvider>
      </body>
    </html>
  );
}
