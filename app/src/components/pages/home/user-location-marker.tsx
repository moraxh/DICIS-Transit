import { useMapData } from "@providers/map-provider";
import L from "leaflet";
import { useEffect } from "react";
import { Marker, Tooltip } from "react-leaflet";

const userIcon = L.divIcon({
  className: "bg-transparent border-none",
  html: `<div style="
    width: 16px; height: 16px;
    background: #3b82f6;
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
    animation: userPulse 2s ease-in-out infinite;
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
  tooltipAnchor: [8, -8],
});

function haversineMeters(
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

const DICIS_LAT = 20.549879054215197;
const DICIS_LNG = -101.2008414859346;

export default function UserLocationMarker() {
  const { userLocation, setUserLocation } = useMapData();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) =>
        setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  if (!userLocation) return null;

  const distToDicis = haversineMeters(
    userLocation[0],
    userLocation[1],
    DICIS_LAT,
    DICIS_LNG,
  );
  const nearDicis = distToDicis < 500;
  const distLabel =
    distToDicis < 1000
      ? `${Math.round(distToDicis)} m de DICIS`
      : `${(distToDicis / 1000).toFixed(1)} km de DICIS`;

  return (
    <Marker position={userLocation} icon={userIcon} zIndexOffset={2000}>
      <Tooltip
        direction="top"
        offset={[0, -8]}
        opacity={1}
        className="shadcn-tooltip"
      >
        <div className="relative bg-zinc-950 text-white border border-zinc-800 px-4 py-2.5 text-xs shadow-2xl flex flex-col items-center gap-1">
          <span className="font-bold text-[13px] leading-tight flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            Tu ubicación
          </span>
          <span className="text-[10px] text-zinc-400 font-medium whitespace-nowrap">
            {nearDicis ? "Cerca de DICIS" : distLabel}
          </span>
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-zinc-950 border-b border-r border-zinc-800 rotate-45 z-[-1]" />
        </div>
      </Tooltip>
    </Marker>
  );
}
