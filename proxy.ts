import { NextResponse, type NextRequest } from "next/server";

// Coarse, edge-safe gate: presence of the real session cookie (not its
// decrypted contents — iron-session's payload needs Node crypto to unseal,
// which real page/server-action code does via lib/session.ts). A visitor
// with no session cookie at all is definitely not logged in, so redirect
// before any protected page renders instead of leaving that to each page.
const SESSION_COOKIE = "inkwell_session";

const PROTECTED_PREFIXES = ["/projects", "/settings", "/notifications", "/trash"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (!isProtected) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (hasSession) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/projects/:path*", "/settings/:path*", "/notifications/:path*", "/trash/:path*"],
};
