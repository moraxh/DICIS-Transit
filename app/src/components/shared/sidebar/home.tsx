"use client";

import {
  formatTime,
  getActiveBuses,
  getNearestStopWithNextArrival,
  getUpcomingDepartures,
  haversineMeters,
} from "@lib/schedule-utils";
import { supabase } from "@lib/supabase/client";
import { useMapData } from "@providers/map-provider";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bus,
  ChevronRight,
  Flag,
  Loader2,
  MapPin,
  Navigation,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

const DICIS_LAT = 20.549879054215197;
const DICIS_LNG = -101.2008414859346;

const reportTypeLabel: Record<string, string> = {
  did_not_pass: "No pasó el camión",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

export default function HomeTab() {
  const {
    routes,
    isLoading,
    userLocation,
    reportCounts,
    activeRouteId,
    setActiveRouteId,
    setActiveStopId,
  } = useMapData();
  const [urgentCount, setUrgentCount] = useState<number | null>(null);
  const [firstUrgent, setFirstUrgent] = useState<string | null>(null);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [modCount, setModCount] = useState(0);
  const [firstMod, setFirstMod] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadAlerts() {
      const [noticesRes, modsRes] = await Promise.all([
        supabase
          .from("notices")
          .select("title, priority")
          .or("expires_at.is.null,expires_at.gt.now()")
          .in("priority", ["urgent", "high"]),
        supabase
          .from("route_modifications")
          .select("description")
          .eq("status", "active")
          .or("valid_to.is.null,valid_to.gt.now()"),
      ]);

      if (noticesRes.data) {
        setUrgentCount(noticesRes.data.length);
        setFirstUrgent(noticesRes.data[0]?.title ?? null);
      }
      if (modsRes.data) {
        setModCount(modsRes.data.length);
        setFirstMod(modsRes.data[0]?.description ?? null);
      }
      setAlertsLoading(false);
    }
    loadAlerts();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const nearDicis = userLocation
    ? haversineMeters(userLocation[0], userLocation[1], DICIS_LAT, DICIS_LNG) <
      500
    : null;

  const suggestedDirection: "to_dicis" | "from_dicis" | null =
    nearDicis === null ? null : nearDicis ? "from_dicis" : "to_dicis";

  const isHydrating = !mounted;
  const showLoading = isLoading || isHydrating;

  const allDepartures = showLoading ? [] : getUpcomingDepartures(routes, 10);
  const upcomingDepartures = allDepartures
    .filter((dep) => {
      if (!suggestedDirection) return true;
      const route = routes.find((r) => r.id === dep.routeId);
      return route?.direction === suggestedDirection;
    })
    .slice(0, 5);

  const activeBusCount = showLoading
    ? 0
    : routes.reduce((acc, r) => acc + getActiveBuses(r).length, 0);

  const nearestStop = showLoading
    ? null
    : getNearestStopWithNextArrival(routes, userLocation, suggestedDirection);

  const directionLabel =
    suggestedDirection === "from_dicis"
      ? "Desde DICIS"
      : suggestedDirection === "to_dicis"
        ? "Hacia DICIS"
        : null;

  const directionSub =
    suggestedDirection === "from_dicis"
      ? "Estás cerca de DICIS · rutas de regreso"
      : suggestedDirection === "to_dicis"
        ? "Rutas desde Salamanca hacia DICIS"
        : null;

  const directionFrom =
    suggestedDirection === "from_dicis" ? "DICIS" : "Salamanca";

  const directionTo = suggestedDirection === "from_dicis" ? "ENMSS" : "DICIS";

  function formatDistance(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  function focusStopOnMap(routeId: string, stopId: string) {
    if (routeId !== activeRouteId) setActiveRouteId(routeId);
    setActiveStopId(stopId);
  }

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Route modifications banner */}
      {!alertsLoading && modCount > 0 && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/8">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {modCount} ruta{modCount !== 1 ? "s" : ""} con modificación
              </p>
              {firstMod && (
                <p className="text-[11px] text-zinc-400 truncate">{firstMod}</p>
              )}
            </div>
            <ChevronRight size={14} className="text-zinc-600 shrink-0" />
          </div>
        </motion.section>
      )}

      {/* Direction indicator */}
      {suggestedDirection && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-900/60">
            <div className="w-8 h-8 rounded-lg bg-white/8 flex items-center justify-center shrink-0">
              {suggestedDirection === "from_dicis" ? (
                <Navigation size={15} className="text-emerald-400" />
              ) : (
                <MapPin size={15} className="text-blue-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                {directionFrom}
                <ArrowRight size={12} className="text-zinc-500" />
                {directionTo}
              </p>
              <p className="text-[11px] text-zinc-500">{directionSub}</p>
            </div>
          </div>
        </motion.section>
      )}

      {/* Nearest stop */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Tu parada más cercana
        </h3>
        {!userLocation ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center">
            <MapPin size={16} className="text-zinc-600 mx-auto mb-1.5" />
            <p className="text-xs text-zinc-500">
              Activa tu ubicación para ver tu parada más cercana
            </p>
          </div>
        ) : showLoading ? (
          <div className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ) : !nearestStop ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center">
            <p className="text-xs text-zinc-500">No hay paradas cercanas</p>
          </div>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() =>
              focusStopOnMap(nearestStop.routeId, nearestStop.stopId)
            }
            className="w-full text-left flex flex-col gap-2 px-4 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                <MapPin size={16} className="text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {nearestStop.stopName}
                </p>
                <p className="text-[11px] text-zinc-500 truncate">
                  {formatDistance(nearestStop.distanceMeters)} ·{" "}
                  {nearestStop.routeName}
                </p>
              </div>
              <ChevronRight size={14} className="text-zinc-600 shrink-0" />
            </div>
            <div className="flex items-center gap-2 pl-12">
              <Timer size={12} className="text-emerald-400 shrink-0" />
              {nearestStop.minutesUntilArrival === null ? (
                <span className="text-[11px] text-zinc-500">
                  Sin más paradas hoy
                </span>
              ) : nearestStop.minutesUntilArrival === 0 ? (
                <span className="text-[11px] font-semibold text-emerald-400">
                  Llegando ahora
                </span>
              ) : nearestStop.minutesUntilArrival <= 5 ? (
                <span className="text-[11px] font-semibold text-orange-400">
                  ¡Pronto! en {nearestStop.minutesUntilArrival} min
                </span>
              ) : (
                <span className="text-[11px] text-zinc-300">
                  Próximo camión en{" "}
                  <span className="font-semibold text-white">
                    {nearestStop.minutesUntilArrival} min
                  </span>
                </span>
              )}
            </div>
          </motion.button>
        )}
      </section>

      {/* Próximas salidas */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Próximas salidas
          {directionLabel && (
            <span className="ml-2 normal-case text-zinc-600">
              · {directionLabel}
            </span>
          )}
        </h3>

        {showLoading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-14 rounded-xl bg-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : upcomingDepartures.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 text-center"
          >
            <p className="text-xs text-zinc-500">
              Sin salidas en las próximas 2 horas
            </p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-2">
            {upcomingDepartures.map((dep, i) => {
              const isSoon = dep.minutesUntil > 0 && dep.minutesUntil <= 5;
              return (
                <motion.div
                  key={`${dep.routeId}-${dep.departureTime}`}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                    isSoon
                      ? "border-orange-500/30 bg-orange-500/8"
                      : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isSoon ? "bg-orange-500/15" : "bg-white/5"
                    }`}
                  >
                    <Bus
                      size={15}
                      className={isSoon ? "text-orange-400" : "text-zinc-300"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {dep.routeName}
                    </p>
                    <p className="text-[11px] text-zinc-500">
                      Sale a las {formatTime(dep.departureTime)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    {dep.minutesUntil === 0 ? (
                      <span className="text-xs font-semibold text-emerald-400">
                        Ahora
                      </span>
                    ) : isSoon ? (
                      <span className="text-xs font-semibold text-orange-400">
                        ¡Pronto! {dep.minutesUntil} min
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-white">
                        en {dep.minutesUntil} min
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reportes recientes */}
      {reportCounts.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Reportes hoy
          </h3>
          <div className="flex flex-col gap-2">
            {reportCounts.slice(0, 3).map((rc, i) => (
              <motion.div
                key={`${rc.route_id}-${rc.stop_id}-${rc.report_type}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 + i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/6"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Flag size={14} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {reportTypeLabel[rc.report_type] ?? rc.report_type}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {rc.route_name}
                    {rc.stop_name ? ` · ${rc.stop_name}` : ""}
                  </p>
                </div>
                <span className="text-xs font-bold text-red-400 shrink-0">
                  {rc.report_count}×
                </span>
              </motion.div>
            ))}
            {reportCounts.length > 3 && (
              <p className="text-[11px] text-zinc-600 text-center">
                +{reportCounts.length - 3} más en Avisos
              </p>
            )}
          </div>
        </motion.section>
      )}

      {/* Estado del servicio */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Estado del servicio
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
        >
          <div
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              activeBusCount > 0
                ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                : "bg-zinc-600"
            }`}
          />
          <div className="flex-1">
            {showLoading ? (
              <Loader2 size={14} className="animate-spin text-zinc-500" />
            ) : activeBusCount > 0 ? (
              <>
                <p className="text-sm font-medium text-white">
                  {activeBusCount} camión{activeBusCount !== 1 ? "es" : ""} en
                  ruta
                </p>
                <p className="text-[11px] text-zinc-500">Servicio activo</p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-zinc-400">
                  Sin camiones activos
                </p>
                <p className="text-[11px] text-zinc-600">
                  Fuera del horario de servicio
                </p>
              </>
            )}
          </div>
        </motion.div>
      </section>

      {/* Avisos activos */}
      <section>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Avisos
        </h3>
        {alertsLoading ? (
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
              urgentCount && urgentCount > 0
                ? "border-orange-500/30 bg-orange-500/8"
                : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <Bell
              size={15}
              className={
                urgentCount && urgentCount > 0
                  ? "text-orange-400 shrink-0"
                  : "text-zinc-600 shrink-0"
              }
            />
            <div className="flex-1">
              {urgentCount && urgentCount > 0 ? (
                <>
                  <p className="text-sm font-medium text-white">
                    {urgentCount} aviso{urgentCount !== 1 ? "s" : ""} importante
                    {urgentCount !== 1 ? "s" : ""}
                  </p>
                  {firstUrgent && (
                    <p className="text-[11px] text-zinc-400 truncate">
                      {firstUrgent}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-500">Sin avisos urgentes</p>
              )}
            </div>
            {urgentCount && urgentCount > 0 ? (
              <ChevronRight size={14} className="text-zinc-600 shrink-0" />
            ) : null}
          </motion.div>
        )}
      </section>
    </div>
  );
}
