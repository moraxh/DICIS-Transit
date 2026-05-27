import type { NextRequest } from "next/server";

export default function getIPFromNextRequest(
  request: NextRequest,
): string | undefined {
  // x-forwarded-for is a comma-separated chain: client, proxy1, proxy2...
  // The rightmost IP is added by the last trusted proxy — use that, not the
  // leftmost, which is client-controlled and trivially spoofable.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const ips = forwarded
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const ip = ips[ips.length - 1];
    if (ip === "::1") return "127.0.0.1";
    return ip || undefined;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp === "::1" ? "127.0.0.1" : realIp;
  }

  return undefined;
}
