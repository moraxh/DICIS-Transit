import {
  MarkerContent,
  MarkerTooltip,
  MapMarker,
  MapRoute,
} from "@components/ui/map";
import { useRouteGeometry } from "@hooks/use-route-geometry";
import { pointToLngLat, latLngPathToLngLatPath } from "@lib/map-coordinates";
import { getNextArrivalText } from "@lib/schedule-utils";
import type { RouteData } from "@providers/map-provider";
import { useMapData } from "@providers/map-provider";
import { Check, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function StopMarker({
  pointRole,
  hasReports,
  totalReports,
}: {
  pointRole: RouteData["points"][number]["point_role"];
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
}: {
  route: RouteData;
  isHighlight: boolean;
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

  const path = useMemo(
    () =>
      roadPath.length > 0
        ? latLngPathToLngLatPath(roadPath)
        : route.points.map(pointToLngLat),
    [roadPath, route.points],
  );

  if (!isVisible || path.length < 2) return null;

  const stopsOnly = route.points.filter(
    (point) => point.point_role !== "waypoint",
  );
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

      {route.points.map((point, index) => {
        if (point.point_role === "waypoint") return null;

        const stopReports = reportCounts.filter(
          (report) =>
            report.stop_id === point.stop_id && report.route_id === route.id,
        );
        const hasReports = stopReports.length > 0;
        const totalReports = stopReports.reduce(
          (sum, report) => sum + report.report_count,
          0,
        );
        const nextArrivalText = getNextArrivalText(
          route,
          point.cumulative_minutes,
          point.point_role === "start",
        );
        const stopIndex = stopIndexMap.get(point.stop_id) ?? index;

        return (
          <MapMarker
            key={`${route.id}-${point.stop_id}-${index}`}
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
                  opacity: isHighlight ? 0 : 1,
                  transform: isHighlight ? "scale(0.5)" : undefined,
                }}
              >
                <StopMarker
                  pointRole={point.point_role}
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
                  <span className="text-[13px] leading-tight font-bold">
                    {point.stop_name}
                  </span>
                  {point.cumulative_minutes > 0 ? (
                    <span className="text-xs font-medium text-zinc-600">
                      +{point.cumulative_minutes} min desde inicio
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
