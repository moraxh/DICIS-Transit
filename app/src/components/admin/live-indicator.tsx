"use client";

import { cn } from "@lib/utils";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

interface LiveIndicatorProps {
  isLive: boolean;
  lastUpdated?: Date;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  className?: string;
}

export function LiveIndicator({
  isLive,
  lastUpdated,
  onRefresh,
  isRefreshing,
  className,
}: LiveIndicatorProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {lastUpdated && (
        <span className="text-xs text-zinc-600">
          Actualizado{" "}
          {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: es })}
        </span>
      )}

      <div
        className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          isLive ? "text-emerald-400" : "text-zinc-600",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            isLive ? "bg-emerald-400 animate-pulse" : "bg-zinc-600",
          )}
        />
        {isLive ? "Live" : "Desconectado"}
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="text-zinc-600 hover:text-zinc-300 transition-colors disabled:opacity-40"
          title="Actualizar datos"
        >
          <RefreshCw
            size={13}
            className={cn(isRefreshing && "animate-spin")}
          />
        </button>
      )}
    </div>
  );
}
