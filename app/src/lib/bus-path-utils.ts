// Geospatial utilities for continuous bus animation along a road path.
// All interpolation operates on cumulative arc-length, never raw lat/lng lerp,
// so the marker stays on the polyline through curves and complex geometry.

export type Coord = [number, number]; // [lat, lng]

/** Euclidean distance between two coords (degrees). Sufficient for sub-km segments. */
export function segDist(a: Coord, b: Coord): number {
  const dlat = b[0] - a[0];
  const dlng = b[1] - a[1];
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

/**
 * Precompute cumulative arc-length at each vertex of a path.
 * cumulativeDist[i] = total path length from index 0 to index i.
 * O(n) — call once when roadPath loads, cache in useMemo.
 */
export function buildCumulativeDistances(path: Coord[]): Float64Array {
  const acc = new Float64Array(path.length);
  for (let i = 1; i < path.length; i++) {
    acc[i] = acc[i - 1] + segDist(path[i - 1], path[i]);
  }
  return acc;
}

/**
 * Walk exactly `distance` units along the path starting at vertex `fromIdx`,
 * returning the interpolated position. O(k) where k = segments traversed.
 */
export function walkPath(
  path: Coord[],
  cumDist: Float64Array,
  fromIdx: number,
  distance: number,
): { position: Coord; segmentIndex: number } {
  if (path.length === 0) return { position: [0, 0], segmentIndex: 0 };
  if (distance <= 0) return { position: path[fromIdx], segmentIndex: fromIdx };

  let remaining = distance;
  for (let i = fromIdx; i < path.length - 1; i++) {
    const segLen = cumDist[i + 1] - cumDist[i];
    if (remaining <= segLen) {
      const t = segLen === 0 ? 0 : remaining / segLen;
      return {
        position: [
          path[i][0] + t * (path[i + 1][0] - path[i][0]),
          path[i][1] + t * (path[i + 1][1] - path[i][1]),
        ],
        segmentIndex: i,
      };
    }
    remaining -= segLen;
  }

  return {
    position: path[path.length - 1],
    segmentIndex: path.length - 1,
  };
}

/**
 * Nearest path vertex index using projected point-on-segment distance.
 * Constrained to [startIdx, endIdx] to preserve route monotonicity.
 */
export function nearestPathIndex(
  path: Coord[],
  lat: number,
  lng: number,
  startIdx = 0,
  endIdx = path.length - 2,
): number {
  let bestIdx = startIdx;
  let bestD = Infinity;
  const first = Math.max(0, Math.min(startIdx, path.length - 2));
  const last = Math.max(first, Math.min(endIdx, path.length - 2));

  for (let i = first; i <= last; i++) {
    const [x1, y1] = path[i];
    const [x2, y2] = path[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    const t =
      lenSq === 0
        ? 0
        : Math.max(0, Math.min(1, ((lat - x1) * dx + (lng - y1) * dy) / lenSq));
    const d = (x1 + t * dx - lat) ** 2 + (y1 + t * dy - lng) ** 2;
    if (d < bestD) {
      bestD = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/** Map each named stop to its nearest index in the road path. */
export function buildStopRoadIndices(
  path: Coord[],
  namedPoints: { latitude: number; longitude: number }[],
): number[] {
  if (path.length < 2 || namedPoints.length === 0) return [];
  const indices: number[] = [];
  for (let p = 0; p < namedPoints.length; p++) {
    const pt = namedPoints[p];
    const remaining = namedPoints.length - p - 1;
    const minIdx = indices[p - 1] ?? 0;
    const maxIdx = Math.max(minIdx, path.length - 2 - remaining);
    indices.push(nearestPathIndex(path, pt.latitude, pt.longitude, minIdx, maxIdx));
  }
  return indices;
}

/**
 * Interpolate a position along the road path between two stop indices,
 * using cumulative arc-length so the result always lies on the polyline.
 */
export function pointAlongSegment(
  path: Coord[],
  cumDist: Float64Array,
  startIdx: number,
  endIdx: number,
  fraction: number,
): { position: Coord; segmentIndex: number } {
  if (startIdx >= endIdx) {
    return { position: path[startIdx] ?? [0, 0], segmentIndex: startIdx };
  }
  const segLen = cumDist[endIdx] - cumDist[startIdx];
  if (segLen === 0) {
    return { position: path[startIdx], segmentIndex: startIdx };
  }
  const t = Math.max(0, Math.min(1, fraction));
  return walkPath(path, cumDist, startIdx, t * segLen);
}

/**
 * Look ahead `distance` units from `fromPosition` along the path for heading.
 * Returns the look-ahead point, or the segment end if path runs out.
 */
export function pointAheadOnPath(
  path: Coord[],
  fromPosition: Coord,
  fromSegmentIndex: number,
  endIdx: number,
  lookAheadDistance: number,
): Coord {
  let remaining = lookAheadDistance;
  let current = fromPosition;

  for (let i = fromSegmentIndex; i < endIdx; i++) {
    const next = path[i + 1];
    const d = segDist(current, next);
    if (d >= remaining) {
      const t = d === 0 ? 0 : remaining / d;
      return [
        current[0] + t * (next[0] - current[0]),
        current[1] + t * (next[1] - current[1]),
      ];
    }
    remaining -= d;
    current = next;
  }

  return path[Math.min(endIdx, path.length - 1)];
}

/** True bearing in degrees [0, 360) from `from` to `to`. */
export function bearingDeg(from: Coord, to: Coord): number {
  const phi1 = (from[0] * Math.PI) / 180;
  const phi2 = (to[0] * Math.PI) / 180;
  const dLambda = ((to[1] - from[1]) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Interpolate between two angles taking the shortest arc.
 * Prevents 350° → 10° rotating the long way (340°).
 */
export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return (a + diff * t + 360) % 360;
}

/** Cubic ease-in-out: smooth acceleration and deceleration. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
