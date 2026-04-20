"use client";

import { useMapData } from "@providers/map-provider";
import { supabase } from "@lib/supabase/client";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Flag,
  Info,
  Megaphone,
  Radio,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const reportTypeLabel: Record<string, string> = {
  did_not_pass: "No pasó el camión",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: "urgent" | "high" | "medium" | "low";
  created_at: string;
  expires_at: string | null;
}

interface RouteModification {
  id: string;
  route_id: string;
  description: string;
  status: "active" | "resolved";
  valid_from: string;
  valid_to: string | null;
}

const priorityConfig = {
  urgent: {
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    icon: AlertCircle,
    label: "Urgente",
  },
  high: {
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    icon: AlertTriangle,
    label: "Alto",
  },
  medium: {
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    icon: Bell,
    label: "Medio",
  },
  low: {
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Info,
    label: "Bajo",
  },
};

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

export default function AlertsTab() {
  const { reportCounts } = useMapData();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [modifications, setModifications] = useState<RouteModification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [noticesRes, modsRes] = await Promise.all([
        supabase
          .from("notices")
          .select("*")
          .or("expires_at.is.null,expires_at.gt.now()"),
        supabase
          .from("route_modifications")
          .select("*")
          .eq("status", "active")
          .order("created_at", { ascending: false }),
      ]);

      if (noticesRes.data) {
        const sorted = [...noticesRes.data].sort(
          (a, b) =>
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder],
        );
        setNotices(sorted);
      }

      if (modsRes.data) setModifications(modsRes.data);
      setIsLoading(false);
    }

    load();
  }, []);

  if (isLoading) {
    return (
      <div className="p-5 flex flex-col gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const isEmpty = notices.length === 0 && modifications.length === 0 && reportCounts.length === 0;

  return (
    <div className="p-5 flex flex-col gap-5">
      {isEmpty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 gap-3 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Radio className="text-emerald-400" size={22} />
          </div>
          <p className="text-sm font-medium text-white/80">Sin avisos activos</p>
          <p className="text-xs text-zinc-500">El servicio opera con normalidad</p>
        </motion.div>
      )}

      {notices.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Avisos Generales
          </h3>
          <AnimatePresence>
            <div className="flex flex-col gap-2.5">
              {notices.map((notice, i) => {
                const cfg = priorityConfig[notice.priority];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={notice.id}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-xl border p-4 ${cfg.bg}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`shrink-0 mt-0.5 ${cfg.color}`}
                        size={16}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-white leading-tight">
                            {notice.title}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/20 ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {notice.content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </section>
      )}

      {modifications.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Modificaciones de Ruta
          </h3>
          <div className="flex flex-col gap-2.5">
            {modifications.map((mod, i) => (
              <motion.div
                key={mod.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-4"
              >
                <div className="flex items-start gap-3">
                  <Megaphone
                    className="shrink-0 mt-0.5 text-orange-400"
                    size={16}
                  />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {mod.description}
                    </p>
                    {mod.valid_to && (
                      <p className="text-[10px] text-zinc-500 mt-1.5">
                        Válido hasta{" "}
                        {new Date(mod.valid_to).toLocaleDateString("es-MX")}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {reportCounts.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Reportes de Estudiantes · Hoy
          </h3>
          <div className="flex flex-col gap-2.5">
            {reportCounts.map((rc, i) => (
              <motion.div
                key={`${rc.route_id}-${rc.stop_id}-${rc.report_type}`}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-red-500/20 bg-red-500/8 p-4"
              >
                <div className="flex items-start gap-3">
                  <Flag className="shrink-0 mt-0.5 text-red-400" size={15} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white leading-tight">
                        {reportTypeLabel[rc.report_type] ?? rc.report_type}
                      </span>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                        {rc.report_count}×
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400">
                      {rc.route_name}
                      {rc.stop_name ? ` · ${rc.stop_name}` : ""}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
