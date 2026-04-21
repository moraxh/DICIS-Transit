import type { RouteData, RouteSchedule } from "@providers/map-provider";

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatTime(time24: string): string {
  const [hRaw, m] = time24.split(":");
  const h = Number(hRaw);
  const ampm = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

export function getMinutesUntil(departureTime: string): number {
  const now = new Date();
  const [h, m] = departureTime.split(":").map(Number);
  return h * 60 + m - (now.getHours() * 60 + now.getMinutes());
}

export function formatMinutesRelative(minutes: number): string {
  if (minutes < 60) return `en ${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `en ${h}h ${m}m` : `en ${h}h`;
}

export function isSchedulePassed(departureTime: string): boolean {
  return getMinutesUntil(departureTime) < 0;
}

export function getNextScheduleIndex(
  schedules: Pick<RouteSchedule, "departure_time">[],
): number {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < schedules.length; i++) {
    const [h, m] = schedules[i].departure_time.split(":").map(Number);
    if (currentMinutes <= h * 60 + m) return i;
  }
  return -1;
}

export function getTodayPgDay(): number {
  const jsDay = new Date().getDay();
  return jsDay === 0 ? 7 : jsDay;
}

export function getTodaysSchedules(route: RouteData): RouteSchedule[] {
  const today = getTodayPgDay();
  return (route.schedules ?? []).filter(
    (s) => s.days_active && s.days_active.includes(today),
  );
}

export function getNextArrivalText(
  route: RouteData,
  cumulativeMinutes: number,
  isStartPoint: boolean,
): string {
  const todaysSchedules = getTodaysSchedules(route);
  if (todaysSchedules.length === 0) return "Sin servicio hoy";

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const sorted = [...todaysSchedules].sort((a, b) =>
    a.departure_time.localeCompare(b.departure_time),
  );

  for (const s of sorted) {
    const [h, m] = s.departure_time.split(":").map(Number);
    const arrivalMins = h * 60 + m + cumulativeMinutes;
    if (arrivalMins >= currentMins) {
      const hh = Math.floor(arrivalMins / 60) % 24;
      const mm = (arrivalMins % 60).toString().padStart(2, "0");
      const ampm = hh >= 12 ? "p.m." : "a.m.";
      const h12 = hh % 12 === 0 ? 12 : hh % 12;
      return `${isStartPoint ? "Parte a las" : "Siguiente:"} ${h12}:${mm} ${ampm}`;
    }
  }
  return "No hay más por hoy";
}

export interface ActiveBus {
  lat: number;
  lng: number;
  elapsedMins: number;
  minutesUntilEnd: number;
  departureTime: string;
}

export function getActiveBuses(route: RouteData): ActiveBus[] {
  const todaysSchedules = getTodaysSchedules(route);
  if (todaysSchedules.length === 0) return [];

  const now = new Date();
  const currentMins =
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const namedPoints = route.points.filter((p) => p.point_role !== "waypoint");
  if (namedPoints.length < 2) return [];

  const lastStop = namedPoints[namedPoints.length - 1];
  const totalMins = lastStop.cumulative_minutes;
  const activeBuses: ActiveBus[] = [];

  for (const schedule of todaysSchedules) {
    const [h, m] = schedule.departure_time.split(":").map(Number);
    const departureMins = h * 60 + m;
    const elapsedMins = currentMins - departureMins;

    if (elapsedMins < 0 || elapsedMins > totalMins) continue;

    let prevPoint = namedPoints[0];
    let nextPoint = namedPoints[1];

    for (let i = 0; i < namedPoints.length - 1; i++) {
      const curr = namedPoints[i];
      const next = namedPoints[i + 1];
      if (
        curr.cumulative_minutes <= elapsedMins &&
        elapsedMins <= next.cumulative_minutes
      ) {
        prevPoint = curr;
        nextPoint = next;
        break;
      }
    }

    const segmentTotal =
      nextPoint.cumulative_minutes - prevPoint.cumulative_minutes;
    const t =
      segmentTotal > 0
        ? (elapsedMins - prevPoint.cumulative_minutes) / segmentTotal
        : 0;

    activeBuses.push({
      lat: prevPoint.latitude + t * (nextPoint.latitude - prevPoint.latitude),
      lng:
        prevPoint.longitude + t * (nextPoint.longitude - prevPoint.longitude),
      elapsedMins,
      minutesUntilEnd: totalMins - elapsedMins,
      departureTime: schedule.departure_time,
    });
  }

  return activeBuses;
}

export interface UpcomingDeparture {
  routeName: string;
  routeId: string;
  departureTime: string;
  minutesUntil: number;
}

export function getUpcomingDepartures(
  routes: RouteData[],
  limit = 5,
): UpcomingDeparture[] {
  const today = getTodayPgDay();
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const results: UpcomingDeparture[] = [];

  for (const route of routes) {
    const todaySchedules = (route.schedules ?? []).filter(
      (s) => s.days_active && s.days_active.includes(today),
    );
    for (const s of todaySchedules) {
      const [h, m] = s.departure_time.split(":").map(Number);
      const depMins = h * 60 + m;
      const minutesUntil = depMins - currentMins;
      if (minutesUntil >= 0 && minutesUntil <= 120) {
        results.push({
          routeName: route.name,
          routeId: route.id,
          departureTime: s.departure_time,
          minutesUntil,
        });
      }
    }
  }

  return results.sort((a, b) => a.minutesUntil - b.minutesUntil).slice(0, limit);
}

export interface NearestStopArrival {
  routeId: string;
  routeName: string;
  stopId: string;
  stopName: string;
  stopLat: number;
  stopLng: number;
  distanceMeters: number;
  minutesUntilArrival: number | null;
  arrivalTime: string | null;
}

export function getNearestStopWithNextArrival(
  routes: RouteData[],
  userLocation: [number, number] | null,
  suggestedDirection: "to_dicis" | "from_dicis" | null,
): NearestStopArrival | null {
  if (!userLocation) return null;

  const [userLat, userLng] = userLocation;
  let best: {
    route: RouteData;
    point: RouteData["points"][number];
    distance: number;
  } | null = null;

  for (const route of routes) {
    if (suggestedDirection && route.direction !== suggestedDirection) continue;
    for (const p of route.points) {
      if (p.point_role === "waypoint") continue;
      const d = haversineMeters(userLat, userLng, p.latitude, p.longitude);
      if (!best || d < best.distance) {
        best = { route, point: p, distance: d };
      }
    }
  }

  if (!best) return null;

  const todays = getTodaysSchedules(best.route);
  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();
  const sorted = [...todays].sort((a, b) =>
    a.departure_time.localeCompare(b.departure_time),
  );

  let minutesUntilArrival: number | null = null;
  let arrivalTime: string | null = null;
  for (const s of sorted) {
    const [h, m] = s.departure_time.split(":").map(Number);
    const arrivalMins = h * 60 + m + best.point.cumulative_minutes;
    if (arrivalMins >= currentMins) {
      minutesUntilArrival = arrivalMins - currentMins;
      const hh = Math.floor(arrivalMins / 60) % 24;
      const mm = (arrivalMins % 60).toString().padStart(2, "0");
      arrivalTime = `${hh.toString().padStart(2, "0")}:${mm}`;
      break;
    }
  }

  return {
    routeId: best.route.id,
    routeName: best.route.name,
    stopId: best.point.stop_id,
    stopName: best.point.stop_name,
    stopLat: best.point.latitude,
    stopLng: best.point.longitude,
    distanceMeters: best.distance,
    minutesUntilArrival,
    arrivalTime,
  };
}
