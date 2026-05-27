import { MapMarker, MarkerContent, MarkerTooltip } from "@components/ui/map";
import { DICIS_COORDS } from "@lib/constants";
import { haversineMeters } from "@lib/schedule-utils";
import { useMapData } from "@providers/map-provider";
import { useEffect } from "react";

export default function UserLocationMarker() {
  const { userLocation, setUserLocation } = useMapData();

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) =>
        setUserLocation([position.coords.latitude, position.coords.longitude]),
      (error) => console.warn("Geolocation error:", error.code, error.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [setUserLocation]);

  if (!userLocation) return null;

  const distToDicis = haversineMeters(
    userLocation[0],
    userLocation[1],
    DICIS_COORDS.lat,
    DICIS_COORDS.lng,
  );
  const nearDicis = distToDicis < 500;
  const distLabel =
    distToDicis < 1000
      ? `${Math.round(distToDicis)} m de DICIS`
      : `${(distToDicis / 1000).toFixed(1)} km de DICIS`;

  return (
    <MapMarker longitude={userLocation[1]} latitude={userLocation[0]}>
      <MarkerContent>
        <div className="size-4 rounded-full border-[3px] border-white bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.3)] animate-[userPulse_2s_ease-in-out_infinite]" />
      </MarkerContent>
      <MarkerTooltip className="border border-zinc-800 bg-zinc-950 px-0 py-0 text-white shadow-2xl">
        <div className="relative flex flex-col items-center gap-1 px-4 py-2.5 text-xs">
          <span className="flex items-center gap-1.5 text-[13px] leading-tight font-bold">
            <span className="size-2 shrink-0 rounded-full bg-blue-500" />
            Tu ubicación
          </span>
          <span className="whitespace-nowrap text-[10px] font-medium text-zinc-400">
            {nearDicis ? "Cerca de DICIS" : distLabel}
          </span>
        </div>
      </MarkerTooltip>
    </MapMarker>
  );
}
