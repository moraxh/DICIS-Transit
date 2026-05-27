"use client";

import { RouteEditorSheet } from "@components/admin/route-editor/route-editor-sheet";
import { StatusBadge } from "@components/admin/status-badge";
import { Button } from "@components/ui/button";
import { useActiveRoutes } from "@hooks/admin/use-active-routes";
import { useRouteOverrides } from "@hooks/admin/use-route-overrides";
import type { RouteOverride } from "@hooks/admin/use-route-overrides";
import { useRoutePoints } from "@hooks/admin/use-route-points";
import type { RouteData } from "@providers/map-provider";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Map, Route } from "lucide-react";
import { useCallback, useState } from "react";

function RouteEditorLauncher({
  routeId,
  routeName,
  existingOverride,
  onClose,
}: {
  routeId: string;
  routeName: string;
  existingOverride: RouteOverride | null;
  onClose: () => void;
}) {
  const { data: points = [], isLoading } = useRoutePoints(routeId);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
        <Loader2 className="size-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  const routeData: RouteData = {
    id: routeId,
    name: routeName,
    isActive: true,
    direction: "to_dicis",
    scheduleType: "weekday",
    points: points as RouteData["points"],
    schedules: [],
  };

  return (
    <RouteEditorSheet
      route={routeData}
      existingOverride={existingOverride}
      onClose={onClose}
    />
  );
}

const routeRowVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

export default function AdminModificationsPage() {
  const [editorRoute, setEditorRoute] = useState<{ id: string; name: string } | null>(null);

  const { data: routes = [] } = useActiveRoutes();
  const { data: overrides = [] } = useRouteOverrides();

  const getActiveOverride = useCallback(
    (routeId: string): RouteOverride | null => {
      const now = new Date();
      return (
        overrides.find(
          (o) =>
            o.route_id === routeId &&
            o.status === "active" &&
            new Date(o.valid_from) <= now &&
            (!o.valid_to || new Date(o.valid_to) > now),
        ) ?? null
      );
    },
    [overrides],
  );

  const deviatedCount = routes.filter((r) => getActiveOverride(r.id) !== null).length;

  return (
    <>
      {editorRoute && (
        <RouteEditorLauncher
          routeId={editorRoute.id}
          routeName={editorRoute.name}
          existingOverride={getActiveOverride(editorRoute.id)}
          onClose={() => setEditorRoute(null)}
        />
      )}

      <motion.div
        className="p-6 flex flex-col gap-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">
              Modificaciones de Ruta
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {deviatedCount > 0 ? (
                <span className="text-yellow-600">
                  {deviatedCount} ruta{deviatedCount > 1 ? "s" : ""} desviada{deviatedCount > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-zinc-600">Sin desvíos activos</span>
              )}
            </p>
          </div>
        </div>

        {/* Route map editor section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
              Editor de rutas en mapa
            </p>
          </div>

          {routes.length === 0 ? (
            <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/20 py-8 flex flex-col items-center gap-2">
              <Route size={18} className="text-zinc-700" />
              <p className="text-xs text-zinc-600">Sin rutas activas</p>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800/60 overflow-hidden bg-zinc-900/20">
              <AnimatePresence>
                {routes.map((route, i) => {
                  const override = getActiveOverride(route.id);
                  return (
                    <motion.div
                      key={route.id}
                      variants={routeRowVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ duration: 0.25, delay: i * 0.04 }}
                      className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/40 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${override ? "bg-yellow-500" : "bg-zinc-700"}`} />
                        <span className="truncate text-sm font-medium text-zinc-200">
                          {route.name}
                        </span>
                        {override && (
                          <StatusBadge variant="warning">Desviada</StatusBadge>
                        )}
                      </div>
                      <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-zinc-800 text-xs text-zinc-400 hover:border-zinc-600 hover:text-white hover:bg-white/5 shrink-0 transition-all"
                          onClick={() => setEditorRoute({ id: route.id, name: route.name })}
                        >
                          <Map className="size-3" />
                          {override ? "Editar desvío" : "Editar en mapa"}
                        </Button>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
