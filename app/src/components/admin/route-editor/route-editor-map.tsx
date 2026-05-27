"use client";

import {
  Map,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  useMap,
} from "@components/ui/map";
import type { OverridePoint } from "@hooks/admin/use-route-overrides";
import { useDirectionsPreview } from "@hooks/use-directions-preview";
import { nearestPathIndex } from "@lib/bus-path-utils";
import { DICIS_COORDS } from "@lib/constants";
import { latLngPathToLngLatPath } from "@lib/map-coordinates";
import { cn } from "@lib/utils";
import { Check, Diamond, MapPin } from "lucide-react";
import type MapLibreGL from "maplibre-gl";
import { useEffect } from "react";

const DEFAULT_CENTER: [number, number] = [DICIS_COORDS.lng, DICIS_COORDS.lat];
const DEFAULT_ZOOM = 13;

export type EditorMode = "idle" | "waypoint" | "stop";

interface RouteEditorMapProps {
  points: OverridePoint[];
  mode: EditorMode;
  onDragEnd: (index: number, lat: number, lng: number) => void;
  onMapClick: (lat: number, lng: number, insertAfterIndex: number) => void;
}

function isDraggable(point: OverridePoint): boolean {
  // Original stops (stop_id !== null) are fixed — deactivate, don't move.
  // Temp stops (stop_id === null, role !== waypoint) and waypoints are draggable.
  return point.stop_id === null;
}

function EditorMarkerContent({ point }: { point: OverridePoint }) {
  if (!point.active) {
    return (
      <div className="relative flex size-5 items-center justify-center rounded-full border-2 border-zinc-600 bg-zinc-800 opacity-40">
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-zinc-400">
          ✕
        </span>
      </div>
    );
  }

  if (point.point_role === "waypoint") {
    return (
      <div className="flex size-4 rotate-45 items-center justify-center rounded-sm border-2 border-blue-400 bg-zinc-900 shadow-lg">
        <Diamond className="size-2 -rotate-45 text-blue-400" strokeWidth={2} />
      </div>
    );
  }

  // Temp stop (stop_id === null, role === stop): amber pin
  if (point.stop_id === null && point.point_role === "stop") {
    return (
      <div className="rounded-full bg-amber-400 p-1 shadow-[0_0_0_3px_rgba(0,0,0,0.55),0_6px_18px_rgba(0,0,0,0.4)]">
        <MapPin
          className="size-4 fill-amber-400 text-zinc-900"
          strokeWidth={2.2}
        />
      </div>
    );
  }

  if (point.point_role === "start") {
    return (
      <div className="rounded-full bg-white p-1 shadow-[0_0_0_3px_rgba(0,0,0,0.55),0_6px_18px_rgba(0,0,0,0.4)]">
        <MapPin className="size-4 fill-white text-black" strokeWidth={2.2} />
      </div>
    );
  }

  if (point.point_role === "end") {
    return (
      <div className="relative rounded-full bg-black p-1 shadow-[0_0_0_3px_rgba(255,255,255,0.25),0_6px_18px_rgba(0,0,0,0.45)]">
        <MapPin className="size-4 fill-black text-white" strokeWidth={2.2} />
        <Check
          className="absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 text-white"
          strokeWidth={3}
        />
      </div>
    );
  }

  return (
    <span className="flex size-2.5 rounded-full bg-white shadow-[0_0_0_2px_rgba(0,0,0,0.65)]" />
  );
}

function MapClickHandler({
  active,
  previewPath,
  points,
  onMapClick,
}: {
  active: boolean;
  previewPath: [number, number][];
  points: OverridePoint[];
  onMapClick: (lat: number, lng: number, insertAfterIndex: number) => void;
}) {
  const { map } = useMap();

  useEffect(() => {
    if (!map || !active) return;

    const prev = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = "crosshair";

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      const { lat, lng } = e.lngLat;

      let insertAfterIndex = points.length - 2;
      if (previewPath.length >= 2) {
        const segIdx = nearestPathIndex(previewPath, lat, lng);
        const activePoints = points
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => p.active);
        const ratio = segIdx / Math.max(1, previewPath.length - 1);
        const targetIdx = Math.floor(ratio * (activePoints.length - 1));
        const after = activePoints[targetIdx];
        insertAfterIndex = after ? after.i : points.length - 2;
      }

      onMapClick(lat, lng, insertAfterIndex);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
      map.getCanvas().style.cursor = prev;
    };
  }, [map, active, previewPath, points, onMapClick]);

  return null;
}

export function RouteEditorMap({
  points,
  mode,
  onDragEnd,
  onMapClick,
}: RouteEditorMapProps) {
  const { path, status } = useDirectionsPreview(points);
  const lngLatPath = path.length >= 2 ? latLngPathToLngLatPath(path) : [];

  const routeColor =
    status === "invalid" || status === "error" ? "#ef4444" : "#4285F4";
  const routeDash: [number, number] | undefined =
    status === "invalid" || status === "error" ? [4, 3] : undefined;

  const clickActive = mode === "waypoint" || mode === "stop";

  return (
    <Map center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full">
      {lngLatPath.length >= 2 && (
        <>
          {status === "ok" && (
            <MapRoute
              id="editor-glow"
              coordinates={lngLatPath}
              color="#4285F4"
              width={10}
              opacity={0.12}
              interactive={false}
            />
          )}
          <MapRoute
            id="editor-route"
            coordinates={lngLatPath}
            color={routeColor}
            width={3}
            opacity={status === "loading" ? 0.4 : 0.9}
            dashArray={routeDash}
            interactive={false}
          />
        </>
      )}

      {/* Status overlays */}
      {status === "invalid" && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-red-500/30 bg-red-950/80 px-4 py-2 text-xs font-medium text-red-400 shadow-lg backdrop-blur-sm">
          Ruta inválida — activa al menos 2 paradas
        </div>
      )}
      {status === "loading" && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-zinc-700/50 bg-zinc-900/80 px-4 py-2 text-xs font-medium text-zinc-400 shadow-lg backdrop-blur-sm">
          Recalculando ruta…
        </div>
      )}
      {status === "error" && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-yellow-500/30 bg-yellow-950/80 px-4 py-2 text-xs font-medium text-yellow-400 shadow-lg backdrop-blur-sm">
          Error al obtener la geometría
        </div>
      )}

      {/* Mode hint */}
      {mode === "stop" && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-amber-500/30 bg-amber-950/80 px-4 py-2 text-xs font-medium text-amber-300 shadow-lg backdrop-blur-sm">
          Click en el mapa para colocar la parada temporal · Esc para cancelar
        </div>
      )}
      {mode === "waypoint" && (
        <div className="pointer-events-none absolute bottom-16 left-1/2 z-20 -translate-x-1/2 rounded-lg border border-blue-500/30 bg-blue-950/80 px-4 py-2 text-xs font-medium text-blue-300 shadow-lg backdrop-blur-sm">
          Click en el mapa para agregar waypoint auxiliar · Esc para cancelar
        </div>
      )}

      <MapClickHandler
        active={clickActive}
        previewPath={path}
        points={points}
        onMapClick={onMapClick}
      />

      {points.map((point, index) => (
        <MapMarker
          key={`editor-marker-${index}`}
          longitude={point.longitude}
          latitude={point.latitude}
          draggable={isDraggable(point)}
          onDragEnd={({ lat, lng }) => onDragEnd(index, lat, lng)}
        >
          <MarkerContent>
            <EditorMarkerContent point={point} />
          </MarkerContent>
          {point.point_role !== "waypoint" && (
            <MarkerLabel
              className={cn(
                "text-[10px]",
                !point.active && "line-through opacity-40",
                point.stop_id === null &&
                  point.point_role === "stop" &&
                  "text-amber-300",
              )}
            >
              {point.stop_name}
            </MarkerLabel>
          )}
          {point.point_role === "waypoint" && (
            <MarkerLabel className="text-[9px] text-blue-400/70">
              auxiliar
            </MarkerLabel>
          )}
        </MapMarker>
      ))}
    </Map>
  );
}
