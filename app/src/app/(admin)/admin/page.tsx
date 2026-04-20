"use client";

import { supabase } from "@lib/supabase/client";
import { Bus, Megaphone, Route, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";

interface DashboardCounts {
  activeRoutes: number;
  activeNotices: number;
  activeModifications: number;
  recentReports: number;
}

interface RecentReport {
  id: string;
  report_type: string;
  created_at: string;
  route_id: string | null;
}

const typeLabels: Record<string, string> = {
  did_not_pass: "No pasó",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [routesRes, noticesRes, modsRes, reportsCountRes, reportsRes] =
        await Promise.all([
          supabase
            .from("routes")
            .select("id", { count: "exact" })
            .eq("is_active", true),
          supabase
            .from("notices")
            .select("id", { count: "exact" })
            .or("expires_at.is.null,expires_at.gt.now()"),
          supabase
            .from("route_modifications")
            .select("id", { count: "exact" })
            .eq("status", "active"),
          supabase
            .from("reports")
            .select("id", { count: "exact" })
            .gte("created_at", yesterday),
          supabase
            .from("reports")
            .select("id, report_type, created_at, route_id")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

      setCounts({
        activeRoutes: routesRes.count ?? 0,
        activeNotices: noticesRes.count ?? 0,
        activeModifications: modsRes.count ?? 0,
        recentReports: reportsCountRes.count ?? 0,
      });

      if (reportsRes.data) setRecentReports(reportsRes.data);
      setIsLoading(false);
    }

    load();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col gap-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    {
      label: "Rutas activas",
      value: counts?.activeRoutes ?? 0,
      icon: Bus,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Avisos activos",
      value: counts?.activeNotices ?? 0,
      icon: Megaphone,
      color: "text-orange-400",
      bg: "bg-orange-500/10",
    },
    {
      label: "Modificaciones",
      value: counts?.activeModifications ?? 0,
      icon: Route,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Reportes (24h)",
      value: counts?.recentReports ?? 0,
      icon: TriangleAlert,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="p-8 flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Resumen del sistema</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {recentReports.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">
            Últimos reportes
          </h2>
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            {recentReports.map((report, i) => (
              <div
                key={report.id}
                className={`flex items-center gap-3 px-5 py-3 text-sm ${
                  i < recentReports.length - 1
                    ? "border-b border-zinc-800/60"
                    : ""
                }`}
              >
                <span className="text-zinc-400 flex-1">
                  {typeLabels[report.report_type] ?? report.report_type}
                </span>
                <span className="text-xs text-zinc-600">
                  {new Date(report.created_at).toLocaleString("es-MX", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
