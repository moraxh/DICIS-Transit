import { createClient, createServiceClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.is_anonymous) {
      return NextResponse.json(
        { error: "Not authenticated as student", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "No active session", code: "NO_SESSION" },
        { status: 401 },
      );
    }

    const oldVisitorId = user.user_metadata?.visitorId as string | undefined;

    if (!oldVisitorId) {
      return NextResponse.json(
        { error: "Session has no visitorId", code: "INVALID_SESSION" },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();

    const { data, error: insertError } = await serviceClient
      .from("session_transfers")
      .insert({
        user_id: user.id,
        old_visitor_id: oldVisitorId,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      console.error("session_transfers insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to create transfer token", code: "INSERT_FAILED" },
        { status: 500 },
      );
    }

    return NextResponse.json({ token: data.id }, { status: 200 });
  } catch (error) {
    console.error("Transfer create error:", error);
    return NextResponse.json(
      { error: "Unexpected error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
