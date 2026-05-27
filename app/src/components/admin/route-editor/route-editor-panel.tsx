"use client";

import { Button } from "@components/ui/button";
import type { OverridePoint } from "@hooks/admin/use-route-overrides";
import { cn } from "@lib/utils";
import {
  ArrowDown,
  ArrowUp,
  Diamond,
  MapPin,
  Trash2,
  WaypointsIcon,
} from "lucide-react";
import type { EditorMode } from "./route-editor-map";

interface RouteEditorPanelProps {
  points: OverridePoint[];
  mode: EditorMode;
  onToggleActive: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemovePoint: (index: number) => void;
  onSetMode: (mode: EditorMode) => void;
}

function PointIcon({ point }: { point: OverridePoint }) {
  const dimmed = !point.active ? "opacity-30" : "";
  const base = "size-4 shrink-0";

  if (point.point_role === "waypoint") {
    return (
      <Diamond
        className={cn(base, dimmed, "text-blue-400")}
        strokeWidth={1.5}
      />
    );
  }
  // Temp stop: amber
  if (point.stop_id === null && point.point_role === "stop") {
    return (
      <MapPin className={cn(base, dimmed, "text-amber-400")} strokeWidth={2} />
    );
  }
  return (
    <MapPin
      className={cn(
        base,
        dimmed,
        point.point_role === "start"
          ? "text-white"
          : point.point_role === "end"
            ? "text-zinc-400"
            : "text-zinc-300",
      )}
      strokeWidth={2}
    />
  );
}

function RoleBadge({ point }: { point: OverridePoint }) {
  if (point.point_role === "start")
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        Inicio
      </span>
    );
  if (point.point_role === "end")
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
        Fin
      </span>
    );
  if (point.point_role === "waypoint")
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest text-blue-500">
        Auxiliar
      </span>
    );
  if (point.stop_id === null)
    return (
      <span className="text-[9px] font-bold uppercase tracking-widest text-amber-500">
        Temporal
      </span>
    );
  return null;
}

export function RouteEditorPanel({
  points,
  mode,
  onToggleActive,
  onMoveUp,
  onMoveDown,
  onRemovePoint,
  onSetMode,
}: RouteEditorPanelProps) {
  return (
    <div className="flex h-full flex-col">
      {/* Legend */}
      <div className="border-b border-zinc-800 px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Leyenda
        </p>
        <div className="flex flex-wrap gap-3 text-[10px] text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-white" /> Activa
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-zinc-600" /> Suspendida
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-400" /> Temporal
          </span>
          <span className="flex items-center gap-1">
            <Diamond className="size-2.5 text-blue-400" strokeWidth={1.5} />{" "}
            Auxiliar (invisible)
          </span>
        </div>
      </div>

      {/* Points list */}
      <div className="flex-1 overflow-y-auto py-2">
        {points.map((point, index) => {
          const isWaypoint = point.point_role === "waypoint";
          const isStart = point.point_role === "start";
          const isEnd = point.point_role === "end";
          const isOriginal = point.stop_id !== null;
          const isTempStop = point.stop_id === null && !isWaypoint;
          const isTempWaypoint = isWaypoint && !isOriginal;
          const canReorder = !isStart && !isEnd;
          const canRemove = isTempWaypoint || isTempStop;
          const canToggle = !isStart && !isEnd && isOriginal;

          return (
            <div
              key={`${point.stop_id ?? "new"}-${index}`}
              className={cn(
                "group flex items-center gap-2.5 px-4 py-2.5 transition-colors",
                point.active ? "hover:bg-white/[0.03]" : "opacity-50",
              )}
            >
              <PointIcon point={point} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "truncate text-[13px] font-medium leading-tight",
                      point.active
                        ? isTempStop
                          ? "text-amber-200"
                          : "text-zinc-100"
                        : "text-zinc-500 line-through",
                    )}
                  >
                    {point.stop_name}
                  </span>
                  <RoleBadge point={point} />
                </div>
                {!point.active && isOriginal && (
                  <span className="text-[10px] font-medium text-yellow-600">
                    Temporalmente suspendida
                  </span>
                )}
                {isTempStop && (
                  <span className="text-[10px] text-amber-600">
                    Arrastrable en el mapa
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                {canReorder && (
                  <>
                    <button
                      type="button"
                      onClick={() => onMoveUp(index)}
                      disabled={index <= 1}
                      className="rounded p-1 text-zinc-600 hover:bg-white/10 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDown(index)}
                      disabled={index >= points.length - 2}
                      className="rounded p-1 text-zinc-600 hover:bg-white/10 hover:text-zinc-300 disabled:pointer-events-none disabled:opacity-20"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  </>
                )}

                {canRemove ? (
                  <button
                    type="button"
                    onClick={() => onRemovePoint(index)}
                    className="rounded p-1 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 className="size-3" />
                  </button>
                ) : canToggle ? (
                  <button
                    type="button"
                    onClick={() => onToggleActive(index)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      point.active
                        ? "text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                        : "text-emerald-500 hover:bg-emerald-500/10",
                    )}
                  >
                    {point.active ? "Suspender" : "Activar"}
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add buttons */}
      <div className="flex flex-col gap-2 border-t border-zinc-800 p-4">
        <Button
          type="button"
          onClick={() => onSetMode(mode === "stop" ? "idle" : "stop")}
          variant="outline"
          size="sm"
          className={cn(
            "w-full gap-2 text-xs",
            mode === "stop"
              ? "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
          )}
        >
          <MapPin className="size-3.5" />
          {mode === "stop" ? "Cancelar" : "Agregar parada temporal"}
        </Button>

        <Button
          type="button"
          onClick={() => onSetMode(mode === "waypoint" ? "idle" : "waypoint")}
          variant="outline"
          size="sm"
          className={cn(
            "w-full gap-2 text-xs",
            mode === "waypoint"
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
              : "border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300",
          )}
        >
          <WaypointsIcon className="size-3.5" />
          {mode === "waypoint" ? "Cancelar" : "Agregar waypoint auxiliar"}
        </Button>
      </div>
    </div>
  );
}
