# Raveena Sarees: Security & Operations Guide

Last reviewed: 8 October 2026. This file documents how the site is protected, what you must configure, and what is still open.
It never contains secret values.

## 1. Architecture and trust boundaries

```
Browser ──► Next.js 14 (App Router, Vercel/Node)
             ├─ middleware.ts ............ refreshes the Supabase session, redirects /admin and /account (UX only)
             ├─ Server Actions / Route Handlers  ◄── THE trust boundary: every authorisation decision is made here
             │    ├─ requireAdmin()/requireCustomer() ... role comes from public.profiles.role, never from the browser
             │    ├─ rate limiter (Postgres RPC) ........ shared by all serverless instances
             │    └─ audit log (append-only table)
             ├─ Supabase  (Auth, Postgres with RLS, Storage "product-images")
             ├─ Razorpay  (payments; browser result is re-verified server-side + signed webhook)
             ├─ Shiprocket (fulfilment; token-authenticated webhook)
             └─ Resend    (email; outbox table with retries; swappable provider adapter)
```

| Boundary | Who can cross | How it is enforced |
|---|---|---|
| Public → storefront pages / `GET /api/products` | anyone | rate limited, input sanitised, public data only |
| Customer → own orders, tickets, addresses | signed-in customer | server checks `user_id` from the session on every read/write; RLS as a second layer |
| Customer → admin pages / actions / APIs | nobody | `requireAdmin()` in every action and route; middleware redirect is only convenience |
| Staff → support, orders, catalogue | `staff` or `admin` role | `requireAdmin()` |
| Admin only | `admin` role | `requireAdmin({ adminOnly: true })`: audit log, deleting messages, offer popup, catalogue import |
| Razorpay / Shiprocket → webhooks | provider | HMAC signature / secret token, constant-time compare, payload size caps, idempotent handlers |
| Cron → `/api/cron/maintenance` | scheduler | `Authorization: Bearer CRON_SECRET` (≥16 chars) |
| Server → Supabase service role | server code only | `SUPABASE_SERVICE_ROLE_KEY` is never imported by a client component (checked) |

## 2. Database migrations (run in this order in the Supabase SQL editor)

Already applied earlier (per project notes): 001–006. **New and required for the features in this release:**

1. `supabase_migrations/007_support_tickets_and_contact_inbox.sql`: support tickets, messages, internal notes, ticket audit trail, contact-message workflow columns and statuses. Non-destructive: existing contact messages are kept (`in_progress` → `read`, `resolved` → `closed`). Also removes the retired `info_email` key from the stored `store_info` setting.
2. `supabase_migrations/008_rate_limits_and_audit_hardening.sql`: `rate_limit_hit()` function, counters table, append-only protection for `audit_logs`.

Until 008 is applied the site still works: rate limiting falls back to a per-instance memory counter and logs a warning. Until 007 is applied, the Contact form cannot save (it tells the visitor honestly), and Queries/Messages admin pages show an error.

After migrating, confirm your admin account is an admin: `select email, role from profiles where role in ('admin','staff');` (migration 005 sets it).

## 3. Environment variables (names only)

Server-only (never prefix with `NEXT_PUBLIC_`):

| Variable | Purpose |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | server database / auth admin access |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | payments + webhook signature |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (verified domain), `RESEND_FROM_NAME`, `RESEND_REPLY_TO` | transactional email |
| `EMAIL_PROVIDER` | adapter name, default `resend` |
| `CONTACT_NOTIFY_EMAIL` | private inbox for contact / ticket alerts (comma separated) |
| `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD`, `SHIPROCKET_WEBHOOK_TOKEN`, `SHIPROCKET_PICKUP_LOCATION` (+ optional package/automation flags) | shipping |
| `CRON_SECRET` | protects the maintenance endpoint and the detailed health view |
| `IP_HASH_SALT` | salt for hashing IPs used only by rate limiting |
| `ADMIN_BOOTSTRAP_EMAILS` | optional first-admin bootstrap (confirmed emails only); leave blank once your admin profile exists |

Public (visible in the browser by design):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | canonical URL, must be `https://…` in production |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client (anon key only) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay checkout key id |
| `NEXT_PUBLIC_BUSINESS_CONTACT_EMAIL`, `…_SUPPORT_EMAIL`, `…_GRIEVANCE_EMAIL`, `…_PHONE` | contact details shown everywhere |
| `NEXT_PUBLIC_BUSINESS_LEGAL_NAME`, `…_ADDRESS`, `NEXT_PUBLIC_GSTIN`, `NEXT_PUBLIC_GRIEVANCE_OFFICER_NAME` | legal details (left blank until you have them) |

Supabase dashboard settings you must also set: **Authentication → URL Configuration → Redirect URLs** must include `https://<your-domain>/auth/callback`; keep "Confirm email" enabled; set a minimum password length of 8.

## 4. Security controls and where they live

| Area | Control | Code |
|---|---|---|
| Authentication | login throttling (per IP and per account), generic errors, neutral registration/reset answers, new passwords ≥ 8, password change signs out all devices, secure single-use recovery links via `/auth/callback` | `src/app/actions/auth.ts`, `src/app/auth/callback/route.ts` |
| Authorisation | role only from `profiles.role`; no email is special-cased in code | `src/lib/auth/admin.ts`, `src/lib/support/context.ts` |
| IDOR | tickets/orders/addresses always filtered by the session user; unknown and foreign ids give the same "not found" | `src/lib/support/service.ts` |
| Rate limiting | per-risk budgets in Postgres, memory fallback | `src/lib/security/rate-limit.ts` |
| Input validation | dependency-free validators shared by browser and server; zod for existing forms; ids/search sanitised | `src/lib/support/validate.ts`, `src/lib/security/sanitize.ts` |
| Pricing integrity | checkout prices come only from the database by SKU; unknown/hidden products and over-stock quantities are refused; coupon expiry/limit enforced | `src/app/actions/orders.ts` |
| XSS | React escapes output; emails escape every value and only render http(s) links; no `dangerouslySetInnerHTML` for user content | `templates.ts` |
| Injection | Supabase query builder only; the PostgREST filter-injection path in product search is closed | `getProductsAction` |
| CSRF | Next.js Server Actions enforce same-origin; upload route also checks `Origin`; no state-changing GET | `route.ts` |
| Headers / CSP | strict CSP, HSTS, nosniff, frame protection, COOP, Permissions-Policy, no-store on private areas, no CORS headers | `next.config.js` |
| Uploads | admin only, size cap before buffering, magic-byte check via sharp, re-encode to WebP (strips EXIF), random filenames | `api/admin/product-images/route.ts` |
| Webhooks | HMAC / constant-time token checks, size caps, amount + currency match, idempotent handlers | `api/webhooks/*` |
| Audit | append-only `audit_logs`: sign-ins, failures, role-sensitive admin actions, deletions; secrets scrubbed | `src/lib/security/audit.ts`, `/admin/audit` |
| Logging | one JSON line per event, control characters stripped (no log forging), secret-looking keys dropped | `src/lib/security/logger.ts` |
| Errors | `error.tsx`/`global-error.tsx` boundaries; actions return generic messages and log details server-side | |
| Health | `/api/health` (liveness), `/api/health/ready` (DB check; integration detail only with `CRON_SECRET`) | |

## 5. Scheduler

Call `GET /api/cron/maintenance` with `Authorization: Bearer $CRON_SECRET` every 5–15 minutes (Vercel Cron does this automatically when `CRON_SECRET` is set). It retries failed emails (including contact/ticket alerts), Shiprocket calls and webhook events, and purges old rate-limit counters.

## 6. Monitoring recommendations

- Alert on `/api/health/ready` returning 503.
- Search logs for `"level":"error"` and for events `auth.login_failed` spikes, `security.admin_access_denied`, `rate-limit` warnings (means migration 008 is missing or the database is unreachable).
- Review `/admin/audit` weekly.
- Run `npm audit` monthly.
