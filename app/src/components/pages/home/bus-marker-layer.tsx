import { formatTime, getActiveBuses } from "@lib/schedule-utils";
import type { RouteData } from "@providers/map-provider";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";

const TICK_MS = 1000;

function makeBusIcon(
  bg: string,
  border: string,
  stroke: string,
  ripple: string,
  heading: number,
  delay = 0,
) {
  const safeDelay = Math.max(delay, 0.05);
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="
      width: 32px; height: 32px;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: scale(0.5);
      animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${safeDelay}s forwards;
    ">
      <div style="
        position: absolute; width: 44px; height: 44px;
        background: ${ripple};
        border-radius: 50%;
        animation: busRipple 3s ease-out ${safeDelay + 0.4}s infinite;
        opacity: 0;
      "></div>
      <div class="bus-heading" style="
        position: absolute; inset: 0;
        transform: rotate(${heading}deg);
        transition: transform ${TICK_MS}ms linear;
        pointer-events: none;
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="${border}" stroke="none" style="position:absolute; top:-5px; left:50%; transform:translateX(-50%); opacity:0.9;">
          <path d="M12 2 L19 16 L12 12 L5 16 Z"/>
        </svg>
      </div>
      <div style="
        position: relative;
        background: ${bg};
        border: 1.5px solid ${border};
        border-radius: 7px;
        width: 26px; height: 26px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 0 0 3px rgba(0,0,0,0.5), 0 3px 10px rgba(0,0,0,0.5);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    tooltipAnchor: [16, -16],
  });
}

function getBusIcon(direction: string, index: number, heading: number) {
  const delay = index * 0.12;
  return direction === "from_dicis"
    ? makeBusIcon("#3b82f6", "#1d4ed8", "white", "rgba(59,130,246,0.2)", heading, delay)
    : makeBusIcon("#f97316", "#c2410c", "white", "rgba(249,115,22,0.2)", heading, delay);
}

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
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - lat) ** 2 + (path[i][1] - lng) ** 2;
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
  f: number,
): [number, number] {
  if (startIdx === endIdx) return path[startIdx];
  if (endIdx < startIdx) return path[startIdx];

  let totalLen = 0;
  for (let i = startIdx; i < endIdx; i++) {
    totalLen += segDist(path[i], path[i + 1]);
  }
  if (totalLen === 0) return path[startIdx];

  const target = Math.max(0, Math.min(f, 1)) * totalLen;
  let acc = 0;
  for (let i = startIdx; i < endIdx; i++) {
    const d = segDist(path[i], path[i + 1]);
    if (acc + d >= target) {
      const st = d === 0 ? 0 : (target - acc) / d;
      return [
        path[i][0] + st * (path[i + 1][0] - path[i][0]),
        path[i][1] + st * (path[i + 1][1] - path[i][1]),
      ];
    }
    acc += d;
  }
  return path[endIdx];
}

function bearingDeg(
  from: [number, number],
  to: [number, number],
): number {
  const φ1 = (from[0] * Math.PI) / 180;
  const φ2 = (to[0] * Math.PI) / 180;
  const Δλ = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (θ * 180) / Math.PI;
}

function getEffectiveRouteDirection(
  route: RouteData,
): "to_dicis" | "from_dicis" {
  const namedStops = route.points.filter((p) => p.point_role !== "waypoint");
  const firstStopName = namedStops[0]?.stop_name?.toLowerCase() ?? "";
  const lastStopName =
    namedStops[namedStops.length - 1]?.stop_name?.toLowerCase() ?? "";

  const firstHasDicis = firstStopName.includes("dicis");
  const lastHasDicis = lastStopName.includes("dicis");

  if (firstHasDicis && !lastHasDicis) return "from_dicis";
  if (!firstHasDicis && lastHasDicis) return "to_dicis";

  return route.direction;
}

function SmoothBusMarker({
  position,
  heading,
  icon,
  children,
}: {
  position: [number, number];
  heading: number;
  icon: L.DivIcon;
  children: React.ReactNode;
}) {
  const markerRef = useRef<L.Marker>(null);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setLatLng(position);

    // Update heading via DOM to avoid recreating the full icon each tick
    const el = marker.getElement();
    if (el) {
      const headingEl = el.querySelector<HTMLElement>(".bus-heading");
      if (headingEl) {
        headingEl.style.transform = `rotate(${heading}deg)`;
      }
    }
  }, [position, heading]);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      zIndexOffset={3000}
    >
      {children}
    </Marker>
  );
}

export default function BusMarkerLayer({ route }: { route: RouteData }) {
  const [, setTick] = useState(0);
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);

  useEffect(() => {
    const cacheKey = `route_mapbox_${route.id}`;
    const cached =
      typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        setRoadPath(JSON.parse(cached));
      } catch {
        // fall back to straight-line interpolation
      }
    }
  }, [route.id]);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const buses = getActiveBuses(route);
  if (buses.length === 0) return null;

  const namedPoints = route.points.filter((p) => p.point_role !== "waypoint");
  const effectiveDirection = getEffectiveRouteDirection(route);
  const directionLabel =
    effectiveDirection === "from_dicis"
      ? "DICIS → Salamanca"
      : "Salamanca → DICIS";

  const stopRoadIndices: number[] =
    roadPath.length > 0
      ? namedPoints.map((p) =>
          nearestPathIndex(roadPath, p.latitude, p.longitude),
        )
      : [];

  return (
    <>
      {buses.map((bus, i) => {
        let position: [number, number] = [bus.lat, bus.lng];
        let heading = 0;

        let segIdx = 0;
        for (let k = 0; k < namedPoints.length - 1; k++) {
          if (
            namedPoints[k].cumulative_minutes <= bus.elapsedMins &&
            bus.elapsedMins <= namedPoints[k + 1].cumulative_minutes
          ) {
            segIdx = k;
            break;
          }
        }
        const startStop = namedPoints[segIdx];
        const endStop = namedPoints[segIdx + 1];
        const segTotal =
          endStop.cumulative_minutes - startStop.cumulative_minutes;
        const f =
          segTotal > 0
            ? (bus.elapsedMins - startStop.cumulative_minutes) / segTotal
            : 0;

        if (
          roadPath.length > 0 &&
          stopRoadIndices.length === namedPoints.length
        ) {
          position = pointAlongPathSegment(
            roadPath,
            stopRoadIndices[segIdx],
            stopRoadIndices[segIdx + 1],
            f,
          );
          const lookahead = pointAlongPathSegment(
            roadPath,
            stopRoadIndices[segIdx],
            stopRoadIndices[segIdx + 1],
            Math.min(f + 0.05, 1),
          );
          heading = bearingDeg(position, lookahead);
        } else {
          heading = bearingDeg(
            [startStop.latitude, startStop.longitude],
            [endStop.latitude, endStop.longitude],
          );
        }

        return (
          <SmoothBusMarker
            key={`bus-${route.id}-${bus.departureTime}`}
            position={position}
            heading={heading}
            icon={getBusIcon(effectiveDirection, i, heading)}
          >
            <Tooltip
              direction="top"
              offset={[0, -18]}
              opacity={1}
              className="shadcn-tooltip z-50"
            >
              <div className="relative bg-zinc-950 text-white border border-zinc-800 px-4 py-2.5 text-xs shadow-2xl flex flex-col items-center gap-1 min-w-40">
                <span className="font-bold text-[13px] leading-tight text-center flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${effectiveDirection === "from_dicis" ? "bg-blue-400" : "bg-orange-400"}`}
                  />
                  En ruta
                </span>
                <span className="text-[11px] text-zinc-200 font-semibold whitespace-nowrap">
                  {route.name}
                </span>
                <span className="text-[10px] text-zinc-500 whitespace-nowrap">
                  {directionLabel}
                </span>
                <div className="w-full border-t border-zinc-800 my-0.5" />
                <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                  Salida {formatTime(bus.departureTime)} · llega en{" "}
                  {Math.ceil(bus.minutesUntilEnd)} min
                </span>
                <div className="absolute -bottom-1.25 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-950 border-b border-r border-zinc-800 rotate-45 z-[-1]" />
              </div>
            </Tooltip>
          </SmoothBusMarker>
        );
      })}
    </>
  );
}
