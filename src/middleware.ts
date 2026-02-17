import { NextRequest, NextResponse } from "next/server";

/**
 * Edge middleware — checks for the `session` cookie.
 * If unauthenticated, redirects to /login.
 * Public routes (login, auth API, static assets) are excluded.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/login", "/api/auth"];
  const isPublic = publicPaths.some((p) => pathname.startsWith(p));

  if (isPublic) return NextResponse.next();

  // Check for session cookie
  const session = request.cookies.get("session")?.value;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image  (image optimization)
     * - favicon.ico, icon.png, etc.
     * - public assets (images, logos)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|.*\\.jpg|.*\\.png|.*\\.svg).*)",
  ],
};
