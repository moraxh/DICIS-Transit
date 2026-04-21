"use client";

import { useMapData } from "@providers/map-provider";
import clsx from "clsx";
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheck,
  Clock,
  History,
  Loader2,
  MapPin,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

type ScheduleType = "L-V" | "Sábado";
type DirectionType = "Ida" | "Regreso";

function formatTime(time24: string) {
  const [hRaw, m] = time24.split(":");
  const h = Number(hRaw);
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function getMinutesUntil(departureTime: string): number {
  const now = new Date();
  const [h, m] = departureTime.split(":").map(Number);
  const scheduleMinutes = h * 60 + m;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return scheduleMinutes - currentMinutes;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `en ${h}h ${m}m` : `en ${h}h`;
}

function isSchedulePassed(departureTime: string): boolean {
  const now = new Date();
  const [h, m] = departureTime.split(":").map(Number);
  const scheduleMinutes = h * 60 + m;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes > scheduleMinutes;
}

function getNextScheduleIndex(schedules: { departure_time: string }[]): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < schedules.length; i++) {
    const [h, m] = schedules[i].departure_time.split(":").map(Number);
    const scheduleMinutes = h * 60 + m;
    if (currentMinutes <= scheduleMinutes) {
      return i;
    }
  }
  return -1;
}

interface ScheduleItem {
  id: string;
  departure_time: string;
  days_active?: number[];
}

function ScheduleList({ schedules }: { schedules: ScheduleItem[] }) {
  const [tick, setTick] = useState(0);
  const nextIdx = getNextScheduleIndex(schedules);

  // Auto-refresh every minute to update "en X min" indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if next schedule is urgent (< 10 minutes)
  const isUrgent =
    nextIdx >= 0 && getMinutesUntil(schedules[nextIdx].departure_time) < 10;

  return (
    <div key={tick} className="space-y-3">
      {nextIdx > 0 && (
        <div className="flex items-center gap-2 px-2">
          <History className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          <span className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Ya pasaron ({nextIdx})
          </span>
          <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-700/50" />
        </div>
      )}

      {/* Urgent indicator */}
      {isUrgent && nextIdx >= 0 && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50"
        >
          <AlertCircle className="w-4 h-4 text-orange-500" />
          <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">
            {formatMinutes(getMinutesUntil(schedules[nextIdx].departure_time))}{" "}
            - ¡Coyeye!
          </span>
        </motion.div>
      )}

      <ul className="space-y-1.5">
        {schedules.map((sch, idx) => {
          const isPassed = isSchedulePassed(sch.departure_time);
          const isNext = idx === nextIdx;
          const minutesUntil = getMinutesUntil(sch.departure_time);

          return (
            <motion.li
              key={sch.id}
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: idx * 0.04 }}
              className={clsx(
                "relative flex items-center gap-3 py-2 px-3 rounded-xl transition-all duration-200",
                isPassed
                  ? "opacity-40 hover:opacity-60 bg-zinc-100/40 dark:bg-zinc-800/30"
                  : isNext
                    ? isUrgent
                      ? "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 shadow-sm"
                      : "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
                    : "bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/60 dark:hover:bg-zinc-700/50",
              )}
            >
              <div
                className={clsx(
                  "shrink-0 rounded-full p-1 transition-colors",
                  isPassed
                    ? "bg-zinc-200 dark:bg-zinc-700"
                    : isNext
                      ? isUrgent
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-emerald-500 text-white shadow-sm"
                      : "bg-white dark:bg-zinc-700 shadow-sm",
                )}
              >
                {isPassed ? (
                  <Circle className="w-3 h-3 text-zinc-500 dark:text-zinc-400" />
                ) : isNext ? (
                  isUrgent ? (
                    <AlertCircle className="w-3 h-3" />
                  ) : (
                    <Clock className="w-3 h-3" />
                  )
                ) : (
                  <CircleCheck className="w-3 h-3 text-zinc-600 dark:text-zinc-300" />
                )}
              </div>

              <div className="flex items-center justify-between w-full gap-2">
                <div className="flex flex-col">
                  <p
                    className={clsx(
                      "text-[13px] font-bold leading-none transition-colors",
                      isPassed
                        ? "text-zinc-400 dark:text-zinc-500 line-through"
                        : isNext
                          ? isUrgent
                            ? "text-orange-700 dark:text-orange-300"
                            : "text-emerald-700 dark:text-emerald-300"
                          : "text-zinc-900 dark:text-zinc-100",
                    )}
                  >
                    {formatTime(sch.departure_time)}
                  </p>
                  {isNext && (
                    <span
                      className={clsx(
                        "text-[10px] font-medium mt-0.5",
                        isUrgent
                          ? "text-orange-600 dark:text-orange-400 font-bold"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {isUrgent ? "¡Próxima salida!" : "Próxima salida"} ·{" "}
                      {formatMinutes(minutesUntil)}
                    </span>
                  )}
                </div>

                <div className="flex gap-0.5">
                  {(() => {
                    const today = new Date().getDay();
                    const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];
                    return sch.days_active?.map((dayNum) => {
                      const isToday = dayNum === today;
                      return (
                        <span
                          key={dayNum}
                          className={clsx(
                            "w-4 h-4 flex items-center justify-center text-[9px] font-bold rounded transition-colors",
                            isPassed
                              ? isToday
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
                              : isToday
                                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                                : "bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400",
                          )}
                        >
                          {dayLabels[dayNum]}
                        </span>
                      );
                    });
                  })()}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SchedulesTab() {
  const {
    routes,
    activeRouteId,
    setActiveRouteId,
    setActiveStopId,
    isLoading,
  } = useMapData();

  const [mounted, setMounted] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleType>("L-V");
  const [direction, setDirection] = useState<DirectionType>("Ida");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());

    // Update current time every minute
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    const date = new Date();
    const day = date.getDay();

    // Auto-select day based on current day (0=Sunday, 6=Saturday)
    if (day === 6) {
      setSchedule("Sábado");
    } else if (day >= 1 && day <= 5) {
      setSchedule("L-V");
    }

    // DICIS coordinates for geolocation detection
    const DICIS_LAT = 20.549879054215197;
    const DICIS_LNG = -101.2008414859346;
    const PROXIMITY_THRESHOLD_KM = 1.5; // Consider "at DICIS" if within 1.5km

    // Calculate distance between two coordinates using Haversine formula
    const getDistanceFromDICIS = (lat: number, lng: number): number => {
      const R = 6371; // Earth's radius in km
      const dLat = (lat - DICIS_LAT) * (Math.PI / 180);
      const dLng = (lng - DICIS_LNG) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(DICIS_LAT * (Math.PI / 180)) *
          Math.cos(lat * (Math.PI / 180)) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Try to get user location for direction detection
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distanceToDICIS = getDistanceFromDICIS(latitude, longitude);

          // If user is at DICIS (within threshold), they likely want to go back (Regreso)
          // If user is far from DICIS, they likely want to go to DICIS (Ida)
          if (distanceToDICIS <= PROXIMITY_THRESHOLD_KM) {
            setDirection("Regreso");
          } else {
            setDirection("Ida");
          }
        },
        () => {
          // Fallback: use time-based detection if geolocation fails
          const hour = date.getHours();
          if (hour >= 13) {
            setDirection("Regreso");
          } else {
            setDirection("Ida");
          }
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
      );
    } else {
      // Fallback for browsers without geolocation
      const hour = date.getHours();
      if (hour >= 13) {
        setDirection("Regreso");
      }
    }

    return () => clearInterval(timeInterval);
  }, []);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const name = r.name.toLowerCase();
      const matchesSchedule =
        schedule === "Sábado"
          ? name.includes("sab") || name.includes("sáb")
          : !name.includes("sab") && !name.includes("sáb");

      let directionPass = true;
      if (direction === "Ida") {
        directionPass = name.includes("a dicis") || name.includes("ida");
      } else {
        directionPass =
          name.includes("dicis a") ||
          name.includes("regreso") ||
          name.includes("a salamanca");
      }

      return matchesSchedule && directionPass;
    });
  }, [routes, schedule, direction]);

  // Intelligent auto-selection: pick closest route by distance
  useEffect(() => {
    if (!isLoading && filteredRoutes.length > 0) {
      const isCurrentValid = filteredRoutes.some((r) => r.id === activeRouteId);

      // Only auto-select if current route is not valid (on init or filter change)
      if (!isCurrentValid) {
        // DICIS coordinates for geolocation detection
        const DICIS_LAT = 20.549879054215197;
        const DICIS_LNG = -101.2008414859346;

        // Calculate distance between two coordinates using Haversine formula
        const getDistance = (
          lat1: number,
          lng1: number,
          lat2: number,
          lng2: number,
        ): number => {
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * (Math.PI / 180);
          const dLng = (lng2 - lng1) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) *
              Math.cos(lat2 * (Math.PI / 180)) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        // Find closest route by minimum distance to any of its points
        const findClosestRoute = (userLat: number, userLng: number) => {
          let bestRouteId = filteredRoutes[0].id;
          let minDistance = Infinity;

          for (const route of filteredRoutes) {
            // Find minimum distance to any point in this route
            for (const point of route.points ?? []) {
              const dist = getDistance(
                userLat,
                userLng,
                point.latitude,
                point.longitude,
              );
              if (dist < minDistance) {
                minDistance = dist;
                bestRouteId = route.id;
              }
            }
          }

          setActiveRouteId(bestRouteId);
        };

        // Try to get user location
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              findClosestRoute(latitude, longitude);
            },
            () => {
              // Fallback: use DICIS location as reference (will select route closest to DICIS)
              findClosestRoute(DICIS_LAT, DICIS_LNG);
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 },
          );
        } else {
          // Fallback: use DICIS location
          findClosestRoute(DICIS_LAT, DICIS_LNG);
        }
      }
    }
  }, [filteredRoutes, activeRouteId, setActiveRouteId, isLoading]);

  const routesWithSchedules = useMemo(() => {
    return filteredRoutes.map((route) => {
      const sortedSchedules = [...(route.schedules ?? [])].sort((a, b) =>
        a.departure_time.localeCompare(b.departure_time),
      );
      return { ...route, sortedSchedules };
    });
  }, [filteredRoutes]);

  if (!mounted || isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center opacity-50 space-y-4 text-sm h-full">
        <Loader2 className="animate-spin w-8 h-8 text-zinc-900 dark:text-zinc-100" />
        <p className="font-medium animate-pulse">Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/20 backdrop-blur-sm z-10 space-y-3">
        {/* Current time display */}
        {currentTime && (
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                {currentTime.toLocaleTimeString("es-MX", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
              {currentTime.toLocaleDateString("es-MX", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        )}

        <div className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-[16px] flex relative">
          {(["L-V", "Sábado"] as ScheduleType[]).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setSchedule(tab)}
              className={clsx(
                "flex-1 relative py-1.5 text-xs font-bold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5",
                schedule === tab
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
            >
              {schedule === tab && (
                <motion.div
                  layoutId="schedule-tab-schedules"
                  style={{ borderRadius: "12px" }}
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                />
              )}
              <CalendarClock className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        <div className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-[16px] flex relative">
          {(["Ida", "Regreso"] as DirectionType[]).map((tab) => (
            <button
              type="button"
              key={tab}
              onClick={() => setDirection(tab)}
              className={clsx(
                "flex-1 relative py-1.5 text-xs font-bold rounded-xl transition-colors duration-200 z-10 flex items-center justify-center gap-1.5",
                direction === tab
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300",
              )}
            >
              {direction === tab && (
                <motion.div
                  layoutId="direction-tab-schedules"
                  style={{ borderRadius: "12px" }}
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                />
              )}
              <MapPin className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {routesWithSchedules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center text-sm font-medium flex flex-col items-center gap-4"
          >
            <CalendarClock className="w-10 h-10 text-zinc-300 dark:text-zinc-600" />
            <div className="space-y-2">
              <p className="text-zinc-500 dark:text-zinc-400">
                No hay rutas para estos filtros
              </p>
              <div className="flex flex-col gap-2">
                {schedule === "L-V" && (
                  <button
                    type="button"
                    onClick={() => setSchedule("Sábado")}
                    className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 justify-center"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    Probar con "Sábado"
                  </button>
                )}
                {schedule === "Sábado" && (
                  <button
                    type="button"
                    onClick={() => setSchedule("L-V")}
                    className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 justify-center"
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    Probar con "L-V"
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setDirection(direction === "Ida" ? "Regreso" : "Ida")
                  }
                  className="text-xs text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1.5 justify-center"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  Cambiar a {direction === "Ida" ? "Regreso" : "Ida"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {routesWithSchedules.map((route, i) => {
              const isActive = route.id === activeRouteId;

              return (
                <motion.button
                  key={route.id}
                  layout
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    transition: { duration: 0.1 },
                  }}
                  transition={{
                    delay: i * 0.03,
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                  }}
                  onClick={() => {
                    setActiveRouteId(route.id);
                    setActiveStopId(null);
                  }}
                  className={clsx(
                    "group relative w-full text-left p-4 rounded-[20px] border transition-all duration-300",
                    "hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-500/30",
                    isActive
                      ? "bg-zinc-50 border-zinc-300 shadow-md dark:bg-zinc-800/80 dark:border-zinc-600"
                      : "bg-white border-zinc-200/60 shadow-sm hover:bg-zinc-50/80 dark:bg-zinc-900/40 dark:border-zinc-800/80 dark:hover:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                      <div
                        className={clsx(
                          "flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300",
                          isActive
                            ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-md scale-110"
                            : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800 group-hover:text-zinc-600 dark:group-hover:text-zinc-300",
                        )}
                      >
                        <CalendarClock className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col justify-center">
                        <h3
                          className={clsx(
                            "font-bold text-sm transition-colors duration-300 leading-tight",
                            isActive
                              ? "text-zinc-900 dark:text-zinc-100"
                              : "text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100",
                          )}
                        >
                          {route.name}
                        </h3>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold mt-0.5 tracking-tight flex items-center gap-1.5">
                          {(() => {
                            const nextIdx = getNextScheduleIndex(
                              route.sortedSchedules,
                            );
                            const hasRemaining = nextIdx !== -1;
                            const isAllPassed =
                              nextIdx === -1 &&
                              route.sortedSchedules.length > 0;

                            return (
                              <>
                                <span
                                  className={clsx(
                                    "w-1.5 h-1.5 rounded-full mt-0.5 transition-colors",
                                    hasRemaining
                                      ? "bg-emerald-500"
                                      : isAllPassed
                                        ? "bg-zinc-400 dark:bg-zinc-500"
                                        : "bg-zinc-300 dark:bg-zinc-600",
                                  )}
                                />
                                {route.sortedSchedules.length} salidas
                                {hasRemaining && nextIdx > 0 && (
                                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 ml-1">
                                    ({route.sortedSchedules.length - nextIdx}{" "}
                                    restantes)
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      {isActive ? (
                        <CheckCircle2 className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-transform duration-300 group-hover:translate-x-0.5" />
                      )}
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        key="content"
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ height: "auto", opacity: 1, marginTop: 16 }}
                        exit={{ height: 0, opacity: 0, marginTop: 0 }}
                        transition={{
                          height: {
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          },
                          opacity: { duration: 0.2 },
                          marginTop: {
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                          },
                        }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4 border-t border-zinc-200/80 dark:border-zinc-700/50">
                          {route.sortedSchedules.length === 0 ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 px-2 py-1">
                              Sin horarios disponibles para esta ruta.
                            </p>
                          ) : (
                            <ScheduleList schedules={route.sortedSchedules} />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
