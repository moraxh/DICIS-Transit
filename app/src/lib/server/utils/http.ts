import type { NextRequest } from "next/server";

export default function getIPFromNextRequest(
  request: NextRequest,
): string | undefined {
  // x-forwarded-for is a comma-separated chain: client, proxy1, proxy2...
  // The leftmost IP is the original client address.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = ips[0];
    if (ip === "::1") return "127.0.0.1";
    return ip || undefined;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp === "::1" ? "127.0.0.1" : realIp;
  }

  return undefined;
}
