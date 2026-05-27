import type { RouteHealth } from "@hooks/admin/use-dashboard-data";
import { cn } from "@lib/utils";
import Link from "next/link";

interface RouteHealthPanelProps {
  routes: RouteHealth[];
  isLoading: boolean;
}

const levelConfig = {
  ok: {
    dot: "bg-emerald-400",
    text: "text-emerald-400",
    label: "OK",
    bar: "bg-emerald-500/30",
  },
  warning: {
    dot: "bg-yellow-400",
    text: "text-yellow-400",
    label: "Atención",
    bar: "bg-yellow-500/40",
  },
  critical: {
    dot: "bg-red-400 animate-pulse",
    text: "text-red-400",
    label: "Incidentes",
    bar: "bg-red-500/40",
  },
};

export function RouteHealthPanel({ routes, isLoading }: RouteHealthPanelProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-10 rounded-lg bg-zinc-800/50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (routes.length === 0) {
    return <p className="text-sm text-zinc-600">Sin rutas activas</p>;
  }

  const sorted = [...routes].sort((a, b) => b.recentReports - a.recentReports);

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map((route) => {
        const cfg = levelConfig[route.level];
        return (
          <Link
            key={route.id}
            href={`/admin/reports?route=${route.id}`}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/4 transition-colors group"
          >
            <span className={cn("h-2 w-2 rounded-full shrink-0", cfg.dot)} />
            <span className="text-sm text-zinc-300 flex-1 group-hover:text-white transition-colors truncate">
              {route.name}
            </span>
            <span className={cn("text-xs font-medium tabular-nums", cfg.text)}>
              {route.recentReports > 0
                ? `${route.recentReports} reportes`
                : cfg.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
