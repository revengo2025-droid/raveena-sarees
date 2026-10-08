import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_HOME, LOGIN_FOR_CHECKOUT, isStaffRole } from "@/lib/auth/roles";

const isAdminPath = (p: string) => p === "/admin" || p.startsWith("/admin/");
const isCustomerOnlyPath = (p: string) =>
  p === "/account" || p.startsWith("/account/") || p === "/checkout" || p.startsWith("/checkout/");

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({
          name,
          value: "",
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: "",
          ...options,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const toLogin = () => {
    const redirectUrl = new URL("/auth/login", request.url);
    redirectUrl.searchParams.set("redirect", path);
    return NextResponse.redirect(redirectUrl);
  };

  if ((path.startsWith("/account") || isAdminPath(path)) && !user) return toLogin();

  // Checkout needs a signed-in customer. Enforced here on the server so no URL, button or stale browser state can skip it.
  if (!user && (path === "/checkout" || path.startsWith("/checkout/"))) {
    return NextResponse.redirect(new URL(LOGIN_FOR_CHECKOUT, request.url));
  }

  if (user && (isAdminPath(path) || isCustomerOnlyPath(path))) {
    // Role is read from the profiles table (never from user-editable metadata). RLS lets a user read only their own row.
    const { data: profile, error } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const staff = !error && isStaffRole(profile?.role);

    // Dashboard: admin/staff only. Every admin page and action re-checks this on the server.
    if (isAdminPath(path) && !staff) {
      return NextResponse.redirect(new URL("/?denied=admin", request.url));
    }
    // Admin accounts are not customer accounts: keep them out of /account and checkout
    if (isCustomerOnlyPath(path) && staff) {
      return NextResponse.redirect(new URL(ADMIN_HOME, request.url));
    }
  }

  return response;
}
