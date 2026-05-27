"use client";

import { DatePicker } from "@components/admin/date-picker";
import { RouteEditorMap } from "@components/admin/route-editor/route-editor-map";
import type { EditorMode } from "@components/admin/route-editor/route-editor-map";
import { RouteEditorPanel } from "@components/admin/route-editor/route-editor-panel";
import { Button } from "@components/ui/button";
import { Label } from "@components/ui/label";
import type { OverridePoint, RouteOverride } from "@hooks/admin/use-route-overrides";
import {
  useRestoreRoute,
  useSaveRouteOverride,
} from "@hooks/admin/use-route-overrides";
import { useDirectionsPreview } from "@hooks/use-directions-preview";
import { useAuth } from "@providers/auth-provider";
import type { RouteData } from "@providers/map-provider";
import { AlertTriangle, ArrowLeft, Loader2, RotateCcw, Save, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface RouteEditorSheetProps {
  route: RouteData;
  existingOverride: RouteOverride | null;
  onClose: () => void;
}

function routePointsToOverridePoints(route: RouteData): OverridePoint[] {
  return route.points.map((pt) => ({
    stop_id: pt.stop_id,
    point_role: pt.point_role,
    stop_order: pt.stop_order,
    stop_name: pt.stop_name,
    latitude: pt.latitude,
    longitude: pt.longitude,
    active: true,
    time_from_previous_mins: pt.time_from_previous_mins,
    cumulative_minutes: pt.cumulative_minutes,
  }));
}

function insertPoint(
  prev: OverridePoint[],
  newPoint: OverridePoint,
  insertAfterIndex: number,
): OverridePoint[] {
  const insertAt = Math.min(insertAfterIndex + 1, prev.length - 1);
  const next = [...prev.slice(0, insertAt), newPoint, ...prev.slice(insertAt)];
  return next.map((p, i) => ({ ...p, stop_order: i }));
}

// Inline modal for naming a new temp stop
function StopNameModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) onConfirm(trimmed);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-80 rounded-xl border border-zinc-700 bg-zinc-900 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Nombre de la parada temporal</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded p-1 text-zinc-500 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Desviación por obra"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30"
            maxLength={60}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="flex-1 text-xs text-zinc-500"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!name.trim()}
              className="flex-1 bg-amber-400 text-xs font-medium text-zinc-900 hover:bg-amber-300 disabled:opacity-40"
            >
              Agregar parada
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RouteEditorSheet({
  route,
  existingOverride,
  onClose,
}: RouteEditorSheetProps) {
  const { userData } = useAuth();
  const saveOverride = useSaveRouteOverride();
  const restoreRoute = useRestoreRoute();

  const initialPoints: OverridePoint[] = existingOverride
    ? (existingOverride.points as OverridePoint[])
    : routePointsToOverridePoints(route);

  const [points, setPoints] = useState<OverridePoint[]>(initialPoints);
  const [mode, setMode] = useState<EditorMode>("idle");
  const [pendingStop, setPendingStop] = useState<{
    lat: number;
    lng: number;
    insertAfterIndex: number;
  } | null>(null);
  const [validFrom, setValidFrom] = useState<Date>(() => {
    if (existingOverride) return new Date(existingOverride.valid_from);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [validTo, setValidTo] = useState<Date | undefined>(
    existingOverride?.valid_to ? new Date(existingOverride.valid_to) : undefined,
  );

  const { path: previewPath, status: previewStatus } = useDirectionsPreview(points);

  const activeCount = points.filter(
    (p) => p.active && p.point_role !== "waypoint",
  ).length;
  const canSave =
    previewStatus !== "invalid" &&
    previewStatus !== "error" &&
    activeCount >= 2;

  const handleToggleActive = useCallback((index: number) => {
    setPoints((prev) =>
      prev.map((p, i) =>
        i === index && p.point_role !== "start" && p.point_role !== "end"
          ? { ...p, active: !p.active }
          : p,
      ),
    );
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    setPoints((prev) => {
      if (index <= 1) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next.map((p, i) => ({ ...p, stop_order: i }));
    });
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setPoints((prev) => {
      if (index >= prev.length - 2) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next.map((p, i) => ({ ...p, stop_order: i }));
    });
  }, []);

  const handleRemovePoint = useCallback((index: number) => {
    setPoints((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((p, i) => ({ ...p, stop_order: i })),
    );
  }, []);

  const handleDragEnd = useCallback(
    (index: number, lat: number, lng: number) => {
      setPoints((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, latitude: lat, longitude: lng } : p,
        ),
      );
    },
    [],
  );

  // Single handler for both waypoint and stop clicks on map
  const handleMapClick = useCallback(
    (lat: number, lng: number, insertAfterIndex: number) => {
      if (mode === "waypoint") {
        setMode("idle");
        setPoints((prev) =>
          insertPoint(
            prev,
            {
              stop_id: null,
              point_role: "waypoint",
              stop_order: 0,
              stop_name: "Waypoint auxiliar",
              latitude: lat,
              longitude: lng,
              active: true,
              time_from_previous_mins: 0,
              cumulative_minutes: 0,
            },
            insertAfterIndex,
          ),
        );
      } else if (mode === "stop") {
        // Ask for name before inserting
        setPendingStop({ lat, lng, insertAfterIndex });
      }
    },
    [mode],
  );

  const handleConfirmStopName = useCallback(
    (name: string) => {
      if (!pendingStop) return;
      const { lat, lng, insertAfterIndex } = pendingStop;
      setPendingStop(null);
      setMode("idle");
      setPoints((prev) =>
        insertPoint(
          prev,
          {
            stop_id: null,
            point_role: "stop",
            stop_order: 0,
            stop_name: name,
            latitude: lat,
            longitude: lng,
            active: true,
            time_from_previous_mins: 0,
            cumulative_minutes: 0,
          },
          insertAfterIndex,
        ),
      );
    },
    [pendingStop],
  );

  const handleSave = useCallback(() => {
    if (!canSave) return;
    const cachedGeometry = previewPath.length >= 2 ? previewPath : null;
    saveOverride.mutate(
      {
        existingId: existingOverride?.id ?? null,
        payload: {
          route_id: route.id,
          points,
          cached_geometry: cachedGeometry,
          valid_from: validFrom,
          valid_to: validTo ?? null,
          admin_id: userData?.id ?? null,
        },
      },
      { onSuccess: onClose },
    );
  }, [
    canSave,
    previewPath,
    saveOverride,
    existingOverride,
    route.id,
    points,
    validFrom,
    validTo,
    userData,
    onClose,
  ]);

  const handleRestore = useCallback(() => {
    if (!existingOverride) return;
    restoreRoute.mutate(existingOverride.id, { onSuccess: onClose });
  }, [existingOverride, restoreRoute, onClose]);

  // Escape exits current mode
  useEffect(() => {
    if (mode === "idle") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode("idle");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950">
      {/* Name modal for temp stops */}
      {pendingStop && (
        <StopNameModal
          onConfirm={handleConfirmStopName}
          onCancel={() => {
            setPendingStop(null);
            setMode("idle");
          }}
        />
      )}

      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-zinc-800 px-5 py-3.5">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-white">Editor de ruta temporal</h2>
          <p className="truncate text-xs text-zinc-500">{route.name}</p>
        </div>

        {/* Validity range */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <Label className="text-[10px] font-medium text-zinc-600">Desde</Label>
            <DatePicker
              value={validFrom}
              onChange={(d) => d && setValidFrom(d)}
              className="h-8 w-36 text-xs"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <Label className="text-[10px] font-medium text-zinc-600">Hasta (opcional)</Label>
            <DatePicker
              value={validTo}
              onChange={setValidTo}
              placeholder="Sin límite"
              fromDate={validFrom}
              className="h-8 w-36 text-xs"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {existingOverride && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRestore}
              disabled={restoreRoute.isPending}
              className="gap-1.5 text-xs text-zinc-500 hover:text-white"
            >
              {restoreRoute.isPending ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RotateCcw className="size-3" />
              )}
              Restaurar original
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-zinc-500 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave || saveOverride.isPending}
            className="gap-1.5 bg-white text-xs font-medium text-black hover:bg-zinc-200 disabled:opacity-40"
          >
            {saveOverride.isPending ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Save className="size-3" />
            )}
            Guardar cambio
          </Button>
        </div>
      </div>

      {/* Validation warning */}
      {!canSave && previewStatus !== "idle" && previewStatus !== "loading" && (
        <div className="flex shrink-0 items-center gap-2 border-b border-red-900/50 bg-red-950/40 px-5 py-2 text-xs text-red-400">
          <AlertTriangle className="size-3.5 shrink-0" />
          {activeCount < 2
            ? "Activa al menos 2 paradas para poder guardar el cambio."
            : "La ruta calculada no es válida. Ajusta las paradas o waypoints."}
        </div>
      )}

      {/* Body: map + panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <RouteEditorMap
            points={points}
            mode={mode}
            onDragEnd={handleDragEnd}
            onMapClick={handleMapClick}
          />
        </div>
        <div className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950">
          <RouteEditorPanel
            points={points}
            mode={mode}
            onToggleActive={handleToggleActive}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onRemovePoint={handleRemovePoint}
            onSetMode={setMode}
          />
        </div>
      </div>
    </div>
  );
}
