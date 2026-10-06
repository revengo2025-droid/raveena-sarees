# Raveena Sarees — Production Backend Architecture & Integration Guide

## 1. Overview
This codebase contains the complete production-grade backend implementation powering the **Raveena Sarees** luxury handloom e-commerce platform.

### Tech Stack
* **Framework:** Next.js 14 (App Router) with TypeScript
* **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS) & Supabase SSR
* **Payments:** Razorpay API with HMAC SHA-256 signature verification & automated Webhooks
* **Shipping Service:** Abstracted shipping provider (`ShippingService`) with BlueDart Express integration & realistic tracking timeline
* **Email Service:** Abstracted transactional email provider (`EmailService`) with Resend and console fallback
* **Validation:** Zod schemas for all client inputs, checkout, addresses, and catalog management
* **Security:** Next.js Middleware route protection for `/account/*` and `/admin/*`

---

## 2. Directory Structure

```
src/
├── app/
│   ├── actions/                  # Next.js Server Actions
│   │   ├── auth.ts              # Login, register, logout, profile update
│   │   ├── products.ts          # Catalog query, CRUD, category management
│   │   ├── orders.ts            # Order creation, Razorpay verification, tracking
│   │   ├── coupons.ts           # Coupon validation & management
│   │   ├── reviews.ts           # Customer review submission & moderation
│   │   └── admin.ts             # Analytics & CRM statistics
│   ├── api/                     # REST Route Handlers
│   │   ├── checkout/create-order/route.ts
│   │   ├── products/route.ts
│   │   └── webhooks/razorpay/route.ts  # Webhook handler
│   ├── layout.tsx               # Root layout with StoreLayoutWrapper
│   ├── checkout/page.tsx        # Production Razorpay checkout
│   └── ...
├── components/
│   └── StoreLayoutWrapper.tsx   # Isolates Admin routes from storefront header/footer
├── lib/
│   ├── services/
│   │   ├── email/index.ts       # Email abstraction (Resend + logger fallback)
│   │   ├── shipping/index.ts    # Shipping abstraction (BlueDart tracking)
│   │   └── payment/razorpay.ts  # Razorpay integration & signature verification
│   ├── supabase/
│   │   ├── client.ts            # Browser client (@supabase/ssr)
│   │   ├── server.ts            # Server client with cookies (@supabase/ssr)
│   │   ├── admin.ts             # Service role admin client
│   │   └── middleware.ts        # Session refresh & protected route guard
│   ├── types/
│   │   └── database.ts          # Comprehensive TypeScript Database types
│   ├── validations/
│   │   └── index.ts             # Production Zod validation schemas
│   └── store.tsx                # Context store with live server action sync
├── middleware.ts                # Next.js Root Middleware
supabase_schema.sql              # Complete PostgreSQL schema (tables, RLS, triggers, indexes)
supabase_seed.sql                # Complete catalog & configuration seed SQL
```

---

## 3. Database Setup (Supabase)

1. Open your [Supabase Dashboard](https://database.new) and create a project.
2. In the **SQL Editor**, run the contents of [`supabase_schema.sql`](supabase_schema.sql).
3. To seed authentic initial products, categories, coupons, and store settings, run [`supabase_seed.sql`](supabase_seed.sql).
4. Verify all tables in the Table Editor (`products`, `categories`, `orders`, `order_items`, `coupons`, `profiles`, `payments`, etc.).

---

## 4. Environment Variables

Copy `.env.example` to `.env.local` and add your real keys:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# Email
EMAIL_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM_ADDRESS=orders@your-verified-domain.com
EMAIL_FROM_NAME="Raveena Sarees"

# App
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

> **Note:** If environment variables are missing or test keys are used, the application operates in resilient simulation mode with mock orders and console logging without crashing.

---

## 5. Razorpay Webhooks Configuration

1. In the Razorpay Dashboard, navigate to **Settings > Webhooks > Add New Webhook**.
2. Set Webhook URL to: `https://your-domain.com/api/webhooks/razorpay`
3. Enter your `RAZORPAY_WEBHOOK_SECRET`.
4. Subscribe to the following events:
   * `order.paid`
   * `payment.captured`
5. On every captured payment, the webhook automatically:
   * Reconciles the order status to `confirmed` and `paid`
   * Inserts the payment record in the `payments` table
   * Creates the BlueDart express shipment
   * Sends the official tax invoice and order confirmation email to the customer

## Product images & Featured Festive Drops (Phase 2)

Run these in the Supabase SQL editor, in order:

1. `supabase_migrations/001_security_hardening.sql`
2. `supabase_migrations/002_product_images_and_festive_drops.sql` (creates `product_images`, `featured_drops`, the `product-images` Storage bucket and the atomic `save_featured_drops()` function)

Then set an admin: `update profiles set role = 'admin' where email = '<your email>';`

- **Catalogue source of truth:** once products exist in Supabase, every visitor sees the database catalogue (cached 60 s and refreshed instantly after an admin save). Until then the bundled starter catalogue is used. In **Admin → Products**, press *Import Starter Catalogue* once to copy it into the database (ratings are not imported).
- **Photos:** Admin → Products → Add/Edit → *Upload Photos*. Files are compressed in the browser, re-validated and re-encoded to WebP on the server (`/api/admin/product-images`), stored at `product-images/{product-id}/{uuid}.webp`, and recorded in `product_images`. `products.images` is a denormalised, ordered copy for the storefront.
- **Featured Festive Drops:** Admin → Featured Festive Drops. Exactly two slots; the same product cannot be in both.
- Storage writes happen only on the server with `SUPABASE_SERVICE_ROLE_KEY` (never exposed to the browser); customers have no write or delete access.
