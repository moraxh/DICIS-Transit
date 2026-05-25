"use client";

import { supabase } from "@lib/supabase/client";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface RoutePoint {
  route_id: string;
  route_name: string;
  route_is_active: boolean;
  route_direction: string;
  route_schedule_type: string;
  stop_order: number;
  point_role: "start" | "stop" | "waypoint" | "end";
  time_from_previous_mins: number;
  cumulative_minutes: number;
  stop_id: string;
  stop_name: string;
  latitude: number;
  longitude: number;
}

interface RouteSchedule {
  id: string;
  route_id: string;
  departure_time: string;
  days_active: number[];
}

interface ReportCount {
  route_id: string;
  stop_id: string | null;
  stop_name: string | null;
  route_name: string;
  report_type: string;
  report_count: number;
  latest_at: string;
}

interface RouteData {
  id: string;
  name: string;
  isActive: boolean;
  direction: "to_dicis" | "from_dicis";
  scheduleType: "weekday" | "saturday" | "sunday";
  points: RoutePoint[];
  schedules: RouteSchedule[];
}

type ScheduleFilter = "L-V" | "Sábado";
type DirectionFilter = "Ida" | "Regreso";

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "high" | "medium" | "low";
  created_at: string;
  expires_at: string | null;
}

interface RouteModification {
  id: string;
  route_id: string;
  description: string;
  status: "active" | "resolved";
  valid_from: string;
  valid_to: string | null;
}

interface MapContextType {
  routes: RouteData[];
  activeRouteId: string | null;
  setActiveRouteId: (id: string | null) => void;
  activeStopId: string | null;
  setActiveStopId: (id: string | null) => void;
  userLocation: [number, number] | null;
  setUserLocation: (pos: [number, number] | null) => void;
  reportCounts: ReportCount[];
  isLoading: boolean;
  error: Error | null;
  scheduleFilter: ScheduleFilter;
  setScheduleFilter: (v: ScheduleFilter) => void;
  directionFilter: DirectionFilter;
  setDirectionFilter: (v: DirectionFilter) => void;
  notices: Notice[];
  modifications: RouteModification[];
  alertsLoading: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const [reportCounts, setReportCounts] = useState<ReportCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [scheduleFilter, setScheduleFilter] = useState<ScheduleFilter>("L-V");
  const [directionFilter, setDirectionFilter] =
    useState<DirectionFilter>("Ida");

  const [notices, setNotices] = useState<Notice[]>([]);
  const [modifications, setModifications] = useState<RouteModification[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const getDefaultRouteId = useCallback((parsedRoutes: RouteData[]) => {
    const preferredRoute = parsedRoutes.find(
      (route) =>
        route.scheduleType === "weekday" &&
        route.direction === "to_dicis" &&
        route.name === "L-V: ENMSS a DICIS",
    );

    if (preferredRoute) return preferredRoute.id;

    const weekdayOutbound = parsedRoutes.find(
      (route) =>
        route.scheduleType === "weekday" && route.direction === "to_dicis",
    );
    if (weekdayOutbound) return weekdayOutbound.id;

    const active = parsedRoutes.find((route) => route.isActive);
    return active?.id ?? parsedRoutes[0]?.id ?? null;
  }, []);

  useEffect(() => {
    async function loadRoutes() {
      setIsLoading(true);
      try {
        const [pointsResponse, schedulesResponse, reportsResponse] =
          await Promise.all([
            supabase
              .from("public_route_points")
              .select(
                "route_id,route_name,route_is_active,route_direction,route_schedule_type,stop_order,point_role,time_from_previous_mins,cumulative_minutes,stop_id,stop_name,latitude,longitude",
              )
              .order("stop_order", { ascending: true }),
            supabase
              .from("schedules")
              .select("id,route_id,departure_time,days_active")
              .order("departure_time", { ascending: true }),
            supabase
              .from("recent_report_counts")
              .select(
                "route_id,stop_id,stop_name,route_name,report_type,report_count,latest_at",
              ),
          ]);

        if (pointsResponse.error) throw pointsResponse.error;
        if (schedulesResponse.error) throw schedulesResponse.error;
        if (reportsResponse.data)
          setReportCounts(reportsResponse.data as ReportCount[]);

        const data = pointsResponse.data;
        const schedulesData = schedulesResponse.data as RouteSchedule[];

        const schedulesByRoute = new Map<string, RouteSchedule[]>();
        for (const s of schedulesData) {
          const list = schedulesByRoute.get(s.route_id) ?? [];
          list.push(s);
          schedulesByRoute.set(s.route_id, list);
        }

        const routeMap = new Map<string, RouteData>();
        for (const pt of data as RoutePoint[]) {
          if (!routeMap.has(pt.route_id)) {
            routeMap.set(pt.route_id, {
              id: pt.route_id,
              name: pt.route_name,
              isActive: pt.route_is_active,
              direction:
                (pt.route_direction as "to_dicis" | "from_dicis") ?? "to_dicis",
              scheduleType:
                (pt.route_schedule_type as "weekday" | "saturday" | "sunday") ??
                "weekday",
              points: [],
              schedules: schedulesByRoute.get(pt.route_id) ?? [],
            });
          }
          routeMap.get(pt.route_id)?.points.push(pt);
        }

        const parsedRoutes = Array.from(routeMap.values());
        setRoutes(parsedRoutes);

        if (parsedRoutes.length > 0) {
          setActiveRouteId(getDefaultRouteId(parsedRoutes));
        }
      } catch (err: unknown) {
        console.error("Error loading routes data:", err);
        if (err instanceof Error) {
          setError(err);
        } else {
          setError(new Error("Unknown error"));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadRoutes();
  }, [getDefaultRouteId]);

  // PERF-2: Poll reportCounts every 60s so map markers reflect new student reports
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("recent_report_counts")
        .select(
          "route_id,stop_id,stop_name,route_name,report_type,report_count,latest_at",
        );
      if (data) setReportCounts(data as ReportCount[]);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Load alerts (notices + route_modifications) — shared between HomeTab and AlertsTab
  const loadAlerts = useCallback(async () => {
    const [noticesRes, modsRes] = await Promise.all([
      supabase
        .from("notices")
        .select("*")
        .or("expires_at.is.null,expires_at.gt.now()"),
      supabase
        .from("route_modifications")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false }),
    ]);

    if (noticesRes.data) {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      setNotices(
        [...noticesRes.data].sort(
          (a, b) =>
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder],
        ),
      );
    }
    if (modsRes.data) setModifications(modsRes.data as RouteModification[]);
    setAlertsLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  return (
    <MapContext.Provider
      value={{
        routes,
        activeRouteId,
        setActiveRouteId,
        activeStopId,
        setActiveStopId,
        userLocation,
        setUserLocation,
        reportCounts,
        isLoading,
        error,
        scheduleFilter,
        setScheduleFilter,
        directionFilter,
        setDirectionFilter,
        notices,
        modifications,
        alertsLoading,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapData() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error("useMapData must be used within a MapProvider");
  }
  return context;
}

export type {
  RouteData,
  RoutePoint,
  RouteSchedule,
  ReportCount,
  Notice,
  RouteModification,
};
export type { ScheduleFilter, DirectionFilter };
