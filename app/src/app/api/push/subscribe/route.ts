import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  fcmToken: z.string().min(10).max(500),
  userAgent: z.string().max(300).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = bodySchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parseResult.error.issues },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fcmToken, userAgent } = parseResult.data;

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: user.id,
        fcm_token: fcmToken,
        user_agent: userAgent ?? request.headers.get("user-agent") ?? null,
      },
      { onConflict: "fcm_token", ignoreDuplicates: true },
    );

    if (error) {
      console.error("Push subscribe error:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push subscribe unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
