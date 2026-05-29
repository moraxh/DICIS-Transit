import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  routeId: z.string().uuid(),
});

const CAPACITY_REPORT_THRESHOLD = 3;
const CAPACITY_WINDOW_MINUTES = 30;

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

    const { routeId } = parseResult.data;
    const windowStart = new Date(
      Date.now() - CAPACITY_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { count, error } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("route_id", routeId)
      .eq("report_type", "full_bus")
      .gte("created_at", windowStart);

    if (error) {
      console.error("Capacity threshold count error:", error);
      return NextResponse.json({ triggered: false });
    }

    if ((count ?? 0) >= CAPACITY_REPORT_THRESHOLD) {
      const { data: routeData } = await supabase
        .from("routes")
        .select("name")
        .eq("id", routeId)
        .single();

      const routeName = routeData?.name ?? "una ruta";

      fetch(`${request.nextUrl.origin}/api/notifications/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "full_capacity",
          title: "Camión lleno",
          body: `Varios estudiantes reportaron que ${routeName} viene lleno.`,
          url: "/",
          routeId,
        }),
      }).catch(console.error);

      return NextResponse.json({ triggered: true });
    }

    return NextResponse.json({ triggered: false });
  } catch (error) {
    console.error("Check capacity threshold unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
