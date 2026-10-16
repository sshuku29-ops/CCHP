import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";

// Optimistic gate: platform routes need a session cookie. Real authorization
// (role + module checks) happens server-side in layouts, pages and actions.
const PLATFORM_PREFIXES = [
  "/dashboard", "/projects", "/tasks", "/goals", "/calendar", "/waiting-on", "/feedback",
  "/recruitment", "/courses", "/hours", "/volunteers", "/sessions", "/reports-admin",
  "/handoff", "/settings", "/account", "/site-content", "/notifications", "/change-password",
  "/notes", "/library", "/certificates", "/welcome",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const needsAuth = PLATFORM_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  // Expose the pathname to server layouts (used for the forced password change).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  if (!needsAuth) return NextResponse.next({ request: { headers: requestHeaders } });
  if (!request.cookies.get(SESSION_COOKIE)?.value) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
