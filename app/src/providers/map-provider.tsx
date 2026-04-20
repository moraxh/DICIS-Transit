"use client";

import { supabase } from "@lib/supabase/client";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

interface RoutePoint {
  route_id: string;
  route_name: string;
  route_is_active: boolean;
  route_direction: string;
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
  points: RoutePoint[];
  schedules: RouteSchedule[];
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
}

const MapContext = createContext<MapContextType | undefined>(undefined);

export function MapProvider({ children }: { children: ReactNode }) {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [reportCounts, setReportCounts] = useState<ReportCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadRoutes() {
      setIsLoading(true);
      try {
        const [pointsResponse, schedulesResponse, reportsResponse] = await Promise.all([
          supabase
            .from("public_route_points")
            .select("*")
            .order("stop_order", { ascending: true }),
          supabase
            .from("schedules")
            .select("*")
            .order("departure_time", { ascending: true }),
          supabase
            .from("recent_report_counts")
            .select("*"),
        ]);

        if (pointsResponse.error) throw pointsResponse.error;
        if (schedulesResponse.error) throw schedulesResponse.error;
        if (reportsResponse.data) setReportCounts(reportsResponse.data as ReportCount[]);

        const data = pointsResponse.data;
        const schedulesData = schedulesResponse.data as RouteSchedule[];

        const routeMap = new Map<string, RouteData>();
        for (const pt of data as RoutePoint[]) {
          if (!routeMap.has(pt.route_id)) {
            routeMap.set(pt.route_id, {
              id: pt.route_id,
              name: pt.route_name,
              isActive: pt.route_is_active,
              direction: (pt.route_direction as "to_dicis" | "from_dicis") ?? "to_dicis",
              points: [],
              schedules: schedulesData.filter(
                (s) => s.route_id === pt.route_id,
              ),
            });
          }
          routeMap.get(pt.route_id)?.points.push(pt);
        }

        const parsedRoutes = Array.from(routeMap.values());
        setRoutes(parsedRoutes);

        if (parsedRoutes.length > 0) {
          const active = parsedRoutes.find((r) => r.isActive);
          if (active) setActiveRouteId(active.id);
          else setActiveRouteId(parsedRoutes[0].id);
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
  }, []);

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

export type { RouteData, RoutePoint, RouteSchedule, ReportCount };
