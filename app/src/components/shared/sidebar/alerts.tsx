"use client";

import { REPORT_TYPE_LABEL } from "@lib/constants";
import { useMapData } from "@providers/map-provider";
import {
  AlertTriangle,
  Ban,
  Bell,
  Bus,
  CalendarClock,
  Clock,
  Construction,
  Flag,
  Info,
  Megaphone,
  Navigation,
  Radio,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type NoticeCategory =
  | "delay"
  | "detour"
  | "cancellation"
  | "schedule_change"
  | "incident"
  | "info"
  | "maintenance";

const categoryConfig: Record<
  NoticeCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  delay: { label: "Retraso", icon: Clock, color: "text-yellow-400" },
  detour: { label: "Desvío", icon: Navigation, color: "text-orange-400" },
  cancellation: { label: "Cancelación", icon: Ban, color: "text-red-400" },
  schedule_change: {
    label: "Cambio de horario",
    icon: CalendarClock,
    color: "text-blue-400",
  },
  incident: { label: "Incidente", icon: AlertTriangle, color: "text-red-500" },
  info: { label: "Información", icon: Info, color: "text-sky-400" },
  maintenance: {
    label: "Mantenimiento",
    icon: Construction,
    color: "text-zinc-400",
  },
};

const priorityConfig = {
  urgent: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: Zap,
    label: "Crítico",
  },
  high: {
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    icon: AlertTriangle,
    label: "Alto",
  },
  medium: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: Bell,
    label: "Medio",
  },
  low: {
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Info,
    label: "Bajo",
  },
};

export default function AlertsTab() {
  const { reportCounts, notices, temporaryOverrides, routes, alertsLoading } =
    useMapData();

  const routeNames = Object.fromEntries(routes.map((r) => [r.id, r.name]));

  const getRouteName = (routeId: string) =>
    routes.find((route) => route.id === routeId)?.name ?? "Ruta sin nombre";

  if (alertsLoading) {
    return (
      <div className="p-5 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty =
    notices.length === 0 &&
    temporaryOverrides.length === 0 &&
    reportCounts.length === 0;

  return (
    <div className="p-5 flex flex-col gap-5">
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-3 text-center"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center"
          >
            <Radio className="text-emerald-400" size={22} />
          </motion.div>
          <p className="text-sm font-medium text-white/80">
            Sin avisos activos
          </p>
          <p className="text-xs text-zinc-500">
            El servicio opera con normalidad
          </p>
        </motion.div>
      )}

      {notices.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Avisos
          </h3>
          <div className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout">
              {notices.map((notice, i) => {
                const cfg = priorityConfig[notice.priority];
                const PriorityIcon = cfg.icon;
                const cat = notice.category as NoticeCategory | undefined;
                const catCfg = cat ? categoryConfig[cat] : null;
                const CategoryIcon = catCfg?.icon;

                const affectedRoutes = (notice.affected_route_ids ?? [])
                  .map((id: string) => routeNames[id])
                  .filter(Boolean);

                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.01, x: 2 }}
                    transition={{
                      delay: i * 0.05,
                      type: "spring",
                      stiffness: 400,
                      damping: 25,
                    }}
                    className={`rounded-xl border p-4 ${cfg.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <PriorityIcon
                        className={`shrink-0 mt-0.5 ${cfg.color}`}
                        size={15}
                      />
                      <div className="flex-1 min-w-0">
                        {/* Category */}
                        {catCfg && CategoryIcon && (
                          <div className="flex items-center gap-1 mb-1">
                            <CategoryIcon size={9} className={catCfg.color} />
                            <span
                              className={`text-[9px] font-semibold uppercase tracking-wide ${catCfg.color}`}
                            >
                              {catCfg.label}
                            </span>
                          </div>
                        )}

                        {/* Title + priority */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-sm font-semibold text-white leading-tight">
                            {notice.title}
                          </span>
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded-full bg-black/20 ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </div>

                        {/* Content */}
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {notice.content}
                        </p>

                        {/* Affected routes */}
                        {affectedRoutes.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <Bus size={9} className="text-zinc-600 shrink-0" />
                            {affectedRoutes.map((name: string) => (
                              <span
                                key={name}
                                className="text-[9px] font-medium bg-black/30 text-zinc-400 rounded-full px-1.5 py-0.5"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Dates */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {notice.start_at && (
                            <p className="text-[9px] text-zinc-600 flex items-center gap-1">
                              <Clock size={8} />
                              Desde{" "}
                              {new Date(notice.start_at).toLocaleTimeString(
                                "es-MX",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          )}
                          {notice.expires_at && (
                            <p className="text-[9px] text-zinc-600 flex items-center gap-1">
                              <CalendarClock size={8} />
                              Hasta{" "}
                              {new Date(notice.expires_at).toLocaleDateString(
                                "es-MX",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}

      {temporaryOverrides.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Desvíos Temporales
          </h3>
          <div className="flex flex-col gap-2.5">
            {temporaryOverrides.map((override, i) => (
              <motion.div
                key={override.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.01, x: 2 }}
                transition={{
                  delay: i * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <Megaphone
                    className="shrink-0 mt-0.5 text-orange-400"
                    size={16}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white leading-relaxed">
                      {getRouteName(override.route_id)}
                    </p>
                    <p className="text-xs text-zinc-400 mt-1">
                      Esta ruta opera con un desvío temporal activo.
                    </p>
                    <p className="text-xs text-zinc-500 mt-1.5">
                      Activo desde{" "}
                      {new Date(override.valid_from).toLocaleDateString(
                        "es-MX",
                      )}
                    </p>
                    {override.valid_to && (
                      <p className="text-xs text-zinc-500 mt-1">
                        Válido hasta{" "}
                        {new Date(override.valid_to).toLocaleDateString(
                          "es-MX",
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {reportCounts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Reportes de Estudiantes · Hoy
          </h3>
          <div className="flex flex-col gap-2.5">
            {reportCounts.map((rc, i) => (
              <motion.div
                key={`${rc.route_id}-${rc.stop_id}-${rc.report_type}`}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.01, x: 2 }}
                transition={{
                  delay: i * 0.05,
                  type: "spring",
                  stiffness: 400,
                  damping: 25,
                }}
                className="rounded-xl border border-red-500/20 bg-red-500/8 p-4"
              >
                <div className="flex items-start gap-3">
                  <Flag className="shrink-0 mt-0.5 text-red-400" size={15} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white leading-tight">
                        {REPORT_TYPE_LABEL[rc.report_type] ?? rc.report_type}
                      </span>
                      <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {rc.report_count}×
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {rc.route_name}
                      {rc.stop_name ? ` · ${rc.stop_name}` : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
