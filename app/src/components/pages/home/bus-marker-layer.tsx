import { formatTime, getActiveBuses } from "@lib/schedule-utils";
import type { RouteData, RoutePoint } from "@providers/map-provider";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Marker, Tooltip } from "react-leaflet";

function makeBusIcon(
  bg: string,
  border: string,
  stroke: string,
  ripple: string,
  delay = 0,
) {
  // Minimum 50ms delay ensures browser renders initial opacity:0 state before animation starts
  const safeDelay = Math.max(delay, 0.05);
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: scale(0.5);
      animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${safeDelay}s forwards;
    ">
      <div style="
        position: absolute; width: 36px; height: 36px;
        background: ${ripple};
        border-radius: 50%;
        animation: busRipple 2s ease-out ${safeDelay + 0.5}s infinite;
        opacity: 0;
      "></div>
      <div style="
        position: relative;
        background: ${bg};
        border: 2px solid ${border};
        border-radius: 8px;
        width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s.5-1.7.8-2.8c.1-.4.2-.8.2-1.2 0-.4-.1-.8-.2-1.2l-1.4-5C20.1 6.8 19.1 6 18 6H4a2 2 0 0 0-2 2v10h3"/><circle cx="7" cy="18" r="2"/><path d="M9 18h5"/><circle cx="16" cy="18" r="2"/>
        </svg>
      </div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    tooltipAnchor: [18, -18],
  });
}

// Blue = from_dicis (DICIS → ENMSS), Orange = to_dicis (Salamanca → DICIS)
function getBusIcon(direction: string, index: number) {
  const delay = index * 0.12;
  return direction === "from_dicis"
    ? makeBusIcon("#3b82f6", "#1d4ed8", "white", "rgba(59,130,246,0.2)", delay)
    : makeBusIcon("#f97316", "#c2410c", "white", "rgba(249,115,22,0.2)", delay);
}

function findClosestPathIndex(
  path: [number, number][],
  lat: number,
  lng: number,
): number {
  let minDist = Infinity;
  let minIdx = 0;
  for (let i = 0; i < path.length; i++) {
    const d = (path[i][0] - lat) ** 2 + (path[i][1] - lng) ** 2;
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return minIdx;
}

function interpolateAlongSubPath(
  path: [number, number][],
  startIdx: number,
  endIdx: number,
  t: number,
): [number, number] {
  const from = Math.min(startIdx, endIdx);
  const to = Math.max(startIdx, endIdx);
  const sub = path.slice(from, to + 1);

  if (sub.length <= 1) return path[startIdx] ?? [0, 0];

  let totalLen = 0;
  const segs: number[] = [];
  for (let i = 0; i < sub.length - 1; i++) {
    const d = Math.sqrt(
      (sub[i + 1][0] - sub[i][0]) ** 2 + (sub[i + 1][1] - sub[i][1]) ** 2,
    );
    segs.push(d);
    totalLen += d;
  }

  if (totalLen === 0) return sub[0];

  const target = t * totalLen;
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (acc + segs[i] >= target) {
      const st = segs[i] === 0 ? 0 : (target - acc) / segs[i];
      return [
        sub[i][0] + st * (sub[i + 1][0] - sub[i][0]),
        sub[i][1] + st * (sub[i + 1][1] - sub[i][1]),
      ];
    }
    acc += segs[i];
  }

  return sub[sub.length - 1];
}

function getBusPositionOnPath(
  path: [number, number][],
  namedStops: RoutePoint[],
  elapsedMins: number,
): [number, number] | null {
  if (path.length === 0 || namedStops.length < 2) return null;

  for (let i = 0; i < namedStops.length - 1; i++) {
    const curr = namedStops[i];
    const next = namedStops[i + 1];
    if (
      elapsedMins >= curr.cumulative_minutes &&
      elapsedMins <= next.cumulative_minutes
    ) {
      const segTotal = next.cumulative_minutes - curr.cumulative_minutes;
      const t =
        segTotal > 0 ? (elapsedMins - curr.cumulative_minutes) / segTotal : 0;

      const currIdx = findClosestPathIndex(path, curr.latitude, curr.longitude);
      let nextIdx = findClosestPathIndex(path, next.latitude, next.longitude);

      // Ensure forward direction along path
      if (nextIdx <= currIdx) nextIdx = Math.min(currIdx + 1, path.length - 1);

      return interpolateAlongSubPath(path, currIdx, nextIdx, t);
    }
  }
  return null;
}

export default function BusMarkerLayer({ route }: { route: RouteData }) {
  const [tick, setTick] = useState(0);
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
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  const buses = getActiveBuses(route);
  if (buses.length === 0) return null;

  const namedStops = route.points.filter((p) => p.point_role !== "waypoint");
  const directionLabel =
    route.direction === "from_dicis" ? "DICIS → ENMSS" : "Salamanca → DICIS";

  return (
    <>
      {buses.map((bus, i) => {
        const roadPos =
          roadPath.length > 0
            ? getBusPositionOnPath(roadPath, namedStops, bus.elapsedMins)
            : null;

        const position: [number, number] = roadPos ?? [bus.lat, bus.lng];

        return (
          <Marker
            key={`bus-${route.id}-${bus.departureTime}-${i}`}
            position={position}
            icon={getBusIcon(route.direction, i)}
            zIndexOffset={3000}
          >
            <Tooltip
              direction="top"
              offset={[0, -18]}
              opacity={1}
              className="shadcn-tooltip z-50"
            >
              <div className="relative bg-zinc-950 text-white border border-zinc-800 px-4 py-2.5 text-xs shadow-2xl flex flex-col items-center gap-1 min-w-[160px]">
                <span className="font-bold text-[13px] leading-tight text-center flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full animate-pulse shrink-0 ${route.direction === "from_dicis" ? "bg-blue-400" : "bg-orange-400"}`}
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
                  {bus.minutesUntilEnd} min
                </span>
                <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-950 border-b border-r border-zinc-800 rotate-45 z-[-1]" />
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </>
  );
}
