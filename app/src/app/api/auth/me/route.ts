import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (_error) {
    return NextResponse.json(
      {
        error: "Failed to fetch user information",
        code: "USER_INFO_FETCH_FAILED",
      },
      { status: 500 },
    );
  }
}
