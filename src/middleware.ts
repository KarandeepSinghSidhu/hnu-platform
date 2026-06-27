// Edge middleware gating the admin surface (/admin pages + /api/admin routes):
// it rejects cross-origin state-changing requests (defence-in-depth CSRF) and
// requires a valid admin session, redirecting page traffic to /admin/login and
// returning 401 JSON for API traffic. The login page and auth endpoints are the
// only authenticated-exempt paths. All other traffic passes straight through.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAdminSessionCookieName,
  verifyAdminSessionToken,
} from "@/lib/admin-session";
import { isSameOriginOrSafe } from "@/lib/same-origin";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Split admin page traffic from admin API traffic because
  // they require different unauthenticated responses.
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isPublicAdminPath =
    pathname === "/admin/login" || pathname.startsWith("/api/admin/auth/");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  // Defence-in-depth CSRF: reject cross-origin state-changing requests to the
  // admin surface (including login/logout). The SameSite=Strict session cookie
  // is the primary control; this adds a server-side origin assertion that does
  // not rely solely on the browser honouring SameSite.
  if (!isSameOriginOrSafe(request)) {
    return NextResponse.json(
      { error: "Cross-origin request blocked" },
      { status: 403 },
    );
  }

  if (isPublicAdminPath) {
    return NextResponse.next();
  }

  const token = request.cookies.get(getAdminSessionCookieName())?.value;
  const isValid = token ? await verifyAdminSessionToken(token) : false;

  if (isValid) {
    return NextResponse.next();
  }

  if (isAdminApi) {
    // API consumers expect JSON status instead of browser redirects.
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Preserve target location so login can navigate back after success.
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
