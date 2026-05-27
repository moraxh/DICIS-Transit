"use client";

import { Map as TransitMap, useMap } from "@components/ui/map";
import { DICIS_COORDS } from "@lib/constants";
import { useMapData } from "@providers/map-provider";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import BusMarkerLayer from "./bus-marker-layer";
import MapResizeHandler from "./map-resize-handler";
import RouteFocus from "./route-focus";
import RouteLayer from "./route-layer";
import UserLocationMarker from "./user-location-marker";

function CinematicFlight() {
  const { map, isLoaded } = useMap();
  const { routes } = useMapData();

  useEffect(() => {
    if (!isLoaded || !map || routes.length === 0) return;

    const dicisRoute =
      routes.find((route) => route.direction === "from_dicis") ?? routes[0];
    const dicisPoint = dicisRoute.points.find(
      (point) => point.point_role === "end",
    );
    const targetCenter: [number, number] = dicisPoint
      ? [dicisPoint.longitude, dicisPoint.latitude]
      : [DICIS_COORDS.lng, DICIS_COORDS.lat];

    const timeout = setTimeout(() => {
      map.resize();
      sessionStorage.setItem("dicis_map_flown", "true");
      map.flyTo({
        center: targetCenter,
        zoom: 14,
        duration: 1000,
      });
    }, 1200);

    return () => clearTimeout(timeout);
  }, [isLoaded, map, routes]);

  return null;
}

export default function PublicMap({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [hasFlown, setHasFlown] = useState(false);
  const { routes, activeRouteId, isLoading, error, temporaryOverrides } =
    useMapData();

  useEffect(() => {
    setMounted(true);
    if (sessionStorage.getItem("dicis_map_flown")) {
      setHasFlown(true);
    }
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`relative h-full w-full flex-1 animate-pulse bg-black/10 ${className}`}
      />
    );
  }

  if (error) {
    return (
      <div
        className={`relative flex h-full w-full flex-1 flex-col items-center justify-center gap-3 bg-zinc-950 ${className}`}
      >
        <p className="text-sm font-medium text-zinc-300">
          No se pudo cargar el servicio
        </p>
        <p className="text-xs text-zinc-500">{error.message}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`relative z-0 h-full w-full flex-1 overflow-hidden bg-black ${className}`}
    >
      <TransitMap
        className="h-full w-full"
        center={
          hasFlown ? [DICIS_COORDS.lng, DICIS_COORDS.lat] : [-101.2008, 20.8]
        }
        zoom={hasFlown ? 13 : 9}
        pitchWithRotate={false}
        dragRotate={false}
        maxPitch={0}
      >
        {!hasFlown ? <CinematicFlight /> : null}
        <MapResizeHandler />

        {!isLoading
          ? routes.map((route) =>
              route.id === activeRouteId ? (
                <RouteLayer
                  key={route.id}
                  route={route}
                  isHighlight={true}
                  temporaryOverride={
                    temporaryOverrides.find((o) => o.route_id === route.id) ??
                    null
                  }
                />
              ) : null,
            )
          : null}

        {!isLoading
          ? routes.map((route) => (
              <BusMarkerLayer key={`bus-${route.id}`} route={route} />
            ))
          : null}

        <UserLocationMarker />
        {hasFlown ? <RouteFocus /> : null}
      </TransitMap>
    </motion.div>
  );
}
