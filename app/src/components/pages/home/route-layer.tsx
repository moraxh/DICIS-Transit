import {
  MarkerContent,
  MarkerTooltip,
  MapMarker,
  MapRoute,
} from "@components/ui/map";
import { useRouteGeometry } from "@hooks/use-route-geometry";
import { pointToLngLat, latLngPathToLngLatPath } from "@lib/map-coordinates";
import { getNextArrivalText } from "@lib/schedule-utils";
import type {
  RouteData,
  RouteTemporaryOverride,
  RouteTemporaryOverridePoint,
} from "@providers/map-provider";
import { useMapData } from "@providers/map-provider";
import { Check, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function StopMarker({
  pointRole,
  stopId,
  hasReports,
  totalReports,
}: {
  pointRole: RouteData["points"][number]["point_role"];
  stopId: string | null;
  hasReports: boolean;
  totalReports: number;
}) {
  if (pointRole === "start") {
    return (
      <div className="relative">
        <div className="rounded-full bg-white p-1 shadow-[0_0_0_3px_rgba(0,0,0,0.55),0_6px_18px_rgba(0,0,0,0.4)]">
          <MapPin className="size-5 fill-white text-black" strokeWidth={2.2} />
        </div>
      </div>
    );
  }

  if (pointRole === "end") {
    return (
      <div className="relative">
        <div className="rounded-full bg-black p-1 shadow-[0_0_0_3px_rgba(255,255,255,0.25),0_6px_18px_rgba(0,0,0,0.45)]">
          <MapPin className="size-5 fill-black text-white" strokeWidth={2.2} />
          <Check
            className="absolute top-1/2 left-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-white"
            strokeWidth={3}
          />
        </div>
      </div>
    );
  }

  // Temporary stop added by admin (no real stop_id)
  if (stopId === null && pointRole === "stop") {
    return (
      <div className="relative">
        <div className="rounded-full bg-amber-400 p-0.5 shadow-[0_0_0_2px_rgba(0,0,0,0.65),0_0_10px_rgba(251,191,36,0.4)]">
          <MapPin
            className="size-3.5 fill-amber-400 text-zinc-900"
            strokeWidth={2.2}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {hasReports ? (
        <>
          <span className="absolute inset-0 rounded-full bg-red-400/30 animate-[busRipple_2.5s_ease-out_infinite]" />
          <span className="flex size-3 items-center justify-center rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(0,0,0,0.65),0_0_14px_rgba(239,68,68,0.55)]" />
          <span className="absolute -top-2 -right-2 rounded-full bg-red-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white shadow">
            {totalReports}
          </span>
        </>
      ) : (
        <span className="stop-dot flex size-2" />
      )}
    </div>
  );
}

export default function RouteLayer({
  route,
  isHighlight,
  temporaryOverride,
}: {
  route: RouteData;
  isHighlight: boolean;
  temporaryOverride?: RouteTemporaryOverride | null;
}) {
  const { reportCounts } = useMapData();
  const roadPath = useRouteGeometry(route);
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem("dicis_map_flown") === "true",
  );

  useEffect(() => {
    if (isVisible) return;
    const timer = setTimeout(() => setIsVisible(true), 850);
    return () => clearTimeout(timer);
  }, [isVisible]);

  // If a temporary override is active, derive path and displayed points from it.
  const effectivePoints: (
    | RouteData["points"][number]
    | RouteTemporaryOverridePoint
  )[] = useMemo(() => {
    if (temporaryOverride) return temporaryOverride.points;
    return route.points;
  }, [temporaryOverride, route.points]);

  const path = useMemo(() => {
    if (temporaryOverride) {
      // Use cached geometry if available, else fall back to active points straight lines.
      if (
        temporaryOverride.cached_geometry &&
        temporaryOverride.cached_geometry.length >= 2
      ) {
        return latLngPathToLngLatPath(temporaryOverride.cached_geometry);
      }
      const activePoints = temporaryOverride.points.filter((p) => p.active);
      return activePoints.map(
        (p) => [p.longitude, p.latitude] as [number, number],
      );
    }
    return roadPath.length > 0
      ? latLngPathToLngLatPath(roadPath)
      : route.points.map(pointToLngLat);
  }, [temporaryOverride, roadPath, route.points]);

  if (!isVisible || path.length < 2) return null;

  const visiblePoints = effectivePoints.filter(
    (point) => point.point_role !== "waypoint",
  );
  const stopsOnly = visiblePoints;
  const stopIndexMap = new Map(
    stopsOnly.map((point, index) => [point.stop_id, index]),
  );

  return (
    <>
      {isHighlight ? (
        <>
          <MapRoute
            id={`${route.id}-glow`}
            coordinates={path}
            color="#ffffff"
            width={10}
            opacity={0.16}
            interactive={false}
          />
          <MapRoute
            id={`${route.id}-active`}
            coordinates={path}
            color="#ffffff"
            width={3}
            opacity={1}
          />
        </>
      ) : (
        <MapRoute
          id={`${route.id}-inactive`}
          coordinates={path}
          color="#71717a"
          width={2}
          opacity={0.12}
          interactive={false}
        />
      )}

      {effectivePoints.map((point, index) => {
        if (point.point_role === "waypoint") return null;

        // For override points: if inactive, show suspended marker but still render.
        const isSuspended = "active" in point ? !point.active : false;
        if (isSuspended && !isHighlight) return null;

        const stopId = point.stop_id;
        const stopReports = stopId
          ? reportCounts.filter(
              (report) =>
                report.stop_id === stopId && report.route_id === route.id,
            )
          : [];
        const hasReports = stopReports.length > 0;
        const totalReports = stopReports.reduce(
          (sum, report) => sum + report.report_count,
          0,
        );

        const cumulativeMinutes =
          ("cumulative_minutes" in point ? point.cumulative_minutes : 0) ?? 0;
        const nextArrivalText = getNextArrivalText(
          route,
          cumulativeMinutes,
          point.point_role === "start",
        );
        const stopIndex = stopIndexMap.get(stopId) ?? index;

        return (
          <MapMarker
            key={`${route.id}-${stopId ?? `${point.stop_order}-${point.latitude},${point.longitude}`}`}
            longitude={point.longitude}
            latitude={point.latitude}
          >
            <MarkerContent>
              <div
                className={
                  isHighlight
                    ? "animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]"
                    : undefined
                }
                style={{
                  animationDelay: `${Math.max(0, stopIndex * 0.1)}s`,
                  opacity: isHighlight
                    ? isSuspended
                      ? 0.3
                      : 0
                    : isSuspended
                      ? 0.35
                      : 1,
                  transform: isHighlight ? "scale(0.5)" : undefined,
                }}
              >
                <StopMarker
                  pointRole={point.point_role}
                  stopId={point.stop_id ?? null}
                  hasReports={hasReports}
                  totalReports={totalReports}
                />
              </div>
            </MarkerContent>

            {isHighlight ? (
              <MarkerTooltip className="border border-zinc-800 bg-zinc-950 px-0 py-0 text-white shadow-2xl">
                <div className="relative flex min-w-[140px] flex-col items-center gap-1 px-4 py-2.5 text-center text-xs">
                  {point.point_role === "start" ? (
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Punto de salida
                    </span>
                  ) : null}
                  {point.point_role === "end" ? (
                    <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                      Destino final
                    </span>
                  ) : null}
                  <span
                    className={`text-[13px] leading-tight font-bold ${isSuspended ? "line-through text-zinc-500" : ""}`}
                  >
                    {point.stop_name}
                  </span>
                  {isSuspended && (
                    <span className="text-[10px] font-medium text-yellow-500">
                      Temporalmente suspendida
                    </span>
                  )}
                  {cumulativeMinutes > 0 && !isSuspended ? (
                    <span className="text-xs font-medium text-zinc-600">
                      +{cumulativeMinutes} min desde inicio
                    </span>
                  ) : null}
                  <div className="my-0.5 w-full border-t border-zinc-800" />
                  <span className="whitespace-nowrap text-xs font-medium text-zinc-400">
                    {nextArrivalText}
                  </span>
                  {hasReports ? (
                    <>
                      <div className="my-0.5 w-full border-t border-zinc-800" />
                      <span className="flex items-center gap-1 whitespace-nowrap text-xs font-semibold text-red-400">
                        <span className="inline-block size-1.5 rounded-full bg-red-400" />
                        {totalReports} reporte{totalReports !== 1 ? "s" : ""}{" "}
                        hoy
                      </span>
                    </>
                  ) : null}
                </div>
              </MarkerTooltip>
            ) : null}
          </MapMarker>
        );
      })}
    </>
  );
}
