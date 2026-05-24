"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table";
import { supabase } from "@lib/supabase/client";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ReportStatus = "pending" | "verified" | "rejected" | "spam";

interface Report {
  id: string;
  report_type: string;
  delay_mins: number | null;
  created_at: string;
  route_id: string | null;
  stop_id: string | null;
  user_id: string | null;
  status: ReportStatus;
}

interface RouteOption {
  id: string;
  name: string;
}

const typeLabels: Record<string, string> = {
  did_not_pass: "No pasó",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

const statusLabels: Record<ReportStatus, string> = {
  pending: "Pendiente",
  verified: "Verificado",
  rejected: "Rechazado",
  spam: "Spam",
};

const statusColors: Record<ReportStatus, string> = {
  pending: "text-zinc-400",
  verified: "text-emerald-400",
  rejected: "text-red-400",
  spam: "text-orange-400",
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [filterRoute, setFilterRoute] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const load = useCallback(async () => {
    const [reportsRes, routesRes] = await Promise.all([
      supabase
        .from("reports")
        .select("id,report_type,delay_mins,created_at,route_id,stop_id,user_id,status")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("routes").select("id, name"),
    ]);

    if (reportsRes.data) setReports(reportsRes.data);
    if (routesRes.data) setRoutes(routesRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(reportId: string, status: ReportStatus) {
    setUpdatingStatusId(reportId);
    const { error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", reportId);
    setUpdatingStatusId(null);
    if (error) {
      toast.error("Error al actualizar estado");
      return;
    }
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r)),
    );
    toast.success(`Estado → ${statusLabels[status]}`);
  }

  async function adjustCredibility(userId: string, delta: number) {
    setUpdatingId(userId);

    const { data: newScore, error } = await supabase.rpc("adjust_credibility", {
      target_user_id: userId,
      delta,
    });

    setUpdatingId(null);

    if (error) {
      toast.error("Error al actualizar credibilidad");
      return;
    }

    toast.success(
      `Credibilidad ${delta > 0 ? "aumentada" : "reducida"} → ${newScore}`,
    );
  }

  const routeName = (id: string | null) =>
    routes.find((r) => r.id === id)?.name ?? "—";

  const filtered = reports.filter((r) => {
    if (filterRoute && r.route_id !== filterRoute) return false;
    if (filterType && r.report_type !== filterType) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Reportes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Incidencias reportadas por estudiantes
        </p>
      </div>

      <div className="flex gap-3">
        <select
          value={filterRoute}
          onChange={(e) => setFilterRoute(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">Todas las rutas</option>
          {routes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(typeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-600 transition-colors"
        >
          <option value="">Todos los estados</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-zinc-500">Sin reportes</p>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
          <Table>
            <TableHeader className="bg-zinc-900/50">
              <TableRow className="border-zinc-800 hover:bg-transparent">
                <TableHead className="text-zinc-400">Tipo</TableHead>
                <TableHead className="text-zinc-400">Ruta</TableHead>
                <TableHead className="text-zinc-400">Dispositivo</TableHead>
                <TableHead className="text-zinc-400">Fecha</TableHead>
                <TableHead className="text-zinc-400">Estado</TableHead>
                <TableHead className="text-zinc-400">Credibilidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((report) => (
                <TableRow
                  key={report.id}
                  className="border-zinc-800/60 hover:bg-white/2"
                >
                  <TableCell className="text-zinc-300 py-3">
                    {typeLabels[report.report_type] ?? report.report_type}
                    {report.report_type === "delay" && report.delay_mins && (
                      <span className="text-zinc-600 text-xs ml-1">
                        ({report.delay_mins} min)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 py-3">
                    {routeName(report.route_id)}
                  </TableCell>
                  <TableCell className="text-zinc-600 font-mono text-xs py-3">
                    {report.user_id
                      ? `···${report.user_id.slice(-6).toUpperCase()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-zinc-500 text-xs py-3">
                    {new Date(report.created_at).toLocaleString("es-MX", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="py-3">
                    {updatingStatusId === report.id ? (
                      <Loader2 size={13} className="animate-spin text-zinc-500" />
                    ) : (
                      <select
                        value={report.status}
                        onChange={(e) =>
                          updateStatus(report.id, e.target.value as ReportStatus)
                        }
                        className={`bg-transparent text-xs font-medium outline-none cursor-pointer ${statusColors[report.status]}`}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value} className="bg-zinc-900 text-white">
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    {report.user_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            report.user_id &&
                            adjustCredibility(report.user_id, -10)
                          }
                          disabled={updatingId === report.user_id}
                          title="Reducir credibilidad -10"
                          className="text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          {updatingId === report.user_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            report.user_id &&
                            adjustCredibility(report.user_id, 10)
                          }
                          disabled={updatingId === report.user_id}
                          title="Restaurar credibilidad +10"
                          className="text-zinc-500 hover:text-emerald-400 transition-colors disabled:opacity-40"
                        >
                          {updatingId === report.user_id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <ChevronUp size={14} />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
