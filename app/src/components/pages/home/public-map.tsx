"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import MapResizeHandler from "./map-resize-handler";

export default function PublicMap({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setMounted(true);
    setMapKey((prev) => prev + 1);
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
    <div className={`bg-black flex-1 relative z-0 w-full h-full ${className}`}>
      <MapContainer
        key={`map-${mapKey}`}
        center={[20.54, -101.195]}
        zoom={13}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
      >
        <MapResizeHandler />
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
      </MapContainer>
    </div>
  );
}
