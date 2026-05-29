import { messaging } from "@lib/firebase-admin";
import { createServiceClient } from "@lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod";

const bodySchema = z.object({
  type: z.enum([
    "urgent_notice",
    "route_modification",
    "delay_alert",
    "report_verified",
    "service_cut",
    "schedule_change",
    "full_capacity",
    "service_restored",
  ]),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(500),
  url: z.string().optional().default("/"),
  routeId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
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

    const { type, title, body: msgBody, url, routeId, userId } =
      parseResult.data;

    const supabase = createServiceClient();

    const PREF_COL: Record<string, string> = {
      urgent_notice: "notify_urgent_notices",
      route_modification: "notify_route_mods",
      delay_alert: "notify_delay_alerts",
      report_verified: "notify_report_verified",
      service_cut: "notify_service_cuts",
      schedule_change: "notify_schedule_changes",
      full_capacity: "notify_full_capacity",
      service_restored: "notify_service_restored",
    };

    // Types that target only users who have the affected route as a favorite
    const ROUTE_SCOPED = new Set([
      "route_modification",
      "delay_alert",
      "service_cut",
      "schedule_change",
      "full_capacity",
      "service_restored",
    ]);

    // Types that target a single specific user
    const USER_SCOPED = new Set(["report_verified"]);

    let tokens: string[] = [];
    const prefCol = PREF_COL[type];

    if (USER_SCOPED.has(type)) {
      if (!userId) {
        return NextResponse.json(
          { error: "userId required for this notification type" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("fcm_token")
        .eq("user_id", userId)
        .eq(prefCol, true);

      if (error) {
        console.error(`Send: query error (${type}):`, error);
        return NextResponse.json({ error: "DB query failed" }, { status: 500 });
      }
      tokens = (data ?? []).map((r) => r.fcm_token);
    } else if (ROUTE_SCOPED.has(type)) {
      if (!routeId) {
        return NextResponse.json(
          { error: "routeId required for this notification type" },
          { status: 400 },
        );
      }

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("fcm_token, user_id")
        .eq(prefCol, true);

      if (error) {
        console.error(`Send: query error (${type}):`, error);
        return NextResponse.json({ error: "DB query failed" }, { status: 500 });
      }

      const userIds = (data ?? []).map((r) => r.user_id);

      if (userIds.length > 0) {
        const { data: favData, error: favError } = await supabase
          .from("user_favorites")
          .select("user_id")
          .eq("route_id", routeId)
          .in("user_id", userIds);

        if (favError) {
          console.error("Send: favorites query error:", favError);
          return NextResponse.json(
            { error: "DB query failed" },
            { status: 500 },
          );
        }

        const favUserIds = new Set((favData ?? []).map((r) => r.user_id));
        tokens = (data ?? [])
          .filter((r) => favUserIds.has(r.user_id))
          .map((r) => r.fcm_token);
      }
    } else {
      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("fcm_token")
        .eq(prefCol, true);

      if (error) {
        console.error(`Send: query error (${type}):`, error);
        return NextResponse.json({ error: "DB query failed" }, { status: 500 });
      }
      tokens = (data ?? []).map((r) => r.fcm_token);
    }

    if (tokens.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    const BATCH_SIZE = 500;
    let totalSent = 0;
    const staleTokens: string[] = [];

    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batch = tokens.slice(i, i + BATCH_SIZE);
      const result = await messaging.sendEachForMulticast({
        tokens: batch,
        notification: { title, body: msgBody },
        data: { title, body: msgBody, url, event_type: type },
        webpush: {
          notification: {
            title,
            body: msgBody,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
          },
          fcmOptions: { link: url },
        },
        apns: {
          payload: {
            aps: {
              alert: { title, body: msgBody },
              sound: "default",
            },
          },
          fcmOptions: { imageUrl: "/icons/icon-192.png" },
        },
      });

      totalSent += result.successCount;

      result.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const code = resp.error?.code ?? "";
          if (
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-registration-token"
          ) {
            staleTokens.push(batch[idx]);
          }
        }
      });
    }

    if (staleTokens.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("fcm_token", staleTokens);
    }

    return NextResponse.json({ ok: true, sent: totalSent });
  } catch (error) {
    console.error("Notifications send unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
