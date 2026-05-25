import { MarkerContent, MarkerTooltip, MapMarker } from "@components/ui/map";
import { useRouteGeometry } from "@hooks/use-route-geometry";
import {
  formatTime,
  getActiveBuses,
  getMexicoCurrentMins,
} from "@lib/schedule-utils";
import type { RouteData } from "@providers/map-provider";
import { BusFront } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function segDist(a: [number, number], b: [number, number]): number {
  return Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2);
}

function nearestPathIndex(
  path: [number, number][],
  lat: number,
  lng: number,
): number {
  let bestIdx = 0;
  let bestD = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t =
      lenSq === 0
        ? 0
        : Math.max(0, Math.min(1, ((lat - x1) * dx + (lng - y1) * dy) / lenSq));
    const d = (x1 + t * dx - lat) ** 2 + (y1 + t * dy - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function pointAlongPathSegment(
  path: [number, number][],
  startIdx: number,
  endIdx: number,
  fraction: number,
): [number, number] {
  if (startIdx === endIdx || endIdx < startIdx) return path[startIdx];

  let totalLen = 0;
  for (let i = startIdx; i < endIdx; i++) {
    totalLen += segDist(path[i], path[i + 1]);
  }
  if (totalLen === 0) return path[startIdx];

  const target = Math.max(0, Math.min(fraction, 1)) * totalLen;
  let acc = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const distance = segDist(path[i], path[i + 1]);
    if (acc + distance >= target) {
      const localT = distance === 0 ? 0 : (target - acc) / distance;
      return [
        path[i][0] + localT * (path[i + 1][0] - path[i][0]),
        path[i][1] + localT * (path[i + 1][1] - path[i][1]),
      ];
    }
    acc += distance;
  }

  return path[endIdx];
}

function bearingDeg(from: [number, number], to: [number, number]): number {
  const phi1 = (from[0] * Math.PI) / 180;
  const phi2 = (to[0] * Math.PI) / 180;
  const deltaLambda = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  const theta = Math.atan2(y, x);
  return (90 - (theta * 180) / Math.PI + 360) % 360;
}

function computePositionAndHeading(
  departureTimeMins: number,
  namedPoints: RouteData["points"],
  roadPath: [number, number][],
  stopRoadIndices: number[],
): { position: [number, number]; heading: number } {
  const currentMins = getMexicoCurrentMins();
  const elapsedMins = currentMins - departureTimeMins;

  let segmentIndex = 0;
  for (let index = 0; index < namedPoints.length - 1; index++) {
    if (
      namedPoints[index].cumulative_minutes <= elapsedMins &&
      elapsedMins <= namedPoints[index + 1].cumulative_minutes
    ) {
      segmentIndex = index;
      break;
    }
  }

  const startStop = namedPoints[segmentIndex];
  const endStop =
    namedPoints[Math.min(segmentIndex + 1, namedPoints.length - 1)];
  const segmentTotal =
    endStop.cumulative_minutes - startStop.cumulative_minutes;
  const progress =
    segmentTotal > 0
      ? (elapsedMins - startStop.cumulative_minutes) / segmentTotal
      : 0;

  if (roadPath.length > 0 && stopRoadIndices.length === namedPoints.length) {
    const segStart = stopRoadIndices[segmentIndex];
    const segEnd =
      stopRoadIndices[Math.min(segmentIndex + 1, stopRoadIndices.length - 1)];
    const position = pointAlongPathSegment(
      roadPath,
      segStart,
      segEnd,
      progress,
    );

    let aheadPoint = position;
    for (
      let i = Math.min(segStart + 1, roadPath.length - 1);
      i <= segEnd;
      i++
    ) {
      aheadPoint = roadPath[i];
      if (segDist(position, aheadPoint) >= 0.0002) break;
    }

    return {
      position,
      heading:
        position[0] === aheadPoint[0] && position[1] === aheadPoint[1]
          ? 0
          : bearingDeg(position, aheadPoint),
    };
  }

  const position: [number, number] = [
    startStop.latitude + progress * (endStop.latitude - startStop.latitude),
    startStop.longitude + progress * (endStop.longitude - startStop.longitude),
  ];

  return {
    position,
    heading: bearingDeg(
      [startStop.latitude, startStop.longitude],
      [endStop.latitude, endStop.longitude],
    ),
  };
}

function BusMarker({
  route,
  departureTime,
  departureTimeMins,
  minutesUntilEnd,
  namedPoints,
  roadPath,
  stopRoadIndices,
  index,
}: {
  route: RouteData;
  departureTime: string;
  departureTimeMins: number;
  minutesUntilEnd: number;
  namedPoints: RouteData["points"];
  roadPath: [number, number][];
  stopRoadIndices: number[];
  index: number;
}) {
  const [state, setState] = useState(() =>
    computePositionAndHeading(
      departureTimeMins,
      namedPoints,
      roadPath,
      stopRoadIndices,
    ),
  );

  useEffect(() => {
    setState(
      computePositionAndHeading(
        departureTimeMins,
        namedPoints,
        roadPath,
        stopRoadIndices,
      ),
    );

    const interval = setInterval(() => {
      setState(
        computePositionAndHeading(
          departureTimeMins,
          namedPoints,
          roadPath,
          stopRoadIndices,
        ),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [departureTimeMins, namedPoints, roadPath, stopRoadIndices]);

  const effectiveDirection = route.direction;
  const directionLabel =
    effectiveDirection === "from_dicis"
      ? "DICIS → Salamanca"
      : "Salamanca → DICIS";
  const accentClass =
    effectiveDirection === "from_dicis"
      ? "bg-blue-500 border-blue-700"
      : "bg-orange-500 border-orange-700";
  const rippleClass =
    effectiveDirection === "from_dicis" ? "bg-blue-500/20" : "bg-orange-500/20";

  return (
    <MapMarker
      longitude={state.position[1]}
      latitude={state.position[0]}
      offset={[0, 0]}
    >
      <MarkerContent>
        <div
          className="relative animate-[popIn_0.4s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]"
          style={{
            animationDelay: `${Math.max(index * 0.12, 0.05)}s`,
            opacity: 0,
          }}
        >
          <span
            className={`absolute inset-[-6px] rounded-full ${rippleClass} animate-[busRipple_3s_ease-out_infinite]`}
          />
          <div
            className="absolute inset-0 transition-transform duration-150"
            style={{ transform: `rotate(${state.heading}deg)` }}
          >
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 border-x-[4px] border-b-[7px] border-x-transparent border-b-white/90" />
          </div>
          <div
            className={`relative flex size-8 items-center justify-center rounded-lg border-[1.5px] text-white shadow-[0_0_0_3px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.5)] ${accentClass}`}
          >
            <BusFront className="size-4" strokeWidth={2.5} />
          </div>
        </div>
      </MarkerContent>

      <MarkerTooltip className="border border-zinc-800 bg-zinc-950 px-0 py-0 text-white shadow-2xl">
        <div className="relative flex min-w-40 flex-col items-center gap-1 px-4 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-center text-[13px] leading-tight font-bold">
            <span
              className={`size-2 shrink-0 animate-pulse rounded-full ${
                effectiveDirection === "from_dicis"
                  ? "bg-blue-400"
                  : "bg-orange-400"
              }`}
            />
            En ruta
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold text-zinc-200">
            {route.name}
          </span>
          <span className="whitespace-nowrap text-[10px] text-zinc-500">
            {directionLabel}
          </span>
          <div className="my-0.5 w-full border-t border-zinc-800" />
          <span className="whitespace-nowrap text-[10px] text-zinc-400">
            Salida {formatTime(departureTime)} · llega en{" "}
            {Math.ceil(minutesUntilEnd)} min
          </span>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}

export default function BusMarkerLayer({ route }: { route: RouteData }) {
  const [_tick, setTick] = useState(0);
  const roadPath = useRouteGeometry(route);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const namedPoints = useMemo(
    () => route.points.filter((point) => point.point_role !== "waypoint"),
    [route.points],
  );
  const buses = getActiveBuses(route);
  const stopRoadIndices = useMemo(
    () =>
      roadPath.length > 0
        ? namedPoints.map((point) =>
            nearestPathIndex(roadPath, point.latitude, point.longitude),
          )
        : [],
    [roadPath, namedPoints],
  );

  if (buses.length === 0) return null;

  return (
    <>
      {buses.map((bus, index) => {
        const [hours, minutes] = bus.departureTime.split(":").map(Number);
        return (
          <BusMarker
            key={`bus-${route.id}-${bus.departureTime}`}
            route={route}
            departureTime={bus.departureTime}
            departureTimeMins={hours * 60 + minutes}
            minutesUntilEnd={bus.minutesUntilEnd}
            namedPoints={namedPoints}
            roadPath={roadPath}
            stopRoadIndices={stopRoadIndices}
            index={index}
          />
        );
      })}
    </>
  );
}
