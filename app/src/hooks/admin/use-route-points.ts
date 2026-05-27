"use client";

import { supabase } from "@lib/supabase/client";
import type { RoutePoint } from "@providers/map-provider";
import { useQuery } from "@tanstack/react-query";

async function fetchRoutePoints(routeId: string): Promise<RoutePoint[]> {
  const { data, error } = await supabase
    .from("public_route_points")
    .select(
      "route_id,route_name,route_is_active,route_direction,route_schedule_type,stop_order,point_role,time_from_previous_mins,cumulative_minutes,stop_id,stop_name,latitude,longitude",
    )
    .eq("route_id", routeId)
    .order("stop_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as RoutePoint[];
}

export function useRoutePoints(routeId: string | null) {
  return useQuery({
    queryKey: ["admin", "route-points", routeId],
    queryFn: () => fetchRoutePoints(routeId!),
    enabled: !!routeId,
    staleTime: 5 * 60_000,
  });
}
