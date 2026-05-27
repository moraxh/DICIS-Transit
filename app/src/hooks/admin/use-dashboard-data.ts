"use client";

import { supabase } from "@lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { subDays, subHours, startOfDay } from "date-fns";

export interface KPIData {
  activeRoutes: number;
  activeNotices: number;
  activeOverrides: number;
  reportsToday: number;
  reportsTodayDelta: number | null;
  pendingReports: number;
  expiringNotices: number;
  expiringOverrides: number;
}

export interface RecentReport {
  id: string;
  report_type: string;
  created_at: string;
  route_id: string | null;
  status: string;
}

export interface RouteHealth {
  id: string;
  name: string;
  recentReports: number;
  level: "ok" | "warning" | "critical";
}

export interface AlertItem {
  id: string;
  type: "cluster" | "expiring_notice" | "expiring_override" | "pending_backlog";
  message: string;
  routeId?: string | null;
  severity: "warning" | "critical";
  link: string;
}

async function fetchKPIs(): Promise<KPIData> {
  const now = new Date();
  const todayStart = startOfDay(now).toISOString();
  const yesterdayStart = startOfDay(subDays(now, 1)).toISOString();
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const [
    routesRes,
    noticesRes,
    modsRes,
    reportsTodayRes,
    reportsYesterdayRes,
    pendingRes,
    expNoticesRes,
    expModsRes,
  ] = await Promise.all([
    supabase.from("routes").select("id", { count: "exact" }).eq("is_active", true),
    supabase
      .from("notices")
      .select("id", { count: "exact" })
      .or("expires_at.is.null,expires_at.gt.now()"),
    supabase
      .from("route_temporary_overrides")
      .select("id", { count: "exact" })
      .eq("status", "active")
      .lte("valid_from", now.toISOString())
      .or(`valid_to.is.null,valid_to.gt.${now.toISOString()}`),
    supabase
      .from("reports")
      .select("id", { count: "exact" })
      .gte("created_at", todayStart),
    supabase
      .from("reports")
      .select("id", { count: "exact" })
      .gte("created_at", yesterdayStart)
      .lt("created_at", todayStart),
    supabase
      .from("reports")
      .select("id", { count: "exact" })
      .eq("status", "pending"),
    supabase
      .from("notices")
      .select("id", { count: "exact" })
      .not("expires_at", "is", null)
      .gt("expires_at", now.toISOString())
      .lt("expires_at", in48h),
    supabase
      .from("route_temporary_overrides")
      .select("id", { count: "exact" })
      .eq("status", "active")
      .not("valid_to", "is", null)
      .gt("valid_to", now.toISOString())
      .lt("valid_to", in48h),
  ]);

  const today = reportsTodayRes.count ?? 0;
  const yesterday = reportsYesterdayRes.count ?? 0;
  const delta = yesterday === 0 ? null : today - yesterday;

  return {
    activeRoutes: routesRes.count ?? 0,
    activeNotices: noticesRes.count ?? 0,
    activeOverrides: modsRes.count ?? 0,
    reportsToday: today,
    reportsTodayDelta: delta,
    pendingReports: pendingRes.count ?? 0,
    expiringNotices: expNoticesRes.count ?? 0,
    expiringOverrides: expModsRes.count ?? 0,
  };
}

async function fetchRecentReports(): Promise<RecentReport[]> {
  const { data } = await supabase
    .from("reports")
    .select("id, report_type, created_at, route_id, status")
    .order("created_at", { ascending: false })
    .limit(15);
  return data ?? [];
}

async function fetchRouteHealth(): Promise<RouteHealth[]> {
  const since = subHours(new Date(), 2).toISOString();

  const [routesRes, reportsRes] = await Promise.all([
    supabase.from("routes").select("id, name").eq("is_active", true),
    supabase
      .from("reports")
      .select("route_id")
      .gte("created_at", since)
      .not("route_id", "is", null),
  ]);

  const routes = routesRes.data ?? [];
  const reports = reportsRes.data ?? [];

  const countByRoute: Record<string, number> = {};
  for (const r of reports) {
    if (r.route_id) countByRoute[r.route_id] = (countByRoute[r.route_id] ?? 0) + 1;
  }

  return routes.map((route) => {
    const count = countByRoute[route.id] ?? 0;
    return {
      id: route.id,
      name: route.name,
      recentReports: count,
      level: count >= 5 ? "critical" : count >= 2 ? "warning" : "ok",
    };
  });
}

export function buildAlerts(
  kpis: KPIData | undefined,
  routeHealth: RouteHealth[] | undefined,
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (routeHealth) {
    for (const route of routeHealth) {
      if (route.level === "critical") {
        alerts.push({
          id: `cluster-${route.id}`,
          type: "cluster",
          message: `${route.name}: ${route.recentReports} reportes en las últimas 2 horas`,
          routeId: route.id,
          severity: "critical",
          link: `/admin/reports?route=${route.id}`,
        });
      } else if (route.level === "warning") {
        alerts.push({
          id: `warn-${route.id}`,
          type: "cluster",
          message: `${route.name}: ${route.recentReports} reportes recientes`,
          routeId: route.id,
          severity: "warning",
          link: `/admin/reports?route=${route.id}`,
        });
      }
    }
  }

  if (kpis) {
    if (kpis.expiringNotices > 0) {
      alerts.push({
        id: "expiring-notices",
        type: "expiring_notice",
        message: `${kpis.expiringNotices} aviso${kpis.expiringNotices > 1 ? "s" : ""} expira en menos de 48h`,
        severity: "warning",
        link: "/admin/notices",
      });
    }
    if (kpis.expiringOverrides > 0) {
      alerts.push({
        id: "expiring-overrides",
        type: "expiring_override",
        message: `${kpis.expiringOverrides} desvio${kpis.expiringOverrides > 1 ? "s" : ""} expira en menos de 48h`,
        severity: "warning",
        link: "/admin/modifications",
      });
    }
    if (kpis.pendingReports >= 10) {
      alerts.push({
        id: "pending-backlog",
        type: "pending_backlog",
        message: `${kpis.pendingReports} reportes pendientes de revisión`,
        severity: kpis.pendingReports >= 20 ? "critical" : "warning",
        link: "/admin/reports?status=pending",
      });
    }
  }

  return alerts;
}

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["admin", "kpis"],
    queryFn: fetchKPIs,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useRecentReports() {
  return useQuery({
    queryKey: ["admin", "recent-reports"],
    queryFn: fetchRecentReports,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

export function useRouteHealth() {
  return useQuery({
    queryKey: ["admin", "route-health"],
    queryFn: fetchRouteHealth,
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
}

// Derived — no async, computed from already-fetched data
export function useAlerts(
  kpis: KPIData | undefined,
  routeHealth: RouteHealth[] | undefined,
) {
  return useQuery({
    queryKey: ["admin", "alerts"],
    queryFn: () => buildAlerts(kpis, routeHealth),
    enabled: kpis !== undefined && routeHealth !== undefined,
    staleTime: 0,
  });
}
