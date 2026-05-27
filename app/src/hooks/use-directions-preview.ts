import { NEXT_PUBLIC_MAPBOX_TOKEN } from "@lib/env.client";
import { useEffect, useRef, useState } from "react";

export type PreviewStatus = "idle" | "loading" | "ok" | "invalid" | "error";

interface PreviewPoint {
  latitude: number;
  longitude: number;
  active: boolean;
}

interface PreviewResult {
  path: [number, number][];
  status: PreviewStatus;
}

const DEBOUNCE_MS = 500;

async function fetchPreviewGeometry(
  points: PreviewPoint[],
): Promise<[number, number][]> {
  const active = points.filter((p) => p.active);
  if (active.length < 2) throw new Error("invalid");

  const waypoints = active
    .map((p) => `${p.longitude},${p.latitude}`)
    .join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?geometries=geojson&overview=full&access_token=${NEXT_PUBLIC_MAPBOX_TOKEN}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`http_${response.status}`);

  const data = await response.json();
  if (data.code !== "Ok" || !data.routes?.[0]) throw new Error("invalid");

  return data.routes[0].geometry.coordinates.map(
    (coord: number[]) => [coord[1], coord[0]] as [number, number],
  );
}

export function useDirectionsPreview(points: PreviewPoint[]): PreviewResult {
  const [path, setPath] = useState<[number, number][]>([]);
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const active = points.filter((p) => p.active);

    if (active.length < 2) {
      setPath([]);
      setStatus(active.length === 0 ? "idle" : "invalid");
      return;
    }

    setStatus("loading");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      fetchPreviewGeometry(points)
        .then((coords) => {
          if (controller.signal.aborted) return;
          setPath(coords);
          setStatus("ok");
        })
        .catch((err: Error) => {
          if (controller.signal.aborted) return;
          setPath([]);
          setStatus(err.message === "invalid" ? "invalid" : "error");
        });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => ({ lat: p.latitude, lng: p.longitude, active: p.active })))]);

  return { path, status };
}
