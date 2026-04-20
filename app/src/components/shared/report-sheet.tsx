"use client";

import { Button } from "@components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@components/ui/dialog";
import { Input } from "@components/ui/input";
import { supabase } from "@lib/supabase/client";
import { getTodaysSchedules } from "@lib/schedule-utils";
import { useAuth } from "@providers/auth-provider";
import { useMapData } from "@providers/map-provider";
import {
  AlertTriangle,
  ChevronLeft,
  Flag,
  Loader2,
  Star,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

type ReportType = "did_not_pass" | "full_bus" | "early" | "delay";

const reportTypes: { value: ReportType; label: string; description: string }[] =
  [
    {
      value: "did_not_pass",
      label: "No pasó el camión",
      description: "El camión no llegó a la parada",
    },
    {
      value: "full_bus",
      label: "Venía lleno",
      description: "El camión no tenía espacio",
    },
    {
      value: "early",
      label: "Se adelantó",
      description: "El camión pasó antes del horario",
    },
    {
      value: "delay",
      label: "Se tardó",
      description: "El camión llegó tarde",
    },
  ];

interface ReportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReportSheet({ open, onOpenChange }: ReportSheetProps) {
  const { userType, credibilityScore, userData } = useAuth();
  const { routes } = useMapData();

  const [step, setStep] = useState(1);
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedStopId, setSelectedStopId] = useState("");
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [delayMins, setDelayMins] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const todayRoutes = routes.filter(
    (r) => r.isActive && getTodaysSchedules(r).length > 0,
  );
  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const namedStops =
    selectedRoute?.points.filter((p) => p.point_role !== "waypoint") ?? [];

  function resetAndClose() {
    setStep(1);
    setSelectedRouteId("");
    setSelectedStopId("");
    setSelectedType(null);
    setDelayMins("");
    onOpenChange(false);
  }

  async function handleSubmit() {
    if (!selectedRouteId || !selectedType || !userData) return;
    setIsSubmitting(true);

    const payload: Record<string, unknown> = {
      user_id: userData.id,
      route_id: selectedRouteId,
      report_type: selectedType,
    };

    if (selectedStopId) payload.stop_id = selectedStopId;
    if (selectedType === "delay" && delayMins)
      payload.delay_mins = Number(delayMins);

    const { error } = await supabase.from("reports").insert(payload);

    setIsSubmitting(false);

    if (error) {
      toast.error("Error al enviar reporte. Intenta de nuevo.");
      return;
    }

    toast.success("Reporte enviado. Gracias por contribuir.");
    resetAndClose();
  }

  const lowCredibility = credibilityScore !== null && credibilityScore <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-zinc-400 hover:text-white transition-colors shrink-0"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <DialogTitle className="text-white text-base font-semibold flex items-center gap-2 flex-1">
              <Flag size={16} className="text-red-400" />
              Enviar reporte
            </DialogTitle>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-zinc-600">
                Paso {step} de 4
              </span>
              <DialogClose
                render={
                  <button className="text-zinc-400 hover:text-white transition-colors" />
                }
                onClick={resetAndClose}
              >
                <X size={16} />
              </DialogClose>
            </div>
          </div>

          {credibilityScore !== null && (
            <div className="flex items-center gap-1.5 mt-2">
              <Star size={11} className="text-yellow-400" />
              <span className="text-[11px] text-zinc-500">
                Credibilidad:{" "}
                <span className="text-zinc-300 font-medium">
                  {credibilityScore}/100
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          {userType !== "student" ? (
            <div className="p-5 flex flex-col items-center gap-3 py-12 text-center">
              <AlertTriangle className="text-yellow-400" size={32} />
              <p className="text-sm text-zinc-300 font-medium">
                Solo estudiantes pueden enviar reportes
              </p>
            </div>
          ) : lowCredibility ? (
            <div className="p-5 flex flex-col items-center gap-3 py-12 text-center">
              <AlertTriangle className="text-red-400" size={32} />
              <p className="text-sm text-zinc-300 font-medium">
                Tu credibilidad es baja
              </p>
              <p className="text-xs text-zinc-500">
                No puedes enviar reportes hasta que se restaure tu credibilidad
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 flex flex-col gap-3"
                >
                  <p className="text-xs text-zinc-500 mb-1">
                    ¿En qué ruta ocurrió?
                  </p>
                  {todayRoutes.length === 0 ? (
                    <p className="text-sm text-zinc-400">
                      Sin rutas activas hoy
                    </p>
                  ) : (
                    todayRoutes.map((route) => (
                      <button
                        key={route.id}
                        onClick={() => {
                          setSelectedRouteId(route.id);
                          setStep(2);
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                          selectedRouteId === route.id
                            ? "border-white/40 bg-white/10 text-white"
                            : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                        }`}
                      >
                        <span className="text-sm font-medium">{route.name}</span>
                      </button>
                    ))
                  )}
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 flex flex-col gap-3"
                >
                  <p className="text-xs text-zinc-500 mb-1">
                    ¿En qué parada? (opcional)
                  </p>
                  <button
                    onClick={() => {
                      setSelectedStopId("");
                      setStep(3);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-900 transition-all"
                  >
                    <span className="text-sm">Omitir parada</span>
                  </button>
                  {namedStops.map((stop) => (
                    <button
                      key={stop.stop_id}
                      onClick={() => {
                        setSelectedStopId(stop.stop_id);
                        setStep(3);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        selectedStopId === stop.stop_id
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {stop.stop_name}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 flex flex-col gap-3"
                >
                  <p className="text-xs text-zinc-500 mb-1">¿Qué ocurrió?</p>
                  {reportTypes.map((rt) => (
                    <button
                      key={rt.value}
                      onClick={() => {
                        setSelectedType(rt.value);
                        setStep(4);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${
                        selectedType === rt.value
                          ? "border-white/40 bg-white/10 text-white"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      }`}
                    >
                      <span className="text-sm font-medium block">
                        {rt.label}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {rt.description}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-5 flex flex-col gap-4"
                >
                  <p className="text-xs text-zinc-500">Confirmar reporte</p>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 flex flex-col gap-2">
                    <Row
                      label="Ruta"
                      value={
                        routes.find((r) => r.id === selectedRouteId)?.name ??
                        "—"
                      }
                    />
                    {selectedStopId && (
                      <Row
                        label="Parada"
                        value={
                          namedStops.find((s) => s.stop_id === selectedStopId)
                            ?.stop_name ?? "—"
                        }
                      />
                    )}
                    <Row
                      label="Tipo"
                      value={
                        reportTypes.find((r) => r.value === selectedType)
                          ?.label ?? "—"
                      }
                    />
                  </div>

                  {selectedType === "delay" && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-zinc-500">
                        ¿Cuántos minutos de retraso?
                      </label>
                      <Input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="ej. 15"
                        value={delayMins}
                        onChange={(e) => setDelayMins(e.target.value)}
                        className="bg-zinc-900 border-zinc-800 text-white"
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSubmit}
                    disabled={
                      isSubmitting ||
                      (selectedType === "delay" && !delayMins)
                    }
                    className="w-full bg-white text-black hover:bg-zinc-200 font-semibold"
                  >
                    {isSubmitting ? (
                      <Loader2 size={16} className="animate-spin mr-2" />
                    ) : null}
                    Enviar reporte
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="text-xs text-zinc-200 font-medium">{value}</span>
    </div>
  );
}
