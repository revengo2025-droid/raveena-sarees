import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    return await updateSession(request);
  } catch {
    // Fail closed for the dashboard: if the session/role cannot be verified, do not let the request through.
    if (request.nextUrl.pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/auth/login?redirect=%2Fadmin", request.url));
    }
    // Storefront pages stay available if Supabase is unreachable
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (build assets / image optimisation)
     * - favicon.ico, icon/apple-icon, manifest, robots, sitemap (must always be crawlable)
     * - images/ (public images)
     * - api/webhooks/ (external webhooks authenticate themselves)
     */
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|robots.txt|sitemap.xml|images/|api/webhooks).*)",
  ],
};
