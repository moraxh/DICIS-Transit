"use client";

import { supabase } from "@lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface OverridePoint {
  stop_id: string | null;
  point_role: "start" | "stop" | "waypoint" | "end";
  stop_order: number;
  stop_name: string;
  latitude: number;
  longitude: number;
  active: boolean;
  time_from_previous_mins: number;
  cumulative_minutes: number;
}

export interface RouteOverride {
  id: string;
  route_id: string;
  points: OverridePoint[];
  cached_geometry: [number, number][] | null;
  status: "active" | "resolved";
  valid_from: string;
  valid_to: string | null;
  admin_id: string | null;
  created_at: string;
}

async function fetchOverrides(): Promise<RouteOverride[]> {
  const { data, error } = await supabase
    .from("route_temporary_overrides")
    .select(
      "id,route_id,points,cached_geometry,status,valid_from,valid_to,admin_id,created_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RouteOverride[];
}

export function useRouteOverrides() {
  return useQuery({
    queryKey: ["admin", "overrides"],
    queryFn: fetchOverrides,
    staleTime: 30_000,
  });
}

export function useActiveRouteOverride(routeId: string | null) {
  const { data: overrides = [] } = useRouteOverrides();
  if (!routeId) return null;

  const now = new Date();
  return (
    overrides.find(
      (o) =>
        o.route_id === routeId &&
        o.status === "active" &&
        new Date(o.valid_from) <= now &&
        (!o.valid_to || new Date(o.valid_to) > now),
    ) ?? null
  );
}

export interface SaveOverridePayload {
  route_id: string;
  points: OverridePoint[];
  cached_geometry: [number, number][] | null;
  valid_from: Date;
  valid_to: Date | null;
  admin_id: string | null;
}

export function useSaveRouteOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      existingId,
      payload,
    }: {
      existingId: string | null;
      payload: SaveOverridePayload;
    }) => {
      const row = {
        route_id: payload.route_id,
        points: payload.points as unknown as Record<string, unknown>[],
        cached_geometry: payload.cached_geometry as unknown as
          | Record<string, unknown>[]
          | null,
        status: "active" as const,
        valid_from: payload.valid_from.toISOString(),
        valid_to: payload.valid_to ? payload.valid_to.toISOString() : null,
        admin_id: payload.admin_id,
      };

      if (existingId) {
        const { error } = await supabase
          .from("route_temporary_overrides")
          .update(row)
          .eq("id", existingId);
        if (error) throw error;
      } else {
        // Deactivate any existing active override for this route first.
        const { error: deactivateError } = await supabase
          .from("route_temporary_overrides")
          .update({ status: "resolved" })
          .eq("route_id", payload.route_id)
          .eq("status", "active");
        if (deactivateError) throw deactivateError;

        const { error } = await supabase
          .from("route_temporary_overrides")
          .insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cambio temporal guardado");
      queryClient.invalidateQueries({ queryKey: ["admin", "overrides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "route-health"] });
    },
    onError: () => toast.error("Error al guardar el cambio temporal"),
  });
}

export function useRestoreRoute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (overrideId: string) => {
      const { error } = await supabase
        .from("route_temporary_overrides")
        .update({ status: "resolved" })
        .eq("id", overrideId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ruta restaurada al original");
      queryClient.invalidateQueries({ queryKey: ["admin", "overrides"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "route-health"] });
    },
    onError: () => toast.error("Error al restaurar la ruta"),
  });
}
