"use client";

import { useMapData } from "@providers/map-provider";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function RouteFocus() {
  const map = useMap();
  const { routes, activeRouteId, activeStopId } = useMapData();

  useEffect(() => {
    if (!activeRouteId || routes.length === 0) return;

    if (sessionStorage.getItem("dicis_map_flown")) {
      const activeRoute = routes.find((r) => r.id === activeRouteId);

      if (activeRoute && activeRoute.points.length > 0) {
        if (activeStopId) {
          const activeStop = activeRoute.points.find(
            (pt) => pt.stop_id === activeStopId,
          );
          if (activeStop) {
            // If zooming to a specific stop
            const mapSize = map.getSize();
            if (mapSize && mapSize.x > 0 && mapSize.y > 0) {
              const leftPad = mapSize.x > 768 ? 320 : 20;
              // Map flyTo single coordinate
              map.flyTo([activeStop.latitude, activeStop.longitude], 17, {
                animate: true,
                duration: 1.0,
                easeLinearity: 0.25,
              });
            }
          }
        } else {
          // Find the bounds to frame the entire route
          const bounds = L.latLngBounds(
            activeRoute.points.map((pt) => [pt.latitude, pt.longitude]),
          );

          // Fly to bounds (padding to avoid sticking to the edge and space for sidebar)
          const mapSize = map.getSize();

          // Ensure map is actually rendered and has dimensions to avoid (NaN, NaN) projection errors
          if (mapSize && mapSize.x > 0 && mapSize.y > 0) {
            const leftPad = mapSize.x > 768 ? 320 : 20;

            map.flyToBounds(bounds, {
              paddingTopLeft: [leftPad, 20],
              paddingBottomRight: [20, 20],
              duration: 0.8,
              easeLinearity: 0.25,
            });
          }
        }
      }
    }
  }, [activeRouteId, activeStopId, routes, map]);

  return null;
}
