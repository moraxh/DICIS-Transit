import { CAMPUS_ALLOWED_CIDR, REQUIRE_CAMPUS_WIFI } from "@lib/env";
import getIPFromNextRequest from "@lib/server/utils/http";
import ipaddr from "ipaddr.js";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const ip = getIPFromNextRequest(request);

    if (!ip) {
      return NextResponse.json(
        {
          error: "Unable to determine client IP address",
          code: "IP_ADDRESS_UNDETERMINED",
        },
        {
          status: 400,
        },
      );
    }

    if (REQUIRE_CAMPUS_WIFI) {
      const addr = ipaddr.parse(ip);
      const allowed = addr.match(ipaddr.parseCIDR(CAMPUS_ALLOWED_CIDR));

      if (!allowed) {
        return NextResponse.json(
          {
            error: "Access denied: Campus Wi-Fi required",
            code: "CAMPUS_WIFI_REQUIRED",
          },
          {
            status: 403,
          },
        );
      }
    }
  } catch (error) {
    console.error("Error during student login:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during login",
        code: "INTERNAL_SERVER_ERROR",
      },
      {
        status: 500,
      },
    );
  }
}
