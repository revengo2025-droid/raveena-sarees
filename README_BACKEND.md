# Raveena Sarees — Production Backend Architecture & Integration Guide

## 1. Overview
This codebase contains the complete production-grade backend implementation powering the **Raveena Sarees** luxury handloom e-commerce platform.

### Tech Stack
* **Framework:** Next.js 14 (App Router) with TypeScript
* **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS) & Supabase SSR
* **Payments:** Razorpay API with HMAC SHA-256 signature verification & automated Webhooks
* **Shipping Service:** Shiprocket integration (order, AWB, pickup, tracking webhooks) with idempotent retries
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
│   │   ├── shipping/           # Shiprocket client, fulfillment pipeline, tracking + webhook
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

Copy `.env.example` to `.env.local` and add your real keys. `.env.example` documents every variable
(Supabase, Razorpay, Resend, Shiprocket, CRON_SECRET). Set the same variables in the hosting provider for production.
Only `NEXT_PUBLIC_*` values reach the browser; Shiprocket, Resend, Razorpay secrets and the Supabase service-role key are server-only.

Database: run `supabase_migrations/001` → `005` in order in the Supabase SQL editor (all idempotent).

---

## 5. Razorpay Webhooks Configuration

1. Razorpay Dashboard → **Settings → Webhooks → Add New Webhook**.
2. URL: `https://www.raveenasarees.com/api/webhooks/razorpay`, secret = `RAZORPAY_WEBHOOK_SECRET`.
3. Events: `payment.captured`, `order.paid`, `payment.failed`, `refund.processed`.
4. Payment confirmation is shared with the browser verification and is compare-and-swap, so whichever
   arrives first confirms the order once; the other is a no-op. After confirmation the order confirmation
   email is queued and the order is pushed to Shiprocket.

## 6. Shiprocket (fulfillment)

- Credentials: an **API user** (Shiprocket → Settings → API → Create API User) in `SHIPROCKET_EMAIL` / `SHIPROCKET_PASSWORD`.
- A pickup address must exist in Shiprocket; put its nickname in `SHIPROCKET_PICKUP_LOCATION`.
- Flow per confirmed order (Razorpay payment verified): create order (merchant order id = Raveena order number, e.g. `RVN-2026-123456`)
  → assign AWB → schedule pickup (`SHIPROCKET_AUTO_ASSIGN_AWB`, `SHIPROCKET_AUTO_PICKUP`).
- Idempotency: lease lock on the order row, reconciliation (search Shiprocket by reference) before any re-create,
  unique indexes on Shiprocket ids. Failures are stored on the order and shown in the dashboard with a safe Retry.
- Tracking webhook: Shiprocket → Settings → API → Webhooks, URL `https://www.raveenasarees.com/api/webhooks/shipping`
  (alias `/api/webhooks/shiprocket`), token = `SHIPROCKET_WEBHOOK_TOKEN` (sent as `x-api-key`).
  Events are stored once (dedupe key) and acknowledged with HTTP 200, then processed.

## 7. Transactional email (Resend)

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (address on a domain verified in Resend), `RESEND_REPLY_TO`.
- All emails go through `src/lib/services/email` (templates in `templates.ts`); each logical email is one row in
  `email_events` with a unique key, so duplicates are never sent. Failures are kept and retried; admins can resend.

## 8. Background retries

`GET /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` retries failed emails, Shiprocket syncs and
webhook events. Schedule it every 5–15 minutes (Vercel Cron on a paid plan, or any external scheduler).
Light maintenance also runs automatically after incoming webhooks.

## Product images & Featured Festive Drops (Phase 2)

Run these in the Supabase SQL editor, in order:

1. `supabase_migrations/001_security_hardening.sql`
2. `supabase_migrations/002_product_images_and_festive_drops.sql` (creates `product_images`, `featured_drops`, the `product-images` Storage bucket and the atomic `save_featured_drops()` function)

### Dedicated admin account

Create the administrator only in **Supabase Dashboard → Authentication → Users → Add user**:

1. Create a user with email `revengo2025@gmail.com` and password `Revengo@2025#`.
2. Enable **Auto Confirm User** so the account is immediately active (no email verification needed).
3. Run `supabase_migrations/005_revengo_admin.sql` in the SQL editor. It creates or repairs
   that user's `profiles` row and sets `role = 'admin'`.
4. Open `/auth/login`, sign in with email `revengo2025@gmail.com` and password `Revengo@2025#`,
   and the server will redirect the account to `/admin`. The redirect is based on `profiles.role`,
   not user-editable metadata.

The application never contains an admin password in client-side code. Keep Supabase Auth email
confirmation enabled for regular users, use MFA for the admin account where available, and rotate
the password from Supabase Auth if it has been shared outside the intended administrator.

### Newsletter subscribers

Run `supabase_migrations/006_newsletter_subscribers.sql` to create the `newsletter_subscribers` table.
Newsletter subscription notifications are sent to the inbox configured in `CONTACT_NOTIFY_EMAIL` (see below).

- **Catalogue source of truth:** once products exist in Supabase, every visitor sees the database catalogue (cached 60 s and refreshed instantly after an admin save). Until then the bundled starter catalogue is used. In **Admin → Products**, press *Import Starter Catalogue* once to copy it into the database (ratings are not imported).
- **Photos:** Admin → Products → Add/Edit → *Upload Photos*. Files are compressed in the browser, re-validated and re-encoded to WebP on the server (`/api/admin/product-images`), stored at `product-images/{product-id}/{uuid}.webp`, and recorded in `product_images`. `products.images` is a denormalised, ordered copy for the storefront.
- **Featured Festive Drops:** Admin → Featured Festive Drops. Exactly two slots; the same product cannot be in both.
- Storage writes happen only on the server with `SUPABASE_SERVICE_ROLE_KEY` (never exposed to the browser); customers have no write or delete access.

