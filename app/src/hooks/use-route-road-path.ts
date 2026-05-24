import { NEXT_PUBLIC_MAPBOX_TOKEN } from "@lib/env";
import type { RouteData } from "@providers/map-provider";
import { useEffect, useState } from "react";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_RETRIES = 2;

// Module-level dedup: one fetch per route id across all consumers
const inFlight = new Map<string, Promise<[number, number][]>>();

interface CacheEntry {
  coords: [number, number][];
  cachedAt: number;
}

async function fetchRoadPath(route: RouteData): Promise<[number, number][]> {
  const cacheKey = `route_mapbox_${route.id}`;

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CacheEntry | [number, number][];
        // Support both old format (bare array) and new format (with cachedAt)
        if (Array.isArray(parsed)) {
          return parsed;
        }
        if (Date.now() - parsed.cachedAt <= CACHE_TTL_MS) {
          return parsed.coords;
        }
        localStorage.removeItem(cacheKey);
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  const waypoints = route.points
    .map((pt) => `${pt.longitude},${pt.latitude}`)
    .join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${NEXT_PUBLIC_MAPBOX_TOKEN}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.code === "Ok" && data.routes?.[0]) {
    const coordinates = data.routes[0].geometry.coordinates.map(
      (c: number[]) => [c[1], c[0]] as [number, number],
    );
    if (typeof window !== "undefined") {
      const entry: CacheEntry = { coords: coordinates, cachedAt: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    }
    return coordinates;
  }

  return [];
}

export function useRouteRoadPath(route: RouteData): [number, number][] {
  const [path, setPath] = useState<[number, number][]>([]);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const key = String(route.id);

    let promise = inFlight.get(key);
    if (!promise) {
      promise = fetchRoadPath(route).finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
    }

    promise
      .then((coords) => {
        if (!cancelled && coords.length > 0) setPath(coords);
      })
      .catch(() => {
        if (!cancelled && retryCount < MAX_RETRIES) {
          if (typeof window !== "undefined") {
            localStorage.removeItem(`route_mapbox_${route.id}`);
          }
          setRetryCount((c) => c + 1);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [route, retryCount]);

  return path;
}
