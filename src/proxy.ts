import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: bounce signed-out visitors away from private pages
 * before rendering. This only checks that a session cookie exists. The real
 * check (is the session valid, does the user have the role) happens in the
 * Data Access Layer, close to the data.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("sw_session")) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/posts/new", "/notifications"],
};
