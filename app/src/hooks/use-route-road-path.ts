import { NEXT_PUBLIC_MAPBOX_TOKEN } from "@lib/env";
import type { RouteData } from "@providers/map-provider";
import { useEffect, useState } from "react";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [2000, 8000]; // exponential: 2s, 8s

// Module-level dedup: one fetch per route id across all consumers
const inFlight = new Map<string, Promise<[number, number][]>>();
// Track retry state per route at module level so mount/unmount resets don't create storms
const retryState = new Map<string, { count: number; nextRetryAt: number }>();

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
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const key = String(route.id);
    const state = retryState.get(key);

    // If within backoff window, schedule retry after delay instead of firing immediately
    if (state && state.count > 0) {
      const wait = state.nextRetryAt - Date.now();
      if (wait > 0) {
        const timer = setTimeout(() => {
          if (!cancelled) setTick((t) => t + 1);
        }, wait);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
    }

    let promise = inFlight.get(key);
    if (!promise) {
      promise = fetchRoadPath(route).finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
    }

    promise
      .then((coords) => {
        if (!cancelled && coords.length > 0) {
          retryState.delete(key);
          setPath(coords);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const cur = retryState.get(key) ?? { count: 0, nextRetryAt: 0 };
          if (cur.count < MAX_RETRIES) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(`route_mapbox_${route.id}`);
            }
            const backoff = RETRY_BACKOFF_MS[cur.count] ?? RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
            retryState.set(key, { count: cur.count + 1, nextRetryAt: Date.now() + backoff });
            setTick((t) => t + 1);
          }
        }
      });

    return () => {
      cancelled = true;
    };
  }, [route, tick]);

  return path;
}
