import { createClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  fcmToken: z.string().min(10).max(500),
  notifyUrgentNotices: z.boolean().optional(),
  notifyRouteMods: z.boolean().optional(),
  notifyDelayAlerts: z.boolean().optional(),
  notifyReportVerified: z.boolean().optional(),
  notifyServiceCuts: z.boolean().optional(),
  notifyScheduleChanges: z.boolean().optional(),
  notifyFullCapacity: z.boolean().optional(),
  notifyServiceRestored: z.boolean().optional(),
  notifyWeatherAlert: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
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

    const {
      fcmToken,
      notifyUrgentNotices,
      notifyRouteMods,
      notifyDelayAlerts,
      notifyReportVerified,
      notifyServiceCuts,
      notifyScheduleChanges,
      notifyFullCapacity,
      notifyServiceRestored,
      notifyWeatherAlert,
    } = parseResult.data;

    const updates: Record<string, boolean> = {};
    if (notifyUrgentNotices !== undefined)
      updates.notify_urgent_notices = notifyUrgentNotices;
    if (notifyRouteMods !== undefined) updates.notify_route_mods = notifyRouteMods;
    if (notifyDelayAlerts !== undefined)
      updates.notify_delay_alerts = notifyDelayAlerts;
    if (notifyReportVerified !== undefined)
      updates.notify_report_verified = notifyReportVerified;
    if (notifyServiceCuts !== undefined)
      updates.notify_service_cuts = notifyServiceCuts;
    if (notifyScheduleChanges !== undefined)
      updates.notify_schedule_changes = notifyScheduleChanges;
    if (notifyFullCapacity !== undefined)
      updates.notify_full_capacity = notifyFullCapacity;
    if (notifyServiceRestored !== undefined)
      updates.notify_service_restored = notifyServiceRestored;
    if (notifyWeatherAlert !== undefined)
      updates.notify_weather_alert = notifyWeatherAlert;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabase
      .from("push_subscriptions")
      .update(updates)
      .eq("fcm_token", fcmToken)
      .eq("user_id", user.id);

    if (error) {
      console.error("Push preferences update error:", error);
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Push preferences unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
