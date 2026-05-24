import { createClient } from "@lib/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

const allowedPaths = [
  "/login",
  "/admin/login",
  "/unauthorized",
  "/api/auth/login",
];

const adminPaths = ["/admin"];

export default async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    if (error.code === "user_not_found") {
      await supabase.auth.signOut();

      const cookieStore = await cookies();
      cookieStore.delete("visitorId");

      if (!allowedPaths.some((path) => pathname.startsWith(path))) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  }

  if (user?.is_anonymous) {
    // Validate visitorId cookie against session metadata to detect session swaps
    const visitorIdCookie = request.cookies.get("visitorId")?.value;
    const sessionVisitorId = user.user_metadata?.visitorId;

    if (visitorIdCookie !== sessionVisitorId) {
      await supabase.auth.signOut();

      const cookieStore = await cookies();
      cookieStore.delete("visitorId");

      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  if (user && pathname === "/unauthorized") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (user && !user.is_anonymous && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Allow unauthenticated access to certain paths
  if (allowedPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  // Enforce admin role at middleware level — client-side guard alone is insufficient.
  // Any authenticated non-admin hitting /admin/* gets bounced to unauthorized.
  const isAdminRoute =
    adminPaths.some((p) => pathname.startsWith(p)) &&
    pathname !== "/admin/login";

  if (isAdminRoute) {
    const { data: publicUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (publicUser?.role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.well-known).*)",
  ],
};
