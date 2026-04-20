import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    console.log("User info fetched from Supabase:", { user, error });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch user information",
        code: "USER_INFO_FETCH_FAILED",
      },
      {
        status: 500,
      },
    );
  }
}
