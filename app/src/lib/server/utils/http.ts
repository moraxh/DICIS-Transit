import type { NextRequest } from "next/server";

export default function getIPFromNextRequest(
  request: NextRequest,
): string | undefined {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("remote-addr") ||
    undefined;

  // Set ::1 as localhost for IPv6
  if (ip === "::1") {
    return "127.0.0.1";
  }
}
