"use client";

import { useMapData } from "@providers/map-provider";
import clsx from "clsx";
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Loader2,
  MapPin,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

type ScheduleType = "L-V" | "Sábado";
type DirectionType = "Ida" | "Regreso";

export default function RoutesTab() {
  const {
    routes,
    activeRouteId,
    setActiveRouteId,
    activeStopId,
    setActiveStopId,
    isLoading,
  } = useMapData();
  const [mounted, setMounted] = useState(false);

  const [schedule, setSchedule] = useState<ScheduleType>("L-V");
  const [direction, setDirection] = useState<DirectionType>("Ida");

  useEffect(() => {
    setMounted(true);
    const date = new Date();
    const day = date.getDay();
    const hour = date.getHours();

    if (day === 6) {
      setSchedule("Sábado");
    }
    if (hour >= 13) {
      setDirection("Regreso");
    }
  }, []);

  const filteredRoutes = useMemo(() => {
    return routes.filter((r) => {
      const name = r.name.toLowerCase();
      const matchesSchedule =
        schedule === "Sábado"
          ? name.includes("sab") || name.includes("sáb")
          : !name.includes("sab") && !name.includes("sáb");

      // Match Direction (Ida limits to ENMSS->DICIS, Regreso is DICIS->ENMSS)
      // Base on DB names: "L-V: ENMSS a DICIS" and "L-V: DICIS a ENMSS"
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

  // Handle auto-select if current active is filtered out
  useEffect(() => {
    if (!isLoading && filteredRoutes.length > 0) {
      const isCurrentValid = filteredRoutes.some((r) => r.id === activeRouteId);
      if (!isCurrentValid) {
        setActiveRouteId(filteredRoutes[0].id);
      }
    }
  }, [filteredRoutes, activeRouteId, setActiveRouteId, isLoading]);

  if (!mounted || isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center opacity-50 space-y-4 text-sm h-full">
        <Loader2 className="animate-spin w-8 h-8 text-zinc-900 dark:text-zinc-100" />
        <p className="font-medium animate-pulse">Optimizando rutas...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 shrink-0 border-b border-zinc-200 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-950/20 backdrop-blur-sm z-10 space-y-3">
        <div className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-[16px] flex relative">
          {(["L-V", "Sábado"] as ScheduleType[]).map((tab) => (
            <button
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
                  layoutId="schedule-tab"
                  style={{ borderRadius: "12px" }}
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                />
              )}
              <Clock className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>

        <div className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1 rounded-[16px] flex relative">
          {(["Ida", "Regreso"] as DirectionType[]).map((tab) => (
            <button
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
                  layoutId="direction-tab"
                  style={{ borderRadius: "12px" }}
                  className="absolute inset-0 bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
                  transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
                />
              )}
              <ArrowRightLeft className="w-3.5 h-3.5 relative z-10" />
              <span className="relative z-10">{tab}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3">
        {filteredRoutes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 text-center text-sm font-medium opacity-50 flex flex-col items-center gap-3"
          >
            <MapPin className="w-8 h-8 opacity-40" />
            <p>No hay rutas programadas para estos filtros.</p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredRoutes.map((route, i) => {
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
                        <MapPin className="w-4 h-4" />
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
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 mt-0.5"></span>
                          {
                            route.points.filter((p) =>
                              ["stop", "start", "end"].includes(p.point_role),
                            ).length
                          }{" "}
                          paradas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pl-2">
                      {route.isActive && (
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                      )}
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
                          <ul className="space-y-2 relative before:absolute before:inset-y-0 before:left-[19px] before:w-0.5 before:-translate-x-1/2 before:bg-gradient-to-b before:from-zinc-300 before:via-zinc-300/80 before:to-transparent dark:before:from-zinc-700 dark:before:via-zinc-700/80 rounded-[16px] py-1">
                            {route.points
                              .filter((p) =>
                                ["stop", "start", "end"].includes(p.point_role),
                              )
                              .map((pt, _index) => {
                                const isStopActive =
                                  activeStopId === pt.stop_id;

                                // Calculate next predicted arrival based on schedule
                                const currentJsDay = new Date().getDay();
                                const currentPgDay =
                                  currentJsDay === 0 ? 7 : currentJsDay;
                                const now = new Date();
                                const currentMins =
                                  now.getHours() * 60 + now.getMinutes();

                                let nextArrivalText = "Sin servicio hoy";

                                // Find valid schedules for today
                                const todaysSchedules =
                                  route.schedules?.filter(
                                    (s) =>
                                      s.days_active &&
                                      s.days_active.includes(currentPgDay),
                                  ) || [];

                                if (todaysSchedules.length > 0) {
                                  // Sort schedules by time
                                  const sorted = [...todaysSchedules].sort(
                                    (a, b) => {
                                      return a.departure_time.localeCompare(
                                        b.departure_time,
                                      );
                                    },
                                  );

                                  let nextSchedule = null;
                                  for (const s of sorted) {
                                    const [hours, mins] = s.departure_time
                                      .split(":")
                                      .map(Number);
                                    const depMins = hours * 60 + mins;
                                    const arrivalMins =
                                      depMins + pt.cumulative_minutes;
                                    if (arrivalMins >= currentMins) {
                                      nextSchedule = {
                                        schedule: s,
                                        arrivalMins,
                                      };
                                      break;
                                    }
                                  }

                                  if (!nextSchedule) {
                                    nextArrivalText = "No hay más por hoy";
                                  } else {
                                    const arrivalMins =
                                      nextSchedule.arrivalMins;
                                    const h = Math.floor(arrivalMins / 60) % 24;
                                    const m = (arrivalMins % 60)
                                      .toString()
                                      .padStart(2, "0");
                                    const ampm = h >= 12 ? "p.m." : "a.m.";
                                    const h12 = h % 12 === 0 ? 12 : h % 12;
                                    nextArrivalText = `${pt.point_role === "start" ? "Parte a las" : "Siguiente:"} ${h12}:${m} ${ampm}`;
                                  }
                                }

                                return (
                                  <motion.li
                                    initial={{ x: -10, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: _index * 0.05 }}
                                    key={pt.stop_id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveStopId(pt.stop_id);
                                    }}
                                    className={clsx(
                                      "relative flex items-start gap-4 z-10 py-2.5 px-3 rounded-[16px] transition-all duration-300 cursor-pointer overflow-hidden",
                                      isStopActive
                                        ? "bg-zinc-200/80 shadow-inner dark:bg-zinc-800/80"
                                        : "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/50",
                                    )}
                                  >
                                    <div
                                      className={clsx(
                                        "flex-shrink-0 mt-0.5 bg-white dark:bg-zinc-800 ring-4 ring-transparent rounded-full shadow-sm transition-transform duration-300",
                                        isStopActive
                                          ? "scale-110 ring-emerald-500/20"
                                          : "",
                                      )}
                                    >
                                      <CircleDot
                                        className={clsx(
                                          "w-[14px] h-[14px] transition-colors duration-300",
                                          isStopActive
                                            ? "text-emerald-500"
                                            : "text-zinc-900 dark:text-zinc-200",
                                        )}
                                      />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                      <p
                                        className={clsx(
                                          "text-[13px] font-extrabold leading-none transition-colors duration-300",
                                          isStopActive
                                            ? "text-emerald-600 dark:text-emerald-400"
                                            : "text-zinc-900 dark:text-zinc-100",
                                        )}
                                      >
                                        {pt.stop_name}
                                      </p>
                                      <div className="flex items-center justify-between mt-1.5 opacity-80">
                                        {pt.cumulative_minutes > 0 ? (
                                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-semibold truncate pr-2">
                                            +{pt.cumulative_minutes} min
                                            recorrido
                                          </p>
                                        ) : (
                                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate pr-2">
                                            Inicio
                                          </p>
                                        )}
                                        <span className="text-[10px] font-black text-zinc-600 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                          {nextArrivalText}
                                        </span>
                                      </div>
                                    </div>
                                  </motion.li>
                                );
                              })}
                          </ul>
                        </div>
                      </motion.div>
                    )}{" "}
                  </AnimatePresence>{" "}
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
