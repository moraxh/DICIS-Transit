"use client";

import { supabase } from "@lib/supabase/client";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Report {
  id: string;
  report_type: string;
  delay_mins: number | null;
  created_at: string;
  route_id: string | null;
  stop_id: string | null;
  user_id: string | null;
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

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterRoute, setFilterRoute] = useState("");
  const [filterType, setFilterType] = useState("");

  async function load() {
    const [reportsRes, routesRes] = await Promise.all([
      supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("routes").select("id, name"),
    ]);

    if (reportsRes.data) setReports(reportsRes.data);
    if (routesRes.data) setRoutes(routesRes.data);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function adjustCredibility(userId: string, delta: number) {
    setUpdatingId(userId);

    const { data: userData } = await supabase
      .from("users")
      .select("credibility_score")
      .eq("id", userId)
      .single();

    if (!userData) {
      toast.error("Usuario no encontrado");
      setUpdatingId(null);
      return;
    }

    const newScore = Math.max(0, Math.min(100, userData.credibility_score + delta));
    const { error } = await supabase
      .from("users")
      .update({ credibility_score: newScore })
      .eq("id", userId);

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
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  Tipo
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  Ruta
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  Dispositivo
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  Fecha
                </th>
                <th className="px-4 py-3 text-xs font-medium text-zinc-500">
                  Credibilidad
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report, i) => (
                <tr
                  key={report.id}
                  className={`${i < filtered.length - 1 ? "border-b border-zinc-800/60" : ""} hover:bg-white/2`}
                >
                  <td className="px-4 py-3 text-zinc-300">
                    {typeLabels[report.report_type] ?? report.report_type}
                    {report.report_type === "delay" && report.delay_mins && (
                      <span className="text-zinc-600 text-xs ml-1">
                        ({report.delay_mins} min)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {routeName(report.route_id)}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 font-mono text-xs">
                    {report.user_id
                      ? `···${report.user_id.slice(-6).toUpperCase()}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {new Date(report.created_at).toLocaleString("es-MX", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {report.user_id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            adjustCredibility(report.user_id!, -10)
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
                          onClick={() =>
                            adjustCredibility(report.user_id!, 10)
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
