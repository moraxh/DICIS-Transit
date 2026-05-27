"use client";

import { supabase } from "@lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type NoticeCategory =
  | "delay"
  | "detour"
  | "cancellation"
  | "schedule_change"
  | "incident"
  | "info"
  | "maintenance";

export interface Notice {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "high" | "medium" | "low";
  category: NoticeCategory;
  affected_route_ids: string[];
  start_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface NoticePayload {
  title: string;
  content: string;
  priority: Notice["priority"];
  category: NoticeCategory;
  affected_route_ids: string[];
  start_at?: string;
  expires_at?: string;
  admin_id: string;
}

async function fetchNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from("notices")
    .select(
      "id,title,content,priority,category,affected_route_ids,start_at,created_at,expires_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useNotices() {
  return useQuery({
    queryKey: ["admin", "notices"],
    queryFn: fetchNotices,
    staleTime: 30_000,
  });
}

export function useCreateNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: NoticePayload) => {
      const { error } = await supabase.from("notices").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso creado");
      queryClient.invalidateQueries({ queryKey: ["admin", "notices"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
    },
    onError: () => toast.error("Error al crear aviso"),
  });
}

export function useDeleteNotice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Aviso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin", "notices"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
    },
    onError: () => toast.error("Error al eliminar aviso"),
  });
}
