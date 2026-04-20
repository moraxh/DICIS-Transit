import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
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
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parseResult.data.email,
      password: parseResult.data.password,
    });

    if (error || !data.user) {
      console.error("Admin login error:", error);
      // Wait to mitigate timing attacks (though Supabase SDK handles this partially)
      await new Promise((resolve) => setTimeout(resolve, 500));
      return NextResponse.json(
        {
          error: "Invalid admin credentials",
          code: "AUTHENTICATION_FAILED",
        },
        { status: 401 },
      );
    }

    // Verify it's actually an admin in the public table
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (userError || userData?.role !== "admin") {
      console.warn(
        "Attempt to login to admin portal by non-admin user",
        data.user.id,
      );
      await supabase.auth.signOut();
      return NextResponse.json(
        {
          error: "Access denied: User is not an administrator",
          code: "INSUFFICIENT_PERMISSIONS",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      { message: "Admin login successful" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error during admin login:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during admin login",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
