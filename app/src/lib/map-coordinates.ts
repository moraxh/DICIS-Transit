export type LngLatTuple = [number, number];

export function toLngLat(latitude: number, longitude: number): LngLatTuple {
  return [longitude, latitude];
}

export function pointToLngLat(point: {
  latitude: number;
  longitude: number;
}): LngLatTuple {
  return [point.longitude, point.latitude];
}

export function latLngPathToLngLatPath(
  points: [number, number][],
): LngLatTuple[] {
  return points.map(([latitude, longitude]) => [longitude, latitude]);
}

export function getBoundsFromCoordinates(
  coordinates: LngLatTuple[],
): [LngLatTuple, LngLatTuple] | null {
  if (coordinates.length === 0) return null;

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  for (const [lng, lat] of coordinates) {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}
