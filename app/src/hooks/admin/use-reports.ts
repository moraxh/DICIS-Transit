"use client";

import { supabase } from "@lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ReportStatus = "pending" | "verified" | "rejected" | "spam";

export interface CredibilityFactors {
  same_type_route_corroborations: number;
  same_stop_corroborations: number;
  reporter_verified_history: number;
  time_window_hours: number;
}

export interface Report {
  id: string;
  report_type: string;
  delay_mins: number | null;
  created_at: string;
  route_id: string | null;
  stop_id: string | null;
  user_id: string | null;
  status: ReportStatus;
  credibility_score: number;
  corroboration_count: number;
  credibility_factors: CredibilityFactors;
}

async function fetchReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id,report_type,delay_mins,created_at,route_id,stop_id,user_id,status,credibility_score,corroboration_count,credibility_factors",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return data ?? [];
}

export function useReports() {
  return useQuery({
    queryKey: ["admin", "reports-list"],
    queryFn: fetchReports,
    staleTime: 20_000,
    refetchInterval: 60_000,
  });
}

export function useUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: ReportStatus;
    }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "reports-list"] });
      const prev = queryClient.getQueryData<Report[]>([
        "admin",
        "reports-list",
      ]);
      queryClient.setQueryData<Report[]>(
        ["admin", "reports-list"],
        (old) => old?.map((r) => (r.id === id ? { ...r, status } : r)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["admin", "reports-list"], ctx.prev);
      toast.error("Error al actualizar estado");
    },
    onSuccess: (_data, { id, status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });

      if (status === "verified") {
        const reports = queryClient.getQueryData<Report[]>([
          "admin",
          "reports-list",
        ]);
        const report = reports?.find((r) => r.id === id);
        if (report?.user_id) {
          fetch("/api/notifications/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "report_verified",
              title: "Reporte verificado",
              body: "Tu reporte fue revisado y verificado. ¡Gracias por contribuir!",
              url: "/",
              userId: report.user_id,
            }),
          }).catch(console.error);
        }
      }
    },
  });
}

export function useBulkUpdateReportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ids,
      status,
    }: {
      ids: string[];
      status: ReportStatus;
    }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
      return { ids, status };
    },
    onMutate: async ({ ids, status }) => {
      await queryClient.cancelQueries({ queryKey: ["admin", "reports-list"] });
      const prev = queryClient.getQueryData<Report[]>([
        "admin",
        "reports-list",
      ]);
      const idSet = new Set(ids);
      queryClient.setQueryData<Report[]>(
        ["admin", "reports-list"],
        (old) =>
          old?.map((r) => (idSet.has(r.id) ? { ...r, status } : r)) ?? [],
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev)
        queryClient.setQueryData(["admin", "reports-list"], ctx.prev);
      toast.error("Error al actualizar en bloque");
    },
    onSuccess: ({ ids, status }) => {
      const labels: Record<ReportStatus, string> = {
        pending: "Pendiente",
        verified: "Verificado",
        rejected: "Rechazado",
        spam: "Spam",
      };
      toast.success(`${ids.length} reportes → ${labels[status]}`);
      queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
    },
  });
}
