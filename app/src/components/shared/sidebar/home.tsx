"use client";

import { useFavorites } from "@hooks/use-favorites";
import { DICIS_COORDS, REPORT_TYPE_LABEL } from "@lib/constants";
import {
  formatMinutesRelative,
  formatTime,
  getActiveBuses,
  getNearestStopWithNextArrival,
  getNextDeparture,
  getUpcomingDepartures,
  hasServiceToday,
  haversineMeters,
} from "@lib/schedule-utils";
import { useAuth } from "@providers/auth-provider";
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
  Star,
  Timer,
} from "lucide-react";
import { motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function HomeTab() {
  const {
    routes,
    isLoading,
    error,
    userLocation,
    reportCounts,
    activeRouteId,
    setActiveRouteId,
    setActiveStopId,
    notices,
    temporaryOverrides,
    alertsLoading,
  } = useMapData();
  const { userData } = useAuth();
  const { favorites } = useFavorites(userData?.id);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [, setTick] = useState(0);

  const navigateToTab = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const urgentNotices = notices.filter(
    (n) => n.priority === "urgent" || n.priority === "high",
  );
  const urgentCount = alertsLoading ? null : urgentNotices.length;
  const firstUrgent = urgentNotices[0]?.title ?? null;
  const overrideCount = temporaryOverrides.length;
  const firstOverrideRouteId = temporaryOverrides[0]?.route_id ?? null;
  const firstOverrideRoute = firstOverrideRouteId
    ? (routes.find((route) => route.id === firstOverrideRouteId)?.name ?? null)
    : null;

  const nearDicis = userLocation
    ? haversineMeters(
        userLocation[0],
        userLocation[1],
        DICIS_COORDS.lat,
        DICIS_COORDS.lng,
      ) < 500
    : null;

  const suggestedDirection: "to_dicis" | "from_dicis" | null =
    nearDicis === null ? null : nearDicis ? "from_dicis" : "to_dicis";

  const isHydrating = !mounted;
  const showLoading = isLoading || isHydrating;

  const filteredRoutes = suggestedDirection
    ? routes.filter((route) => route.direction === suggestedDirection)
    : routes;

  const upcomingDepartures = showLoading
    ? []
    : getUpcomingDepartures(filteredRoutes, 5);

  const activeBusCount = showLoading
    ? 0
    : filteredRoutes.reduce(
        (acc, route) => acc + getActiveBuses(route).length,
        0,
      );

  const activeOutboundBusCount = showLoading
    ? 0
    : routes
        .filter((route) => route.direction === "to_dicis")
        .reduce((acc, route) => acc + getActiveBuses(route).length, 0);

  const activeReturnBusCount = showLoading
    ? 0
    : routes
        .filter((route) => route.direction === "from_dicis")
        .reduce((acc, route) => acc + getActiveBuses(route).length, 0);

  const totalActiveBusCount = activeOutboundBusCount + activeReturnBusCount;

  const nearestStop = showLoading
    ? null
    : getNearestStopWithNextArrival(routes, userLocation, suggestedDirection);
  const nearestStopDisplayMinutes =
    nearestStop?.minutesUntilArrival == null
      ? null
      : Math.max(0, Math.ceil(nearestStop.minutesUntilArrival));

  const hasServiceInDirection = showLoading
    ? false
    : hasServiceToday(filteredRoutes);
  const nextDeparture = showLoading ? null : getNextDeparture(filteredRoutes);

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
        ? "Basado en tu ubicación actual"
        : null;

  const directionFrom =
    suggestedDirection === "from_dicis" ? "DICIS" : "Salamanca";

  const directionTo = suggestedDirection === "from_dicis" ? "ENMSS" : "DICIS";

  const serviceScopeLabel =
    suggestedDirection === "from_dicis"
      ? "de regreso"
      : suggestedDirection === "to_dicis"
        ? "hacia DICIS"
        : "para hoy";

  const serviceStatus = showLoading
    ? null
    : totalActiveBusCount > 0
      ? {
          title: `${totalActiveBusCount} camión${totalActiveBusCount !== 1 ? "es" : ""} en ruta`,
          detail: `Ida: ${activeOutboundBusCount} · Regreso: ${activeReturnBusCount}`,
          tone: "active" as const,
        }
      : !hasServiceInDirection
        ? {
            title: "Sin servicio programado hoy",
            detail: `Hoy no hay corridas ${serviceScopeLabel}`,
            tone: "inactive" as const,
          }
        : nextDeparture
          ? {
              title: "Sin camiones activos en este momento",
              detail: `La próxima salida ${formatMinutesRelative(nextDeparture.minutesUntil)} · ${formatTime(nextDeparture.departureTime)}`,
              tone: "waiting" as const,
            }
          : {
              title: "Servicio terminado por hoy",
              detail: `Ya no quedan salidas ${serviceScopeLabel}`,
              tone: "inactive" as const,
            };

  function formatDistance(m: number): string {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1)} km`;
  }

  function focusStopOnMap(routeId: string, stopId: string) {
    if (routeId !== activeRouteId) setActiveRouteId(routeId);
    setActiveStopId(stopId);
  }

  if (error) {
    return (
      <div className="p-5 flex flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-sm font-medium text-zinc-300">
          No se pudo cargar el servicio
        </p>
        <p className="text-xs text-zinc-500">{error.message}</p>
      </div>
    );
  }

  const favoriteRoutes = favorites
    .map((id) => routes.find((r) => r.id === id))
    .filter(Boolean) as typeof routes;

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* Favoritos */}
      {favoriteRoutes.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Star className="w-3 h-3 text-amber-400" fill="currentColor" />
            Favoritos
          </h3>
          <div className="flex flex-col gap-2">
            {favoriteRoutes.map((route) => (
              <motion.button
                key={route.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                onClick={() => setActiveRouteId(route.id)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  route.id === activeRouteId
                    ? "border-amber-500/30 bg-amber-500/8"
                    : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <MapPin size={14} className="text-amber-400" />
                </div>
                <p className="text-sm font-medium text-white truncate flex-1">
                  {route.name}
                </p>
                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
              </motion.button>
            ))}
          </div>
        </motion.section>
      )}

      {/* Nearest stop — only useful when there's active or upcoming service */}
      {(showLoading ||
        activeBusCount > 0 ||
        (nextDeparture !== null && hasServiceInDirection)) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                  <p className="text-xs text-zinc-500 truncate">
                    {formatDistance(nearestStop.distanceMeters)} ·{" "}
                    {nearestStop.routeName}
                  </p>
                </div>
                <ChevronRight size={14} className="text-zinc-600 shrink-0" />
              </div>
              <div className="flex items-center gap-2 pl-12">
                <Timer size={12} className="text-emerald-400 shrink-0" />
                {nearestStop.minutesUntilArrival === null ? (
                  <span className="text-xs text-zinc-500">
                    Ya no pasan camiones hoy por esta parada
                  </span>
                ) : nearestStopDisplayMinutes === 0 ? (
                  <span className="text-xs font-semibold text-emerald-400">
                    Llegando ahora
                  </span>
                ) : nearestStopDisplayMinutes !== null &&
                  nearestStopDisplayMinutes <= 5 ? (
                  <span className="text-xs font-semibold text-orange-400">
                    ¡Pronto! en {nearestStopDisplayMinutes} min
                  </span>
                ) : (
                  <span className="text-xs text-zinc-300">
                    Próximo camión{" "}
                    <span className="font-semibold text-white">
                      {formatMinutesRelative(nearestStop.minutesUntilArrival)}
                    </span>
                  </span>
                )}
              </div>
            </motion.button>
          )}
        </motion.section>
      )}

      {/* Próximas salidas — hide when no service today and no upcoming departures */}
      {(showLoading ||
        upcomingDepartures.length > 0 ||
        nextDeparture !== null) && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.06 }}
        >
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
              {!hasServiceInDirection ? (
                <p className="text-xs text-zinc-500">
                  Hoy no hay salidas programadas {serviceScopeLabel}
                </p>
              ) : nextDeparture ? (
                <p className="text-xs text-zinc-500">
                  La próxima salida es a las{" "}
                  {formatTime(nextDeparture.departureTime)}
                </p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Ya no quedan salidas hoy
                </p>
              )}
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingDepartures.map((dep, i) => {
                const displayMinutes = Math.max(0, Math.ceil(dep.minutesUntil));
                const isSoon = displayMinutes > 0 && displayMinutes <= 5;
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
                      <p className="text-xs text-zinc-500">
                        Sale a las {formatTime(dep.departureTime)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {displayMinutes === 0 ? (
                        <span className="text-xs font-semibold text-emerald-400">
                          Ahora
                        </span>
                      ) : isSoon ? (
                        <span className="text-xs font-semibold text-orange-400">
                          ¡Pronto! {displayMinutes} min
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-white">
                          {formatMinutesRelative(dep.minutesUntil)}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.section>
      )}

      {/* Direction indicator — only show when there's active or upcoming service */}
      {suggestedDirection && (activeBusCount > 0 || nextDeparture !== null) && (
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
                <ArrowRight
                  size={12}
                  className="text-zinc-500 shrink-0"
                  aria-hidden="true"
                />
                {directionTo}
              </p>
              <p className="text-xs text-zinc-500">{directionSub}</p>
            </div>
          </div>
        </motion.section>
      )}

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
                    {REPORT_TYPE_LABEL[rc.report_type] ?? rc.report_type}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
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
              <p className="text-xs text-zinc-600 text-center">
                +{reportCounts.length - 3} más en Avisos
              </p>
            )}
          </div>
        </motion.section>
      )}

      {/* Estado del servicio */}
      <motion.section
        data-tour="service-status"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.12 }}
      >
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Estado del servicio
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
        >
          <div className="relative shrink-0 w-2.5 h-2.5">
            {serviceStatus?.tone === "active" && (
              <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 animate-ping" />
            )}
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                serviceStatus?.tone === "active"
                  ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                  : serviceStatus?.tone === "waiting"
                    ? "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]"
                    : "bg-zinc-600"
              }`}
            />
          </div>
          <div className="flex-1">
            {showLoading ? (
              <Loader2 size={14} className="animate-spin text-zinc-500" />
            ) : serviceStatus?.tone === "active" ? (
              <>
                <p className="text-sm font-medium text-white">
                  {serviceStatus.title}
                </p>
                <p className="text-xs text-zinc-500">{serviceStatus.detail}</p>
              </>
            ) : serviceStatus ? (
              <>
                <p
                  className={`text-sm font-medium ${
                    serviceStatus.tone === "waiting"
                      ? "text-amber-300"
                      : "text-zinc-400"
                  }`}
                >
                  {serviceStatus.title}
                </p>
                <p className="text-xs text-zinc-500">{serviceStatus.detail}</p>
              </>
            ) : null}
          </div>
        </motion.div>
      </motion.section>

      {/* Avisos activos */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
        className="flex flex-col gap-2"
      >
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          Avisos
        </h3>

        {/* Desvíos temporales */}
        {!alertsLoading && overrideCount > 0 && (
          <motion.button
            type="button"
            onClick={() => navigateToTab("alerts")}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/8 cursor-pointer"
          >
            <AlertTriangle size={15} className="text-orange-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">
                {overrideCount} ruta{overrideCount !== 1 ? "s" : ""} con desvío
                temporal
              </p>
              {firstOverrideRoute && (
                <p className="text-xs text-zinc-500 truncate">
                  {firstOverrideRoute}
                </p>
              )}
            </div>
            <ChevronRight size={14} className="text-zinc-600 shrink-0" />
          </motion.button>
        )}

        {/* Avisos urgentes */}
        {alertsLoading ? (
          <div className="h-14 rounded-xl bg-white/5 animate-pulse" />
        ) : (
          <motion.button
            type="button"
            onClick={() => navigateToTab("alerts")}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              delay: 0.15,
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors cursor-pointer ${
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
                    <p className="text-xs text-zinc-400 truncate">
                      {firstUrgent}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-zinc-500">Sin avisos urgentes</p>
              )}
            </div>
            <ChevronRight size={14} className="text-zinc-600 shrink-0" />
          </motion.button>
        )}
      </motion.section>
    </div>
  );
}
