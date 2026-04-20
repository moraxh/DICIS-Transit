"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapResizeHandler() {
  const map = useMap();

  // Re render the map on window resize to fix leaflet's weird behavior of not resizing the map when the container size changes
  useEffect(() => {
    // Invalidate after mount so Leaflet recalculates after any CSS transitions settle
    const timer = setTimeout(() => map.invalidateSize(), 1100);

    const observer = new ResizeObserver(() => {
      map.invalidateSize();
    });

    const container = map.getContainer();
    observer.observe(container);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}
