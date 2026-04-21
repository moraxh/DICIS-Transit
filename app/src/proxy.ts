import { createClient } from "@lib/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const allowedPaths = ["/login", "/unauthorized", "/api/auth/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.code === "user_not_found") {
      console.warn(
        "No active session found for user - treating as unauthenticated",
      );

      await supabase.auth.signOut();

      const cookieStore = await cookies();
      cookieStore.delete("visitorId");

      if (!allowedPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  if (user) {
    // Validate visitorId cookie with Supabase session
    const visitorIdCookie = request.cookies.get("visitorId")?.value;

    const sessionVisitorId = user.user_metadata?.visitorId;

    if (visitorIdCookie !== sessionVisitorId) {
      console.warn(
        "Visitor ID mismatch: cookie vs session - possible tampering or session issue",
        { visitorIdCookie, sessionVisitorId },
      );

      // Invalidate session and clear cookie
      await supabase.auth.signOut();

      const cookieStore = await cookies();
      cookieStore.delete("visitorId");

      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (user && pathname === "/unauthorized") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Allow unauthenticated access to certain paths
  if (allowedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  console.debug("Authenticated user - allowing access to:", pathname);
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known).*)",
  ],
};
