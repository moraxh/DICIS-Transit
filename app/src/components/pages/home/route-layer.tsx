import { useRouteRoadPath } from "@hooks/use-route-road-path";
import { getNextArrivalText } from "@lib/schedule-utils";
import type { RouteData } from "@providers/map-provider";
import { useMapData } from "@providers/map-provider";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { Marker, Polyline, Tooltip } from "react-leaflet";

const createStopIcon = (delay: number, hasReports = false) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: hasReports
      ? `<div style="position:relative;width:12px;height:12px;animation:popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;animation-delay:${delay}s;opacity:0;transform:scale(0.5);">
           <div style="width:12px;height:12px;background:#ef4444;border-radius:50%;box-shadow:0 0 0 2px rgba(0,0,0,0.6),0 0 8px rgba(239,68,68,0.6);"></div>
           <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.3);animation:busRipple 2.5s ease-out ${delay + 0.4}s infinite;"></div>
         </div>`
      : `<div class="stop-dot" style="width:8px;height:8px;animation:popIn 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards;animation-delay:${delay}s;opacity:0;transform:scale(0.5);"></div>`,
    iconSize: hasReports ? [12, 12] : [8, 8],
    iconAnchor: hasReports ? [6, 6] : [4, 4],
    popupAnchor: [0, -6],
    tooltipAnchor: hasReports ? [6, -4] : [4, -2],
  });
};

const createStartIcon = (delay: number) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${delay}s; opacity: 0; transform: scale(0.5);">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#ffffff" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.8))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#000000"/></svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
    tooltipAnchor: [11, -11],
  });
};

const createEndIcon = (delay: number) => {
  return L.divIcon({
    className: "bg-transparent border-none",
    html: `<div style="animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; animation-delay: ${delay}s; opacity: 0; transform: scale(0.5);">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="#000000" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter:drop-shadow(0 1px 4px rgba(0,0,0,0.8))"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><path d="m9 10 2 2 4-4"/></svg>
    </div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22],
    tooltipAnchor: [11, -11],
  });
};

export default function RouteLayer({
  route,
  isHighlight,
}: {
  route: RouteData;
  isHighlight: boolean;
}) {
  const { reportCounts } = useMapData();
  const roadPath = useRouteRoadPath(route);
  const path =
    roadPath.length > 0
      ? roadPath
      : route.points.map(
          (pt) => [pt.latitude, pt.longitude] as [number, number],
        );
  // Start invisible on first session load to sync with cinematic fly-in.
  // On route switches after initial load, skip the delay to avoid flicker.
  const [isVisible, setIsVisible] = useState(
    () =>
      typeof window !== "undefined" &&
      sessionStorage.getItem("dicis_map_flown") === "true",
  );
  const polylineRef = useRef<L.Polyline>(null);

  useEffect(() => {
    if (isVisible) return;
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 850);
    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) return null; // completely hidden while syncing Map Flight Animation

  const drawLineHandler = {
    add: (e: L.LeafletEvent) => {
      if (isHighlight && e.target) {
        const el = (e.target as L.Polyline).getElement();
        if (el && "getTotalLength" in el) {
          const svgEl = el as SVGGeometryElement;
          const length = svgEl.getTotalLength();
          svgEl.style.strokeDasharray = `${length}`;
          svgEl.style.strokeDashoffset = `${length}`;
          svgEl.getBoundingClientRect();
          svgEl.style.animation = "drawLine 1s ease-in-out forwards";
          setTimeout(() => {
            svgEl.style.strokeDasharray = "";
            svgEl.style.strokeDashoffset = "";
          }, 1050);
        }
      }
    },
  };

  return (
    <>
      {isHighlight ? (
        <>
          {/* Glow halo layer */}
          <Polyline
            key={`polyline-glow-${route.id}`}
            positions={path}
            weight={10}
            opacity={0.15}
            color="#ffffff"
            lineCap="round"
            lineJoin="round"
            noClip={true}
            interactive={false}
          />
          {/* Main active line */}
          <Polyline
            key={`polyline-${route.id}-active`}
            ref={polylineRef}
            positions={path}
            weight={3}
            opacity={1}
            color="#ffffff"
            lineCap="round"
            lineJoin="round"
            noClip={true}
            className="animated-polyline"
            eventHandlers={drawLineHandler}
          />
        </>
      ) : (
        <Polyline
          key={`polyline-${route.id}-inactive`}
          positions={path}
          weight={2}
          opacity={0.08}
          color="#71717a"
          lineCap="round"
          lineJoin="round"
          noClip={true}
          interactive={false}
        />
      )}

      {(() => {
        const stopsOnly = route.points.filter((p) => p.point_role !== "waypoint");
        const stopIndexMap = new Map(stopsOnly.map((p, i) => [p.stop_id, i]));
        return route.points.map((pt, idx) => {
        if (pt.point_role === "waypoint") return null;

        const stopIdx = stopIndexMap.get(pt.stop_id) ?? 0;
        const delay = isHighlight ? Math.max(0, stopIdx * 0.1) : 0;

        const stopReports = reportCounts.filter(
          (r) => r.stop_id === pt.stop_id && r.route_id === route.id,
        );
        const hasReports = stopReports.length > 0;
        const totalReports = stopReports.reduce(
          (s, r) => s + r.report_count,
          0,
        );

        let icon: import("leaflet").DivIcon;
        if (pt.point_role === "start") {
          icon = createStartIcon(delay);
        } else if (pt.point_role === "end") {
          icon = createEndIcon(delay);
        } else {
          icon = createStopIcon(delay, hasReports);
        }

        const nextArrivalText = getNextArrivalText(
          route,
          pt.cumulative_minutes,
          pt.point_role === "start",
        );

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
                className="shadcn-tooltip z-50"
              >
                <div className="relative bg-zinc-950 text-white border border-zinc-800 px-4 py-2.5 text-xs shadow-2xl flex flex-col items-center gap-1 min-w-[140px]">
                  {pt.point_role === "start" && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
                      Punto de salida
                    </span>
                  )}
                  {pt.point_role === "end" && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 mb-0.5">
                      Destino final
                    </span>
                  )}
                  <span className="font-bold text-[13px] leading-tight text-center">
                    {pt.stop_name}
                  </span>
                  {pt.cumulative_minutes > 0 && (
                    <span className="text-[10px] text-zinc-600 font-medium">
                      +{pt.cumulative_minutes} min desde inicio
                    </span>
                  )}
                  <div className="w-full border-t border-zinc-800 my-0.5" />
                  <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
                    {nextArrivalText}
                  </span>
                  {hasReports && (
                    <>
                      <div className="w-full border-t border-zinc-800 my-0.5" />
                      <span className="text-[10px] text-red-400 font-semibold whitespace-nowrap flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        {totalReports} reporte{totalReports !== 1 ? "s" : ""}{" "}
                        hoy
                      </span>
                    </>
                  )}
                  <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-950 border-b border-r border-zinc-800 rotate-45 z-[-1]" />
                </div>
              </Tooltip>
            )}
          </Marker>
        );
      });
      })()}
    </>
  );
}
