import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Marker, Polyline, Popup, Tooltip } from "react-leaflet";
import { NEXT_PUBLIC_MAPBOX_TOKEN } from "../../../lib/env";
import type { RouteData } from "../../../providers/map-provider";

const createStopIcon = (delay: number) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div class="stop-dot" style="width: 12px; height: 12px; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${delay}s; opacity: 0; transform: scale(0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6],
    tooltipAnchor: [6, -3],
  });
};

const createStartIcon = (delay: number) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${delay}s; opacity: 0; transform: scale(0.5);">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#000000"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    tooltipAnchor: [14, -14],
  });
};

const createEndIcon = (delay: number) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${delay}s; opacity: 0; transform: scale(0.5);">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#000000" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><path d="m9 10 2 2 4-4"/></svg>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
    tooltipAnchor: [14, -14],
  });
};

export default function RouteLayer({
  route,
  isHighlight,
}: {
  route: RouteData;
  isHighlight: boolean;
}) {
  const [path, setPath] = useState<[number, number][]>(
    route.points.map((pt) => [pt.latitude, pt.longitude]),
  );
  // Start invisible, let the camera fly delay complete before drawing
  const [isVisible, setIsVisible] = useState(false);
  const polylineRef = useRef<L.Polyline>(null);

  // Handle map flight sync logic
  useEffect(() => {
    // The camera flight duration in route-focus.tsx is exactly 1.5 seconds.
    // So we wait 1.6s ensuring it loads and renders after finishing zooming.
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 850);
    return () => clearTimeout(timer);
  }, []);

  // Fetch actual routing data using Mapbox Directions API for superior Mexican road mapping
  useEffect(() => {
    // Check if we have the route cached locally for instant loading and to prevent API limits
    const cacheKey = `route_mapbox_${route.id}`;
    const cachedData =
      typeof window !== "undefined" ? localStorage.getItem(cacheKey) : null;

    if (cachedData) {
      try {
        setPath(JSON.parse(cachedData));
        return;
      } catch (err) {
        console.error("Failed to parse cached route", err);
      }
    }

    // Mapbox limit is 25 coordinates per driving request.
    const waypoints = route.points
      .map((pt) => `${pt.longitude},${pt.latitude}`)
      .join(";");

    // Superior Mapbox routing algorithm
    const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${NEXT_PUBLIC_MAPBOX_TOKEN}`;

    fetch(mapboxUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.code === "Ok" && data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            (c: number[]) => [c[1], c[0]] as [number, number],
          );
          setPath(coordinates);

          if (typeof window !== "undefined") {
            localStorage.setItem(cacheKey, JSON.stringify(coordinates)); // Cache it
          }
        }
      })
      .catch((err) => console.error("Error fetching Mapbox route:", err));
  }, [route]);

  // Visual styles for the line based on if it's the highlighted route (B&W Mono Theme)
  const lineWeight = isHighlight ? 4 : 3;
  const lineOpacity = isHighlight ? 1 : 0.2;
  const lineColor = isHighlight ? "#ffffff" : "#52525b";

  if (!isVisible) return null; // completely hidden while syncing Map Flight Animation

  return (
    <>
      <Polyline
        key={`polyline-${route.id}-${isHighlight}`}
        ref={polylineRef}
        positions={path}
        weight={lineWeight}
        opacity={lineOpacity}
        color={lineColor}
        lineCap="round"
        lineJoin="round"
        noClip={true}
        className={isHighlight ? "drop-shadow-lg animated-polyline" : ""}
        eventHandlers={{
          add: (e) => {
            if (isHighlight && e.target) {
              const el = e.target.getElement();
              if (el) {
                const length = el.getTotalLength();
                el.style.strokeDasharray = `${length}`;
                el.style.strokeDashoffset = `${length}`;
                // Force a browser reflow
                el.getBoundingClientRect();
                el.style.animation = "drawLine 1s ease-in-out forwards";

                // Cleanup after animation completes to allow redrawing on zoom without dash clipping
                setTimeout(() => {
                  if (el && el.style) {
                    el.style.strokeDasharray = "";
                    el.style.strokeDashoffset = "";
                  }
                }, 1050);
              }
            }
          },
        }}
      />

      {route.points.map((pt, idx) => {
        if (pt.point_role === "waypoint") return null;

        // Custom icon logic with a staggered animation delay for a smooth 'pop in' effect
        const stopsOnly = route.points.filter(
          (p) => p.point_role !== "waypoint",
        );
        const stopIdx = stopsOnly.findIndex((p) => p.stop_id === pt.stop_id);
        const delay = isHighlight ? Math.max(0, stopIdx * 0.1) : 0;

        let icon: import("leaflet").DivIcon;
        if (pt.point_role === "start") {
          icon = createStartIcon(delay);
        } else if (pt.point_role === "end") {
          icon = createEndIcon(delay);
        } else {
          icon = createStopIcon(delay); // Regular stops are just white dots
        }

        // Calculate next predicted arrival based on schedule
        const currentJsDay = new Date().getDay();
        const currentPgDay = currentJsDay === 0 ? 7 : currentJsDay;
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        let nextArrivalText = "Sin servicio hoy";

        // Find valid schedules for today
        const todaysSchedules =
          route.schedules?.filter(
            (s) => s.days_active && s.days_active.includes(currentPgDay),
          ) || [];

        if (todaysSchedules.length > 0) {
          // Sort schedules by time
          const sorted = [...todaysSchedules].sort((a, b) => {
            return a.departure_time.localeCompare(b.departure_time);
          });

          let nextSchedule = null;
          for (const s of sorted) {
            const [hours, mins] = s.departure_time.split(":").map(Number);
            const depMins = hours * 60 + mins;
            const arrivalMins = depMins + pt.cumulative_minutes;
            if (arrivalMins >= currentMins) {
              nextSchedule = { schedule: s, arrivalMins };
              break;
            }
          }

          let arrivalMins = 0;
          if (!nextSchedule) {
            // If all schedules today passed, perhaps show first service tomorrow? Or just first service today for tomorrow?
            // For simplicity, just say "No hay más por hoy".
            nextArrivalText = "No hay más por hoy";
          } else {
            arrivalMins = nextSchedule.arrivalMins;
            const h = Math.floor(arrivalMins / 60) % 24;
            const m = (arrivalMins % 60).toString().padStart(2, "0");
            const ampm = h >= 12 ? "p.m." : "a.m.";
            const h12 = h % 12 === 0 ? 12 : h % 12;
            nextArrivalText = `${pt.point_role === "start" ? "Parte a las" : "Siguiente:"} ${h12}:${m} ${ampm}`;
          }
        }

        return (
          <Marker
            key={`${route.id}-${pt.stop_id}-${idx}`}
            position={[pt.latitude, pt.longitude]}
            icon={icon}
            zIndexOffset={isHighlight ? 1000 : 0}
            interactive={isHighlight} // Make marker only interactive if route highlighted
          >
            {isHighlight && (
              <Tooltip
                direction="top"
                offset={[0, -12]}
                opacity={1}
                className="shadcn-tooltip z-50 transition-transform hover:scale-105"
              >
                <div className="relative bg-zinc-950 dark:bg-black text-white border border-zinc-800 px-4 py-2.5 text-xs font-semibold shadow-2xl flex flex-col items-center gap-1">
                  <span className="font-bold text-[13px] leading-tight text-center">
                    {pt.stop_name}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                    {nextArrivalText}
                  </span>
                  <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-950 dark:bg-black border-b border-r border-zinc-800 rotate-45 z-[-1]" />
                </div>
              </Tooltip>
            )}
          </Marker>
        );
      })}
    </>
  );
}
