import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { StoreLayoutWrapper } from "@/components/StoreLayoutWrapper";

export const metadata: Metadata = {
  title: "Ravina Sarees | Luxury Pure Handloom Silk & Bridal Sarees",
  description:
    "Explore authentic Kanjivaram, Kadwa Banarasi, Tussar, and Bridal Wedding Sarees crafted with pure gold zari. Certified Silk Mark handlooms with complimentary express Pan-India shipping.",
  keywords: [
    "Ravina Sarees",
    "Kanjivaram Silk Sarees",
    "Banarasi Sarees",
    "Pure Zari Sarees",
    "Bridal Sarees India",
    "Handloom Sarees Online",
    "Wedding Sarees",
    "Silk Sarees Online India",
  ],
  authors: [{ name: "Ravina Sarees" }],
  openGraph: {
    title: "Ravina Sarees | Royal Handloom Silks of India",
    description:
      "Timeless handwoven Kanjivaram, Banarasi, and Bridal Wedding Sarees from India's premier silk atelier.",
    url: "https://ravinasarees.in",
    siteName: "Ravina Sarees",
    images: [
      {
        url: "https://ravinasarees.in/images/hero/hero-banner-1.png",
        width: 1200,
        height: 630,
        alt: "Ravina Sarees Royal Silk Collection",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Structured Schema Markup (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ClothingStore",
              name: "Ravina Sarees",
              image: "https://ravinasarees.in/images/hero/hero-banner-1.png",
              url: "https://ravinasarees.in",
              telephone: "+91-8688472300",
              email: "ravieenasarees@gmail.com",
              priceRange: "₹₹₹₹",
              address: {
                "@type": "PostalAddress",
                streetAddress: "Marthadi, Bejjur",
                addressLocality: "Komaram Bheem Asifabad",
                addressRegion: "Telangana",
                postalCode: "504224",
                addressCountry: "IN",
              },
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "00:00",
                  closes: "23:59",
                },
              ],
            }),
          }}
        />
      </head>
      <body className="bg-white text-[#222222] min-h-screen flex flex-col antialiased selection:bg-[#C8A24D] selection:text-white relative overflow-x-hidden">
        <AppProvider>
          <StoreLayoutWrapper>{children}</StoreLayoutWrapper>
        </AppProvider>
      </body>
    </html>
  );
}
