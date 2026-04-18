import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

const allowedPaths = ["/login", "/unauthorized", "/api/auth/login"];

export default async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  // Allow unauthenticated access to certain paths
  if (allowedPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // if (!user) {
  //   return NextResponse.redirect(new URL("/unauthorized", request.url));
  // }

  return NextResponse.next();
}
