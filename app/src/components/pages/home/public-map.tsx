"use client";

import "leaflet/dist/leaflet.css";
import { useMapData } from "@providers/map-provider";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import BusMarkerLayer from "./bus-marker-layer";
import MapResizeHandler from "./map-resize-handler";
import RouteFocus from "./route-focus";
import RouteLayer from "./route-layer";
import UserLocationMarker from "./user-location-marker";

function CinematicFlight() {
  const map = useMap();
  const { routes } = useMapData();

  useEffect(() => {
    if (routes.length === 0) return;

    const dicisPoint = routes[0]?.points?.find((p) => p.stop_name === "DICIS");
    const targetCenter: [number, number] = dicisPoint
      ? [dicisPoint.latitude, dicisPoint.longitude]
      : [20.549879054215197, -101.2008414859346];

    const targetZoom = 14;

    const timeout = setTimeout(() => {
      map.invalidateSize();

      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        sessionStorage.setItem("dicis_map_flown", "true");

        map.flyTo(targetCenter, targetZoom, {
          animate: true,
          duration: 1,
          easeLinearity: 0.25,
        });
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, [map, routes]);

  return null;
}

export default function PublicMap({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [hasFlown, setHasFlown] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  const { routes, activeRouteId, isLoading } = useMapData();

  useEffect(() => {
    setMounted(true);
    setMapKey((prev) => prev + 1);

    if (sessionStorage.getItem("dicis_map_flown")) {
      setHasFlown(true);
    }
    return () => setMounted(false);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`bg-black/10 flex-1 relative w-full h-full animate-pulse ${className}`}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`bg-black flex-1 relative z-0 w-full h-full overflow-hidden ${className}`}
    >
      <MapContainer
        key={`map-${mapKey}`}
        center={
          hasFlown
            ? [20.549879054215197, -101.2008414859346]
            : [20.8, -101.2008]
        }
        zoom={hasFlown ? 13 : 9}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        {!hasFlown && <CinematicFlight />}
        <MapResizeHandler />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />

        {!isLoading &&
          routes.map(
            (route) =>
              route.id === activeRouteId && (
                <RouteLayer key={route.id} route={route} isHighlight={true} />
              ),
          )}

        {/* All active buses shown regardless of selected route */}
        {!isLoading &&
          routes.map((route) => (
            <BusMarkerLayer key={`bus-${route.id}`} route={route} />
          ))}

        <UserLocationMarker />
        {hasFlown && <RouteFocus />}
      </MapContainer>
    </motion.div>
  );
}
