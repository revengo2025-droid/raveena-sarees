/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "**.supabase.co";

// -----------------------------------------------------------------------------
// Content-Security-Policy
// Every origin below is one the site really uses:
//   Razorpay  - checkout.js (script), the payment iframe, and its API/telemetry (connect)
//   Supabase  - product photos (img) and the browser auth/API client (connect)
//   Fonts     - next/font self-hosts them at build time, so no Google domains are needed
// 'unsafe-inline' for scripts/styles stays because Next.js 14 injects inline bootstrap scripts and Tailwind/next
// emit inline styles; a per-request nonce would force every page to render dynamically and lose static caching.
// It is contained by: no remote script hosts except Razorpay, object-src 'none', base-uri/form-action 'self',
// and frame-ancestors 'self'. 'unsafe-eval' is only added for `next dev` (React refresh), never in production.
// -----------------------------------------------------------------------------
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://*.razorpay.com",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://lumberjack.razorpay.com https://checkout.razorpay.com${isDev ? " ws: http://localhost:*" : ""}`,
  "frame-src https://api.razorpay.com https://checkout.razorpay.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "manifest-src 'self'",
  "worker-src 'self' blob:",
  // Only when the site is really served over HTTPS (a local `next start` over plain http would otherwise break)
  ...(isDev || /^http:\/\//i.test(process.env.NEXT_PUBLIC_SITE_URL || "") ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(self), payment=(self "https://checkout.razorpay.com" "https://api.razorpay.com"), usb=(), interest-cohort=()',
  },
  // Keeps the page isolated from other windows but still lets Razorpay's UPI / 3-D Secure popups talk back
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

// Pages that show or change personal data must never be stored by shared caches or the browser history cache
const noStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "canvas-confetti"],
  },
  async redirects() {
    return [
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/products/:slug", destination: "/product/:slug", permanent: true },
      // The admin dashboard lives at /admin (access is enforced by middleware + server checks)
      { source: "/dashboard", destination: "/admin", permanent: false },
      { source: "/dashboard/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/account/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/auth/:path*", headers: noStore },
      { source: "/checkout/:path*", headers: noStore },
      { source: "/api/admin/:path*", headers: noStore },
      { source: "/api/cron/:path*", headers: noStore },
      { source: "/api/health/ready", headers: noStore },
    ];
  },
  images: {
    // WebP only. AVIF is deliberately off: published Next.js 14 advisories include a remote-code-execution flaw in the
    // image optimizer that is triggered by AVIF files, and there is no patched 14.x release. Re-enable after upgrading Next.
    formats: ["image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
    remotePatterns: [
      // Product photos uploaded from the admin dashboard (Supabase Storage)
      { protocol: "https", hostname: supabaseHost },
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

module.exports = nextConfig;
