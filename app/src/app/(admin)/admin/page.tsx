"use client";

import { ActivityFeed } from "@components/admin/activity-feed";
import { AlertBar } from "@components/admin/alert-bar";
import { DatePicker } from "@components/admin/date-picker";
import { KPICard } from "@components/admin/kpi-card";
import { LiveIndicator } from "@components/admin/live-indicator";
import { QuickActions } from "@components/admin/quick-actions";
import { RouteHealthPanel } from "@components/admin/route-health-panel";
import { SectionHeader } from "@components/admin/section-header";
import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { Textarea } from "@components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  buildAlerts,
  useDashboardKPIs,
  useRecentReports,
  useRouteHealth,
} from "@hooks/admin/use-dashboard-data";
import { useCreateNotice } from "@hooks/admin/use-notices";
import type { Notice, NoticePayload } from "@hooks/admin/use-notices";
import { useAuth } from "@providers/auth-provider";
import { useRealtimeCtx } from "@providers/realtime-provider";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Loader2,
  Map,
  Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

const noticeSchema = z.object({
  title: z.string().min(3, "Mínimo 3 caracteres").max(120, "Máximo 120 caracteres"),
  content: z.string().min(10, "Mínimo 10 caracteres").max(1000, "Máximo 1000 caracteres"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  expires_at: z.date().optional(),
});

type NoticeFormValues = z.infer<typeof noticeSchema>;

const priorityOptions: { value: Notice["priority"]; label: string }[] = [
  { value: "low", label: "Bajo" },
  { value: "medium", label: "Medio" },
  { value: "high", label: "Alto" },
  { value: "urgent", label: "Urgente" },
];

function NoticeForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (v: NoticeFormValues) => void;
  isPending: boolean;
}) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(noticeSchema),
    defaultValues: { priority: "medium" },
  });
  const content = watch("content") ?? "";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 px-5 pb-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qa-notice-title" className="text-xs text-zinc-500 font-medium">
          Título
        </Label>
        <Input
          id="qa-notice-title"
          placeholder="Título del aviso"
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && <p className="text-[11px] text-destructive">{errors.title.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qa-notice-content" className="text-xs text-zinc-500 font-medium">
          Contenido
        </Label>
        <Textarea
          id="qa-notice-content"
          placeholder="Descripción del aviso…"
          rows={3}
          aria-invalid={!!errors.content}
          {...register("content")}
        />
        <div className="flex items-center justify-end gap-2">
          {errors.content && (
            <p className="text-[11px] text-destructive flex-1">{errors.content.message}</p>
          )}
          <p className="text-[10px] text-zinc-600 ml-auto">{content.length}/1000</p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label className="text-xs text-zinc-500 font-medium">Prioridad</Label>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <Label className="text-xs text-zinc-500 font-medium">Expira (opcional)</Label>
          <Controller
            name="expires_at"
            control={control}
            render={({ field }) => (
              <DatePicker
                value={field.value}
                onChange={field.onChange}
                placeholder="Sin fecha"
                fromDate={new Date()}
              />
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending && <Loader2 size={14} className="animate-spin mr-2" />}
        Crear aviso
      </Button>
    </form>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userData } = useAuth();
  const { isLive, newCount, clearNewCount } = useRealtimeCtx();
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: recentReports = [], isLoading: reportsLoading } = useRecentReports();
  const { data: routeHealth = [], isLoading: healthLoading } = useRouteHealth();
  const createNotice = useCreateNotice();

  const alerts = useMemo(() => buildAlerts(kpis, routeHealth), [kpis, routeHealth]);

  const routes = useMemo(
    () => Object.fromEntries(routeHealth.map((route) => [route.id, route.name])),
    [routeHealth],
  );

  const prevKpisRef = useRef(kpis);
  useEffect(() => {
    if (kpis !== undefined && kpis !== prevKpisRef.current) {
      setLastUpdated(new Date());
      prevKpisRef.current = kpis;
    }
  }, [kpis]);

  async function handleRefresh() {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }

  function handleCreateNotice(values: NoticeFormValues) {
    if (!userData) return;

    const payload: NoticePayload = {
      title: values.title,
      content: values.content,
      priority: values.priority,
      category: "info",
      affected_route_ids: [],
      admin_id: userData.id,
    };

    if (values.expires_at) payload.expires_at = values.expires_at.toISOString();
    createNotice.mutate(payload, { onSuccess: () => setNoticeOpen(false) });
  }

  const systemStatus =
    alerts.some((alert) => alert.severity === "critical")
      ? "critical"
      : alerts.some((alert) => alert.severity === "warning")
        ? "warning"
        : "ok";

  const statusConfig = {
    ok: {
      icon: CheckCircle2,
      label: "Sistema operando normalmente",
      color: "text-emerald-400",
      dot: "bg-emerald-400",
    },
    warning: {
      icon: AlertTriangle,
      label: "Atención requerida",
      color: "text-yellow-400",
      dot: "bg-yellow-400 animate-pulse",
    },
    critical: {
      icon: AlertTriangle,
      label: "Incidentes activos",
      color: "text-red-400",
      dot: "bg-red-400 animate-pulse",
    },
  }[systemStatus];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="flex flex-col min-h-full">
      <AlertBar alerts={alerts} />

      <div className="flex-1 p-6 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Dashboard</h1>
            <p className="text-xs text-zinc-500 mt-1.5 capitalize">
              {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${statusConfig.color}`}>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusConfig.dot}`} />
              {statusConfig.label}
            </div>
            <div className="w-px h-4 bg-zinc-800" />
            <LiveIndicator
              isLive={isLive}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <KPICard
            label="Reportes hoy"
            value={kpisLoading ? "—" : (kpis?.reportsToday ?? 0)}
            icon={AlertTriangle}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
            href="/admin/reports"
            highlight={(kpis?.pendingReports ?? 0) >= 10}
            delta={kpis?.reportsTodayDelta ?? null}
            deltaLabel="vs ayer"
            badge={
              (kpis?.pendingReports ?? 0) > 0 ? (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
                  {kpis?.pendingReports} pendientes
                </span>
              ) : undefined
            }
          />
          <KPICard
            label="Rutas activas"
            value={kpisLoading ? "—" : (kpis?.activeRoutes ?? 0)}
            icon={Bus}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
          />
          <KPICard
            label="Avisos activos"
            value={kpisLoading ? "—" : (kpis?.activeNotices ?? 0)}
            icon={Megaphone}
            iconColor="text-orange-400"
            iconBg="bg-orange-500/10"
            href="/admin/notices"
            badge={
              (kpis?.expiringNotices ?? 0) > 0 ? (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                  {kpis?.expiringNotices} expira
                </span>
              ) : undefined
            }
          />
          <KPICard
            label="Desvíos activos"
            value={kpisLoading ? "—" : (kpis?.activeOverrides ?? 0)}
            icon={Map}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
            href="/admin/modifications"
            badge={
              (kpis?.expiringOverrides ?? 0) > 0 ? (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                  {kpis?.expiringOverrides} expira
                </span>
              ) : undefined
            }
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1">
          <div className="xl:col-span-2 rounded-xl border border-zinc-800/60 bg-zinc-900/30 flex flex-col">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-zinc-800/60">
              <SectionHeader>Actividad reciente</SectionHeader>
              {newCount > 0 && (
                <button
                  type="button"
                  onClick={clearNewCount}
                  className="flex items-center gap-1.5 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {newCount} nuevo{newCount > 1 ? "s" : ""}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-auto px-4 pb-2">
              <ActivityFeed
                reports={recentReports}
                isLoading={reportsLoading}
                routes={routes}
                newCount={newCount}
                onClearNew={clearNewCount}
              />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4">
              <SectionHeader>Acciones rápidas</SectionHeader>
              <QuickActions
                onNewNotice={() => setNoticeOpen(true)}
                onManageRoutes={() => router.push("/admin/modifications")}
              />
            </div>

            <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 flex-1">
              <SectionHeader>Estado de rutas</SectionHeader>
              <RouteHealthPanel routes={routeHealth} isLoading={healthLoading} />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={noticeOpen} onOpenChange={setNoticeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo aviso</DialogTitle>
          </DialogHeader>
          <NoticeForm onSubmit={handleCreateNotice} isPending={createNotice.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
