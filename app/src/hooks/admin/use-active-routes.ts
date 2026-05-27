"use client";

import { supabase } from "@lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

export interface RouteOption {
  id: string;
  name: string;
}

async function fetchActiveRoutes(): Promise<RouteOption[]> {
  const { data, error } = await supabase
    .from("routes")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data ?? [];
}

export function useActiveRoutes() {
  return useQuery({
    queryKey: ["admin", "active-routes"],
    queryFn: fetchActiveRoutes,
    staleTime: 5 * 60_000,
  });
}
