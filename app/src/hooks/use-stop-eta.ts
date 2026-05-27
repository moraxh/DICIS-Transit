"use client";

import {
  getMexicoCurrentMins,
  getTodaysSchedules,
  parseTimeToMinutes,
} from "@lib/schedule-utils";
import type { ReportCount, RouteData } from "@providers/map-provider";
import { useEffect, useState } from "react";

export interface StopEta {
  etaMinutes: number | null;
  isImminent: boolean;
  source: "schedule" | "schedule+delay";
}

function computeEta(
  route: RouteData,
  cumulativeMinutes: number,
  reportCounts: ReportCount[],
  stopId: string | null,
): StopEta {
  const todaysSchedules = getTodaysSchedules(route);
  if (todaysSchedules.length === 0)
    return { etaMinutes: null, isImminent: false, source: "schedule" };

  const currentMins = getMexicoCurrentMins();

  // Average delay from recent reports for stops before this one (same route)
  const delayReports = reportCounts.filter(
    (r) =>
      r.route_id === route.id &&
      r.report_type === "delay" &&
      r.stop_id !== stopId,
  );
  const avgDelay =
    delayReports.length > 0
      ? delayReports.reduce((sum, r) => sum + r.report_count * 5, 0) /
        delayReports.length
      : 0;

  const source: StopEta["source"] =
    avgDelay > 0 ? "schedule+delay" : "schedule";

  const sorted = [...todaysSchedules].sort((a, b) =>
    a.departure_time.localeCompare(b.departure_time),
  );

  for (const s of sorted) {
    const arrivalMins =
      parseTimeToMinutes(s.departure_time) + cumulativeMinutes + avgDelay;
    if (arrivalMins >= 1440) continue;
    if (arrivalMins >= currentMins) {
      const etaMinutes = arrivalMins - currentMins;
      return { etaMinutes, isImminent: etaMinutes <= 15, source };
    }
  }

  return { etaMinutes: null, isImminent: false, source };
}

export function useStopEta(
  route: RouteData,
  cumulativeMinutes: number,
  stopId: string | null,
  reportCounts: ReportCount[],
): StopEta {
  const [eta, setEta] = useState<StopEta>(() =>
    computeEta(route, cumulativeMinutes, reportCounts, stopId),
  );

  useEffect(() => {
    setEta(computeEta(route, cumulativeMinutes, reportCounts, stopId));
    const interval = setInterval(() => {
      setEta(computeEta(route, cumulativeMinutes, reportCounts, stopId));
    }, 30_000);
    return () => clearInterval(interval);
  }, [route, cumulativeMinutes, reportCounts, stopId]);

  return eta;
}
