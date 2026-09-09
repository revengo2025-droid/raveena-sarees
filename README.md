# 👑 Ravina Sarees - Luxury E-Commerce Web Platform

> **Authentic Handloom & Royal Silk Sarees Atelier — Hyderabad, India**  
> Official Domain: [ravinasarees.in](https://ravinasarees.in)

---

## 🌟 Brand & Overview

**Ravina Sarees** is a high-fashion, luxury e-commerce web platform exclusively dedicated to authentic Indian handloom sarees. Mastercrafted with pure mulberry silk, tested gold and silver zari, and centuries of artisan weaving heritage from Kanchipuram, Varanasi, Hyderabad, and Chanderi.

### 🎨 Luxury Black & Gold Design System
* **Primary Canvas:** Deep Black (`#050505`) & Royal Charcoal (`#0E0E0E`, `#161616`)
* **Accents:** Royal Luxury Gold (`#D4AF37`), Soft Sunlight Gold (`#F5DE88`), Antique Gold (`#AA820A`)
* **Highlights:** Royal Crimson / Maroon (`#6B1D2F`) & Ivory Silk (`#FAF8F5`)
* **Typography:** *Cormorant Garamond* / *Playfair Display* (Headings) & *Inter* (Body)
* **Micro-interactions:** Smooth image zoom lens, slide-over royal cart drawer, quick view modal, floating WhatsApp concierge, and celebration confetti.

---

## 🚀 Key Features

### 🛍️ 1. Storefront & Catalog Experience
* **Hero Carousel:** Full-width promotional banners with gold CTA buttons and festive announcements.
* **Shop by Category:** Kanjivaram, Banarasi, Wedding/Bridal, Silk, Party Wear, Cotton, and Designer Sarees.
* **Multi-Faceted Filtering & Sorting:**
  * Multi-category selection
  * Fabric filter (Mulberry Silk, Katan, Tussar, Organza, Cotton Silk, Georgette)
  * Occasions (Bridal/Wedding, Grand Festive, Evening Party, Reception, Daily Classic)
  * Real-time price range slider (₹5,000 to ₹55,000+)
  * Royal color palette swatch filter
  * Sorting: Featured, Best Sellers, New Drops, Price (Low-High / High-Low), Customer Rating
* **Product Details Page (PDP):**
  * Multi-image high-resolution gallery with hover zoom
  * Silk Mark India & Handloom certification tags
  * Fabric & Zari technique breakdown
  * Unstitched blouse piece specifications (0.8m included)
  * Indian PIN Code delivery estimator (Same/Next day for Hyderabad, 2-3 days Metros)
  * Certified Customer Reviews with Star Rating submission form
  * Related Sarees & Recently Viewed tracker

### 💳 2. Shopping Bag & Razorpay Checkout Flow
* **Slide-over Cart Drawer:** Instant bag updates, free shipping progress bar (Target ₹5,000), promo voucher validation (`RAVINA10`, `BRIDAL2026`, `FIRSTBUY`, `FESTIVE500`).
* **Luxury Bridal Gift Box:** Optional velvet packaging and custom calligraphy greeting note (+₹150).
* **Multi-step Checkout:**
  * Contact & Saved Delivery Address selector / New Address form with Indian state validation
  * Interactive Payment Gateway Simulator (Razorpay, UPI QR Scan, Credit/Debit Cards, NetBanking, COD)
  * Order Confirmation Screen with celebration confetti, tracking timeline, and printable/downloadable official Tax Invoice.

### 👤 3. Patron Customer Portal
* Customer Profile & Sign In / Register / Password Reset
* Saved Address Book (Add, Edit, Delete, Default tags)
* Order History with live status pills
* Step-by-step Visual Shipment Tracking Timeline (BlueDart Air Express integration)
* Royal Wishlist with 1-click "Move to Bag"

### 🛡️ 4. Executive Admin Management Suite (`/admin`)
* **Overview:** Gross revenue KPIs, average order value, low stock warnings, sales revenue charts.
* **Product Management (CRUD):** Add new saree with multi-image URLs, SKU, category, prices, stock, fabric specs, and promotional badges.
* **Category Management:** Manage categories, slugs, descriptions, and banners.
* **Order Fulfillment:** Live status updates (Confirmed, Processing, Shipped, Delivered), BlueDart AWB tracking updates, and invoice printing.
* **Customer Directory:** VIP patron list, order history counts, lifetime spend.
* **Coupon Engine:** Create promo discount vouchers (% or flat ₹, min order value).
* **Review Moderation:** Approve or reject customer reviews.
* **Website & Showroom Settings:** Jubilee Hills flagship address, concierge numbers, WhatsApp support, GST tax rates, and free shipping thresholds.

---

## 🛠️ Technology Stack

* **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide React, Canvas Confetti
* **Database & Storage:** Supabase PostgreSQL Schema (`supabase_schema.sql`) + Built-in offline resilient client state adapter
* **Payment Integration:** Razorpay Payment Gateway integration flow
* **SEO:** JSON-LD Structured Data Schema, XML Sitemap (`sitemap.ts`), Robots (`robots.ts`), OpenGraph & Twitter tags

---

## 💻 Quick Start & Running Locally

```bash
# 1. Navigate to the project directory
cd "C:\Users\durga\.gemini\antigravity-ide\scratch\ravina-sarees"

# 2. Run the Next.js development server
npm run dev

# 3. Open your browser
# Storefront: http://localhost:3000
# Admin Suite: http://localhost:3000/admin
```

---

## 🗄️ Supabase Production Setup (Optional)

1. Create a new project on [Supabase.com](https://supabase.com).
2. Go to the SQL Editor and paste the contents of [`supabase_schema.sql`](./supabase_schema.sql).
3. Create a `.env.local` file with your credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

*Handcrafted for Ravina Sarees • Jubilee Hills, Hyderabad, India.*
