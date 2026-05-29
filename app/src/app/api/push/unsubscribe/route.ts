import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  fcmToken: z.string().min(10).max(500),
});

export async function DELETE(request: NextRequest) {
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

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("fcm_token", parseResult.data.fcmToken)
      .eq("user_id", user.id);

    if (error) {
      console.error("Push unsubscribe error:", error);
      return NextResponse.json(
        { error: "Failed to remove subscription" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push unsubscribe unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
