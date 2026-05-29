import { createServiceClient } from "@lib/supabase/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  token: z.string().uuid(),
  newVisitorId: z
    .string()
    .min(8)
    .max(128)
    .regex(/^[a-zA-Z0-9_-]+$/),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", code: "INVALID_REQUEST_BODY" },
        { status: 400 },
      );
    }

    const { token, newVisitorId } = parsed.data;
    const serviceClient = createServiceClient();

    const { data: transfer, error: fetchError } = await serviceClient
      .from("session_transfers")
      .select("id, user_id, old_visitor_id, access_token, refresh_token, used_at, expires_at")
      .eq("id", token)
      .single();

    if (fetchError || !transfer) {
      return NextResponse.json(
        { error: "Transfer token not found", code: "TOKEN_NOT_FOUND" },
        { status: 404 },
      );
    }

    if (transfer.used_at) {
      return NextResponse.json(
        { error: "Transfer token already used", code: "TOKEN_USED" },
        { status: 410 },
      );
    }

    if (new Date(transfer.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Transfer token expired", code: "TOKEN_EXPIRED" },
        { status: 410 },
      );
    }

    // Mark used before doing anything else (prevents race condition)
    const { error: markError } = await serviceClient
      .from("session_transfers")
      .update({ used_at: new Date().toISOString() })
      .eq("id", token)
      .is("used_at", null); // only update if still unused

    if (markError) {
      console.error("Failed to mark token used:", markError);
      return NextResponse.json(
        { error: "Failed to claim transfer token", code: "CLAIM_FAILED" },
        { status: 500 },
      );
    }

    // Update visitorId on the auth user — device A's proxy check will fail on next request
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(
      transfer.user_id,
      { user_metadata: { visitorId: newVisitorId } },
    );

    if (updateError) {
      console.error("Failed to update visitorId:", updateError);
      return NextResponse.json(
        { error: "Failed to update session", code: "UPDATE_FAILED" },
        { status: 500 },
      );
    }

    // Set visitorId cookie on device B (httpOnly)
    const cookieStore = await cookies();
    cookieStore.set("visitorId", newVisitorId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });

    return NextResponse.json(
      {
        accessToken: transfer.access_token,
        refreshToken: transfer.refresh_token,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Transfer redeem error:", error);
    return NextResponse.json(
      { error: "Unexpected error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
