"use client";

import "leaflet/dist/leaflet.css";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import MapResizeHandler from "./map-resize-handler";

function CinematicFlight() {
  const map = useMap();

  useEffect(() => {
    const targetCenter: [number, number] = [
      20.549879054215197, -101.2008414859346,
    ];
    const targetZoom = 15;

    // Delay the flight slightly to allow the UI entering animation to finish.
    // Framer motion animation takes 1s (0.2 delay + 0.8 duration), so we wait 1.2s.
    const timeout = setTimeout(() => {
      map.invalidateSize(); // Force recalculation to prevent (NaN, NaN) projection errors

      // Ensure the container actually has a size before attempting to fly
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        // Mark as flown in this session right before starting the flight
        sessionStorage.setItem("dicis_map_flown", "true");

        // flyTo uses an exponential zoom-pan curve internally (van Wijk & Nuij for cinematic movement)
        map.flyTo(targetCenter, targetZoom, {
          animate: true,
          duration: 3,
          easeLinearity: 0.25, // Exponential / Bezier curve degree
        });
      }
    }, 1200);

    return () => clearTimeout(timeout);
  }, [map]);

  return null;
}

export default function PublicMap({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [hasFlown, setHasFlown] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    setMapKey((prev) => prev + 1);

    // Only fly once per session to improve UX
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
      initial={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
      className={`bg-black flex-1 relative z-0 w-full h-full overflow-hidden ${className}`}
    >
      <MapContainer
        key={`map-${mapKey}`}
        center={
          hasFlown
            ? [20.549879054215197, -101.2008414859346]
            : [20.8, -101.2008]
        } // Start further north if first time
        zoom={hasFlown ? 15 : 9} // Initial wider zoom level or final zoom if already flown
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        {!hasFlown && <CinematicFlight />}
        <MapResizeHandler />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      </MapContainer>
    </motion.div>
  );
}
