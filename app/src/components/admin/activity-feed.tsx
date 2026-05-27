"use client";

import type { RecentReport } from "@hooks/admin/use-dashboard-data";
import { cn } from "@lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { AlertCircle, Bus, Clock, Users } from "lucide-react";
import Link from "next/link";

const typeConfig: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  did_not_pass: {
    label: "No pasó",
    icon: Bus,
    color: "text-red-400 bg-red-500/10",
  },
  full_bus: {
    label: "Venía lleno",
    icon: Users,
    color: "text-orange-400 bg-orange-500/10",
  },
  early: {
    label: "Se adelantó",
    icon: Clock,
    color: "text-blue-400 bg-blue-500/10",
  },
  delay: {
    label: "Se tardó",
    icon: Clock,
    color: "text-yellow-400 bg-yellow-500/10",
  },
};

const statusColors: Record<string, string> = {
  pending: "text-zinc-400",
  verified: "text-emerald-400",
  rejected: "text-red-400",
  spam: "text-orange-400",
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  verified: "Verificado",
  rejected: "Rechazado",
  spam: "Spam",
};

interface ActivityFeedProps {
  reports: RecentReport[];
  isLoading: boolean;
  routes: Record<string, string>;
  newCount: number;
  onClearNew: () => void;
}

export function ActivityFeed({
  reports,
  isLoading,
  routes,
  newCount,
  onClearNew,
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-12 rounded-lg bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2">
        <AlertCircle size={20} className="text-zinc-700" />
        <p className="text-sm text-zinc-600">Sin actividad reciente</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {newCount > 0 && (
        <button
          type="button"
          onClick={onClearNew}
          className="flex items-center justify-center gap-1.5 py-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors border-b border-zinc-800/60"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {newCount} nuevo{newCount > 1 ? "s" : ""} · Click para marcar como
          visto
        </button>
      )}
      {reports.map((report) => {
        const cfg = typeConfig[report.report_type] ?? {
          label: report.report_type,
          icon: AlertCircle,
          color: "text-zinc-400 bg-zinc-800",
        };
        const Icon = cfg.icon;
        const routeName = report.route_id
          ? (routes[report.route_id] ?? "—")
          : "—";

        return (
          <Link
            key={report.id}
            href={`/admin/reports`}
            className="flex items-start gap-3 px-1 py-3 border-b border-zinc-800/40 hover:bg-white/3 transition-colors last:border-0 group"
          >
            <div
              className={cn(
                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                cfg.color,
              )}
            >
              <Icon size={13} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-zinc-300 group-hover:text-white transition-colors font-medium truncate">
                  {cfg.label}
                </span>
                <span
                  className={cn(
                    "text-xs shrink-0",
                    statusColors[report.status] ?? "text-zinc-500",
                  )}
                >
                  {statusLabels[report.status] ?? report.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-zinc-600 truncate">
                  {routeName}
                </span>
                <span className="text-zinc-800">·</span>
                <span className="text-xs text-zinc-700 shrink-0">
                  {formatDistanceToNow(new Date(report.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
