import { MapMarker, MarkerContent, MarkerTooltip } from "@components/ui/map";
import { useRouteGeometry } from "@hooks/use-route-geometry";
import {
  bearingDeg,
  buildCumulativeDistances,
  buildStopRoadIndices,
  type Coord,
  pointAheadOnPath,
  pointAlongSegment,
  segDist,
} from "@lib/bus-path-utils";
import {
  formatTime,
  getActiveBuses,
  getMexicoCurrentMins,
} from "@lib/schedule-utils";
import type { RouteData } from "@providers/map-provider";
import { BusFront } from "lucide-react";
import type MapLibreGL from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";

interface BusState {
  position: Coord;
  heading: number;
}

/**
 * Compute the mathematically correct position + heading at the current clock
 * time. This is the "target" that the animation layer will smoothly approach.
 */
function computeTarget(
  departureTimeMins: number,
  namedPoints: RouteData["points"],
  roadPath: Coord[],
  cumDist: Float64Array,
  stopRoadIndices: number[],
): BusState {
  const currentMins = getMexicoCurrentMins();
  const elapsedMins = currentMins - departureTimeMins;

  // Find which stop-to-stop segment the bus is in.
  let segmentIndex = 0;
  for (let i = 0; i < namedPoints.length - 1; i++) {
    if (
      namedPoints[i].cumulative_minutes <= elapsedMins &&
      elapsedMins <= namedPoints[i + 1].cumulative_minutes
    ) {
      segmentIndex = i;
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

    const { position, segmentIndex: pathSeg } = pointAlongSegment(
      roadPath,
      cumDist,
      segStart,
      segEnd,
      progress,
    );

    // Look-ahead distance: 1% of segment span, minimum ~1m in degree units.
    const spanDist = Math.max(
      segDist(roadPath[segStart], roadPath[segEnd]),
      0.00005,
    );
    const lookAhead = Math.max(spanDist * 0.01, 0.000009);
    const ahead = pointAheadOnPath(
      roadPath,
      position,
      pathSeg,
      segEnd,
      lookAhead,
    );

    return {
      position,
      heading:
        position[0] === ahead[0] && position[1] === ahead[1]
          ? 0
          : bearingDeg(position, ahead),
    };
  }

  // Fallback: straight-line interpolation between named stops.
  const position: Coord = [
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
  cumDist,
  stopRoadIndices,
  index,
}: {
  route: RouteData;
  departureTime: string;
  departureTimeMins: number;
  minutesUntilEnd: number;
  namedPoints: RouteData["points"];
  roadPath: Coord[];
  cumDist: Float64Array;
  stopRoadIndices: number[];
  index: number;
}) {
  // Visual state — updated every animation frame.
  const [visual, setVisual] = useState<BusState>(() =>
    computeTarget(
      departureTimeMins,
      namedPoints,
      roadPath,
      cumDist,
      stopRoadIndices,
    ),
  );
  const markerRef = useRef<MapLibreGL.Marker | null>(null);
  const headingRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number>(0);

  const namedPointsRef = useRef(namedPoints);
  const roadPathRef = useRef(roadPath);
  const cumDistRef = useRef(cumDist);
  const stopRoadIndicesRef = useRef(stopRoadIndices);
  const depTimeMinsRef = useRef(departureTimeMins);

  namedPointsRef.current = namedPoints;
  roadPathRef.current = roadPath;
  cumDistRef.current = cumDist;
  stopRoadIndicesRef.current = stopRoadIndices;
  depTimeMinsRef.current = departureTimeMins;

  useEffect(() => {
    const initial = computeTarget(
      depTimeMinsRef.current,
      namedPointsRef.current,
      roadPathRef.current,
      cumDistRef.current,
      stopRoadIndicesRef.current,
    );
    setVisual(initial);

    const tick = () => {
      const current = computeTarget(
        depTimeMinsRef.current,
        namedPointsRef.current,
        roadPathRef.current,
        cumDistRef.current,
        stopRoadIndicesRef.current,
      );

      markerRef.current?.setLngLat([current.position[1], current.position[0]]);
      if (headingRef.current) {
        headingRef.current.style.transform = `rotate(${current.heading}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
    };
    // Intentionally empty deps: all values accessed via refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      ref={markerRef}
      longitude={visual.position[1]}
      latitude={visual.position[0]}
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
            ref={headingRef}
            className="relative z-10 will-change-transform"
            style={{
              transform: `rotate(${visual.heading}deg)`,
              transformOrigin: "center center",
            }}
          >
            <div className="absolute -top-3 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-b-[11px] border-x-transparent border-b-black/60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]" />
            <div className="absolute -top-2.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[9px] border-x-transparent border-b-white" />
            <div
              className={`relative flex size-8 items-center justify-center rounded-lg border-[1.5px] text-white shadow-[0_0_0_3px_rgba(0,0,0,0.5),0_3px_10px_rgba(0,0,0,0.5)] ${accentClass}`}
            >
              <BusFront className="size-4" strokeWidth={2.5} />
            </div>
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
  const roadPath = useRouteGeometry(route);

  const namedPoints = useMemo(
    () => route.points.filter((point) => point.point_role !== "waypoint"),
    [route.points],
  );

  // Precompute once per roadPath load — O(n), eliminates per-tick recalculation.
  const cumDist = useMemo(() => buildCumulativeDistances(roadPath), [roadPath]);

  const stopRoadIndices = useMemo(
    () => buildStopRoadIndices(roadPath, namedPoints),
    [roadPath, namedPoints],
  );

  const buses = getActiveBuses(route);

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
            cumDist={cumDist}
            stopRoadIndices={stopRoadIndices}
            index={index}
          />
        );
      })}
    </>
  );
}
