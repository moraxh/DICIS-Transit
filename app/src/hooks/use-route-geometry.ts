import { NEXT_PUBLIC_MAPBOX_TOKEN } from "@lib/env.client";
import type { RouteData } from "@providers/map-provider";
import { useEffect, useState } from "react";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [2000, 8000];

const inFlight = new Map<string, Promise<[number, number][]>>();
const retryState = new Map<string, { count: number; nextRetryAt: number }>();

interface CacheEntry {
  coords: [number, number][];
  cachedAt: number;
}

async function fetchRouteGeometry(
  route: RouteData,
): Promise<[number, number][]> {
  const cacheKey = `route_geometry_${route.id}`;

  if (typeof window !== "undefined") {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as CacheEntry | [number, number][];
        if (Array.isArray(parsed)) {
          localStorage.removeItem(cacheKey);
        } else if (Date.now() - parsed.cachedAt <= CACHE_TTL_MS) {
          return parsed.coords;
        } else {
          localStorage.removeItem(cacheKey);
        }
      } catch {
        localStorage.removeItem(cacheKey);
      }
    }
  }

  const waypoints = route.points
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${NEXT_PUBLIC_MAPBOX_TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Route geometry HTTP ${response.status} for route ${route.id}`,
    );
  }

  const data = await response.json();
  if (data.code === "Ok" && data.routes?.[0]) {
    const coordinates = data.routes[0].geometry.coordinates.map(
      (coordinate: number[]) =>
        [coordinate[1], coordinate[0]] as [number, number],
    );

    if (typeof window !== "undefined") {
      const entry: CacheEntry = { coords: coordinates, cachedAt: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    }

    return coordinates;
  }

  throw new Error(
    `Route geometry unavailable for route ${route.id} (code: ${data.code ?? "unknown"})`,
  );
}

export function useRouteGeometry(route: RouteData): [number, number][] {
  const [path, setPath] = useState<[number, number][]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const key = String(route.id);
    const state = retryState.get(key);

    if (state && state.count > 0) {
      const wait = state.nextRetryAt - Date.now();
      if (wait > 0) {
        const timer = setTimeout(() => {
          if (!cancelled) setTick((value) => value + 1);
        }, wait);

        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
    }

    if (state && state.count >= MAX_RETRIES) {
      return;
    }

    let promise = inFlight.get(key);
    if (!promise) {
      promise = fetchRouteGeometry(route).finally(() => inFlight.delete(key));
      inFlight.set(key, promise);
    }

    promise
      .then((coords) => {
        if (!cancelled) {
          retryState.delete(key);
          setPath(coords);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const current = retryState.get(key) ?? { count: 0, nextRetryAt: 0 };
          if (current.count < MAX_RETRIES) {
            if (typeof window !== "undefined") {
              localStorage.removeItem(`route_geometry_${route.id}`);
            }
            const backoff =
              RETRY_BACKOFF_MS[current.count] ??
              RETRY_BACKOFF_MS[RETRY_BACKOFF_MS.length - 1];
            retryState.set(key, {
              count: current.count + 1,
              nextRetryAt: Date.now() + backoff,
            });
            setTick((value) => value + 1);
          }
        }
      });

    return () => {
      cancelled = true;
    };
    // Keyed by route.id: geometry is cached per route id, so a new `route` object
    // reference with the same id should not trigger a refetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.id, tick]);

  return path;
}
