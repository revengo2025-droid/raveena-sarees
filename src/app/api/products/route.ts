import { NextRequest, NextResponse } from "next/server";
import { getProductsAction } from "@/app/actions/products";
import { requestIpHash } from "@/lib/support/context";
import { rateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/security/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public catalogue search. Inputs are length-limited and sanitised inside getProductsAction. */
export async function GET(req: NextRequest) {
  try {
    const limit = await rateLimit("catalogueSearch", await requestIpHash());
    if (!limit.ok) {
      return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
    }

    const { searchParams } = new URL(req.url);
    const result = await getProductsAction({
      category: searchParams.get("category") || undefined,
      occasion: searchParams.get("occasion") || undefined,
      sort: searchParams.get("sort") || undefined,
      search: searchParams.get("search") || undefined,
    });
    // Public, non-personal data: safe for the CDN to cache briefly
    return NextResponse.json(result, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (err: any) {
    log.error("api.products_failed", { error: err?.message });
    return NextResponse.json({ error: "We could not load products right now." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
