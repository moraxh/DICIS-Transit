import { CAMPUS_ALLOWED_CIDR, REQUIRE_CAMPUS_WIFI } from "@lib/env.server";
import getIPFromNextRequest from "@lib/server/utils/http";
import { createClient } from "@lib/supabase/server";
import ipaddr from "ipaddr.js";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

// ThumbmarkJS produces hex strings of 32-64 chars; reject trivially fabricated IDs
const bodySchema = z.object({
  visitorId: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          code: "INVALID_REQUEST_BODY",
          details: parseResult.error.issues,
        },
        {
          status: 400,
        },
      );
    }

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
      if (!ipaddr.isValid(ip)) {
        return NextResponse.json(
          {
            error: "Invalid client IP address",
            code: "INVALID_IP_ADDRESS",
          },
          {
            status: 400,
          },
        );
      }

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

    const supabase = await createClient();
    const { data: authData, error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          visitorId: parseResult.data.visitorId,
        },
      },
    });

    if (error || !authData.user) {
      console.error("Supabase auth error:", error);
      return NextResponse.json(
        {
          error: "Failed to create anonymous session",
          code: "AUTHENTICATION_FAILED",
        },
        {
          status: 500,
        },
      );
    }

    // Ensure the student exists in our public.users custom table
    const { error: userError } = await supabase.from("users").upsert(
      {
        id: authData.user.id,
        role: "student",
        credibility_score: 100, // Starts with a clean score
      },
      { onConflict: "id", ignoreDuplicates: true },
    );

    if (userError) {
      console.error("Public users table error:", userError);
      // Failsafe, but keep going with the auth data
    }

    const cookieStore = await cookies();

    // Set visitorId cookie for initial validation and legacy proxy needs
    cookieStore.set("visitorId", parseResult.data.visitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json(
      {
        message: "Login successful",
      },
      {
        status: 200,
      },
    );
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
