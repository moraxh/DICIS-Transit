"use client";

import { useMap } from "@components/ui/map";
import { getBoundsFromCoordinates, pointToLngLat } from "@lib/map-coordinates";
import { useMapData } from "@providers/map-provider";
import { useEffect } from "react";

export default function RouteFocus() {
  const { map, isLoaded } = useMap();
  const { routes, activeRouteId, activeStopId } = useMapData();

  useEffect(() => {
    if (!isLoaded || !map || routes.length === 0) return;
    if (!sessionStorage.getItem("dicis_map_flown")) return;

    const container = map.getContainer();
    const leftPad = container.clientWidth > 768 ? 320 : 20;

    if (activeStopId) {
      const stopOwner = routes.find((route) =>
        route.points.some((point) => point.stop_id === activeStopId),
      );
      const activeStop = stopOwner?.points.find(
        (point) => point.stop_id === activeStopId,
      );
      if (activeStop) {
        map.flyTo({
          center: [activeStop.longitude, activeStop.latitude],
          zoom: 17,
          duration: 1000,
        });
      }
      return;
    }

    if (!activeRouteId) return;

    const activeRoute = routes.find((route) => route.id === activeRouteId);
    if (!activeRoute || activeRoute.points.length === 0) return;

    const bounds = getBoundsFromCoordinates(
      activeRoute.points.map(pointToLngLat),
    );
    if (!bounds) return;

    map.fitBounds(bounds, {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: leftPad,
      },
      duration: 800,
    });
  }, [activeRouteId, activeStopId, isLoaded, map, routes]);

  return null;
}
