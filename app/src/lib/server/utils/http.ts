import type { NextRequest } from "next/server";

export default function getIPFromNextRequest(
  request: NextRequest,
): string | undefined {
  return (
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("remote-addr") ||
    undefined
  );
}
