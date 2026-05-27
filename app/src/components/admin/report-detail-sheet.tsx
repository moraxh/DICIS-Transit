"use client";

import { StatusBadge } from "@components/admin/status-badge";
import { Button } from "@components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@components/ui/sheet";
import type { CredibilityFactors, Report, ReportStatus } from "@hooks/admin/use-reports";
import { useUpdateReportStatus } from "@hooks/admin/use-reports";
import { supabase } from "@lib/supabase/client";
import { cn } from "@lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bus,
  Clock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";

const typeLabels: Record<string, string> = {
  did_not_pass: "No pasó",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

const statusConfig: Record<
  ReportStatus,
  { label: string; badge: "pending" | "ok" | "critical" | "muted" | "warning" }
> = {
  pending: { label: "Pendiente", badge: "pending" },
  verified: { label: "Verificado", badge: "ok" },
  rejected: { label: "Rechazado", badge: "critical" },
  spam: { label: "Spam", badge: "warning" },
};

interface StopInfo {
  name: string;
  latitude: number;
  longitude: number;
}

interface ReportDetailSheetProps {
  report: Report | null;
  routeName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-zinc-800/60 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={13} className="text-zinc-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-0.5">
          {label}
        </p>
        <div className={cn("text-sm text-zinc-200", mono && "font-mono text-xs")}>{value}</div>
      </div>
    </div>
  );
}

function CredibilityPanel({
  score,
  factors,
}: {
  score: number;
  factors: CredibilityFactors;
}) {
  const scoreColor =
    score >= 75
      ? "text-emerald-400"
      : score >= 50
        ? "text-amber-400"
        : "text-red-400";

  const barColor =
    score >= 75
      ? "bg-emerald-500"
      : score >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  const scoreLabel =
    score >= 75 ? "Alta confianza" : score >= 50 ? "Confianza moderada" : "Confianza baja";

  return (
    <div className="border-t border-zinc-800/60 px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={13} className="text-zinc-500" />
        <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold">
          Credibilidad del reporte
        </p>
        <span className={cn("ml-auto text-sm font-bold font-mono tabular-nums", scoreColor)}>
          {score}
        </span>
      </div>

      {/* Score bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-3 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>

      <p className={cn("text-xs font-medium mb-3", scoreColor)}>{scoreLabel}</p>

      {/* Factors breakdown */}
      <div className="flex flex-col gap-1.5">
        <FactorRow
          label="Corroboraciones en ruta"
          value={factors.same_type_route_corroborations}
          description={`Estudiantes independientes que reportaron lo mismo en la misma ruta (ventana ${factors.time_window_hours}h)`}
        />
        <FactorRow
          label="Corroboraciones en parada"
          value={factors.same_stop_corroborations}
          description="Reportes similares desde la misma parada"
        />
        <FactorRow
          label="Historial del reportante"
          value={factors.reporter_verified_history}
          description="Reportes previos verificados del mismo usuario"
        />
      </div>

      <p className="text-[10px] text-zinc-700 mt-3 leading-relaxed">
        La credibilidad se calcula automáticamente. No puede ser modificada manualmente.
      </p>
    </div>
  );
}

function FactorRow({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-800/40 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-300 font-medium">{label}</p>
        <p className="text-[10px] text-zinc-600 leading-relaxed">{description}</p>
      </div>
      <span
        className={cn(
          "text-xs font-mono font-bold tabular-nums shrink-0",
          value > 0 ? "text-emerald-400" : "text-zinc-600",
        )}
      >
        {value > 0 ? `+${value}` : "0"}
      </span>
    </div>
  );
}

export function ReportDetailSheet({
  report,
  routeName,
  open,
  onOpenChange,
}: ReportDetailSheetProps) {
  const [stop, setStop] = useState<StopInfo | null>(null);
  const [stopLoading, setStopLoading] = useState(false);

  const updateStatus = useUpdateReportStatus();

  useEffect(() => {
    if (!open || !report) return;
    setStop(null);

    if (report.stop_id) {
      setStopLoading(true);
      supabase
        .from("stops")
        .select("name, latitude, longitude")
        .eq("id", report.stop_id)
        .single()
        .then(({ data }) => {
          if (data) setStop(data);
          setStopLoading(false);
        });
    }
  }, [open, report?.id]);

  if (!report) return null;

  const cfg = statusConfig[report.status];

  function handleStatusChange(status: ReportStatus) {
    if (!report) return;
    updateStatus.mutate({ id: report.id, status });
  }

  const mapsUrl =
    stop
      ? `https://www.google.com/maps?q=${stop.latitude},${stop.longitude}`
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge variant={cfg.badge}>{cfg.label}</StatusBadge>
            {report.report_type === "delay" && report.delay_mins && (
              <span className="text-xs text-zinc-500">{report.delay_mins} min de retraso</span>
            )}
          </div>
          <SheetTitle className="text-base">
            {typeLabels[report.report_type] ?? report.report_type}
          </SheetTitle>
          <p className="text-xs text-zinc-500">
            {format(new Date(report.created_at), "EEEE d 'de' MMMM, yyyy · HH:mm", { locale: es })}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-auto px-5 py-2">
          <DetailRow icon={Bus} label="Ruta" value={routeName || "—"} />

          <DetailRow
            icon={MapPin}
            label="Parada"
            value={
              stopLoading ? (
                <span className="text-zinc-600 animate-pulse">Cargando…</span>
              ) : stop ? (
                <div className="flex items-center gap-2">
                  <span>{stop.name}</span>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Ver en Google Maps"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-zinc-600">Sin parada registrada</span>
              )
            }
          />

          {stop && (
            <DetailRow
              icon={MapPin}
              label="Coordenadas"
              value={`${stop.latitude.toFixed(6)}, ${stop.longitude.toFixed(6)}`}
              mono
            />
          )}

          <DetailRow
            icon={User}
            label="Usuario"
            value={
              report.user_id ? (
                <span className="font-mono text-xs text-zinc-400">
                  ···{report.user_id.slice(-8).toUpperCase()}
                </span>
              ) : (
                <span className="text-zinc-600">Anónimo</span>
              )
            }
          />

          <DetailRow
            icon={Clock}
            label="Reportado"
            value={format(new Date(report.created_at), "HH:mm:ss · d MMM yyyy", { locale: es })}
          />
        </div>

        {/* Credibility breakdown */}
        <CredibilityPanel
          score={report.credibility_score}
          factors={report.credibility_factors}
        />

        {/* Status actions footer */}
        <div className="border-t border-zinc-800/60 px-5 py-4">
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-semibold mb-2.5">
            Cambiar estado
          </p>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(statusConfig) as [ReportStatus, typeof statusConfig[ReportStatus]][]).map(
              ([value, s]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={report.status === value ? "secondary" : "outline"}
                  disabled={report.status === value || updateStatus.isPending}
                  onClick={() => handleStatusChange(value)}
                  className="text-xs"
                >
                  {s.label}
                </Button>
              ),
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
