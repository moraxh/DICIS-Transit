"use client";

import { useMapData } from "@providers/map-provider";
import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function RouteFocus() {
  const map = useMap();
  const { routes, activeRouteId, activeStopId } = useMapData();

  useEffect(() => {
    if (routes.length === 0) return;
    if (!sessionStorage.getItem("dicis_map_flown")) return;

    const mapSize = map.getSize();
    if (!mapSize || mapSize.x <= 0 || mapSize.y <= 0) return;
    const leftPad = mapSize.x > 768 ? 320 : 20;

    if (activeStopId) {
      const stopOwner = routes.find((r) =>
        r.points.some((pt) => pt.stop_id === activeStopId),
      );
      const activeStop = stopOwner?.points.find(
        (pt) => pt.stop_id === activeStopId,
      );
      if (activeStop) {
        map.flyTo([activeStop.latitude, activeStop.longitude], 17, {
          animate: true,
          duration: 1.0,
          easeLinearity: 0.25,
        });
      }
      return;
    }

    if (activeRouteId) {
      const activeRoute = routes.find((r) => r.id === activeRouteId);
      if (!activeRoute || activeRoute.points.length === 0) return;
      const bounds = L.latLngBounds(
        activeRoute.points.map((pt) => [pt.latitude, pt.longitude]),
      );
      map.flyToBounds(bounds, {
        paddingTopLeft: [leftPad, 20],
        paddingBottomRight: [20, 20],
        duration: 0.8,
        easeLinearity: 0.25,
      });
    }
  }, [activeRouteId, activeStopId, routes, map]);

  return null;
}
