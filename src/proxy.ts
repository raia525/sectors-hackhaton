import { NextResponse, type NextRequest } from "next/server";
import { parseSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Route gating.
 *
 * Everything requires a signed-in, verified session except the landing page
 * (the root path with no `symbol`), the auth pages themselves, and the links
 * mailed for verification and password reset. `/` is a special case: it is
 * the public landing page with no query string, but becomes the analysis
 * view once a `symbol` is present, and that view is gated like everything
 * else.
 *
 * Only the cookie's signature and expiry are checked here, not the database
 * backed passwordChangedAt invalidation that getCurrentUser also applies
 * (src/lib/auth.ts). That check needs Prisma, which this file deliberately
 * still avoids even though Proxy runs in the Node.js runtime by default
 * (Next.js 16): keeping Proxy to a pure cookie check, with no database round
 * trip, is what keeps every gated navigation fast. The gap this leaves is
 * narrow: a session cookie copied just before a password reset keeps
 * working here until the page itself calls getCurrentUser, which every
 * gated page already does for its own data. This runs on every request but
 * static assets and the API, which authenticate themselves separately (see
 * cronAuth.ts).
 *
 * Named proxy.ts, not middleware.ts: Next.js 16 renamed the convention (the
 * old name still works but is deprecated), and Proxy now defaults to the
 * Node.js runtime, which is what this file needs anyway to reuse
 * node:crypto's createHmac and timingSafeEqual (src/lib/auth/session.ts),
 * the same primitives every other signed value in the app uses.
 */

const PUBLIC_PREFIXES = [
  "/signin",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const isPublic =
    (pathname === "/" && !request.nextUrl.searchParams.has("symbol")) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isPublic) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const userId = parseSessionToken(token);

  if (!userId) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Every path except: Next internals, static files, and API routes,
     * which authenticate themselves rather than relying on this cookie
     * check (the cron endpoints use a bearer secret, see cronAuth.ts).
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
