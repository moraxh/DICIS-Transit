"use client";

import { Progress } from "@components/ui/progress";
import { BADGES, type BadgeKey } from "@lib/badges";
import { REPORT_TYPE_LABEL } from "@lib/constants";
import { supabase } from "@lib/supabase/client";
import { useAuth } from "@providers/auth-provider";
import { useMapData } from "@providers/map-provider";
import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Flag, Loader2, ShieldCheck, User } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface Report {
  id: string;
  route_id: string | null;
  stop_id: string | null;
  report_type: string;
  delay_mins: number | null;
  created_at: string;
  status: string;
}

export default function ProfileTab() {
  const { userData, credibilityScore, visitorId } = useAuth();
  const { routes } = useMapData();
  const [reports, setReports] = useState<Report[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<BadgeKey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData?.id) {
      setLoading(false);
      return;
    }

    Promise.all([
      supabase
        .from("reports")
        .select("id,route_id,stop_id,report_type,delay_mins,created_at,status")
        .eq("user_id", userData.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("user_badges")
        .select("badge_key")
        .eq("user_id", userData.id),
    ]).then(([reportsRes, badgesRes]) => {
      if (reportsRes.data) setReports(reportsRes.data as Report[]);
      if (badgesRes.data)
        setEarnedBadges(badgesRes.data.map((b) => b.badge_key as BadgeKey));
      setLoading(false);
    });
  }, [userData?.id]);

  const score = credibilityScore ?? 100;
  const scoreLabel =
    score >= 100 ? "Excelente" : score >= 70 ? "Bueno" : "En riesgo";
  const scoreColor =
    score >= 100
      ? "text-emerald-400"
      : score >= 70
        ? "text-amber-400"
        : "text-red-400";

  const shortId = visitorId ? visitorId.slice(0, 8).toUpperCase() : "—";

  function getRouteName(routeId: string | null) {
    if (!routeId) return null;
    return routes.find((r) => r.id === routeId)?.name ?? null;
  }

  function getStopName(routeId: string | null, stopId: string | null) {
    if (!routeId || !stopId) return null;
    const route = routes.find((r) => r.id === routeId);
    return route?.points.find((p) => p.stop_id === stopId)?.stop_name ?? null;
  }

  function statusColor(status: string) {
    if (status === "verified") return "text-emerald-400 bg-emerald-500/10";
    if (status === "rejected" || status === "spam")
      return "text-red-400 bg-red-500/10";
    return "text-zinc-400 bg-zinc-800";
  }

  function statusLabel(status: string) {
    if (status === "verified") return "Verificado";
    if (status === "rejected") return "Rechazado";
    if (status === "spam") return "Spam";
    return "Pendiente";
  }

  return (
    <div className="p-5 flex flex-col gap-5">
      {/* User header */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
      >
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center shrink-0">
          <User size={18} className="text-zinc-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">ID {shortId}</p>
          <p className="text-xs text-zinc-500">
            {userData ? "Sesión activa" : "Visitante"}
          </p>
        </div>
        <ShieldCheck size={16} className="text-zinc-600 shrink-0" />
      </motion.section>

      {/* Credibility score */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Credibilidad
        </h3>
        <div className="px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className={clsx("text-2xl font-bold", scoreColor)}>
              {score}
            </span>
            <span
              className={clsx(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                score >= 100
                  ? "text-emerald-400 bg-emerald-500/10"
                  : score >= 70
                    ? "text-amber-400 bg-amber-500/10"
                    : "text-red-400 bg-red-500/10",
              )}
            >
              {scoreLabel}
            </span>
          </div>
          <Progress
            value={Math.min(score, 100)}
            className="h-1.5 bg-zinc-800"
          />
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Reportes falsos o spam restan puntos. Con score 0 no puedes
            reportar.
          </p>
        </div>
      </motion.section>

      {/* Badges */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
      >
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Logros
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(BADGES) as BadgeKey[]).map((key) => {
            const badge = BADGES[key];
            const earned = earnedBadges.includes(key);
            return (
              <div
                key={key}
                title={badge.description}
                className={clsx(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-colors",
                  earned
                    ? "border-amber-500/30 bg-amber-500/8"
                    : "border-zinc-800 bg-zinc-900/30 opacity-40 grayscale",
                )}
              >
                <span className="text-xl">{badge.emoji}</span>
                <p className="text-[10px] font-semibold text-white leading-tight">
                  {badge.label}
                </p>
              </div>
            );
          })}
        </div>
      </motion.section>

      {/* Report history */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Mis reportes
          {reports.length > 0 && (
            <span className="ml-2 normal-case text-zinc-600">
              · {reports.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-zinc-600" />
          </div>
        ) : reports.length === 0 ? (
          <div className="px-4 py-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center">
            <Flag size={20} className="text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">Aún no has enviado reportes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {reports.map((r, i) => {
              const routeName = getRouteName(r.route_id);
              const stopName = getStopName(r.route_id, r.stop_id);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40"
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                    <Flag size={13} className="text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {REPORT_TYPE_LABEL[r.report_type] ?? r.report_type}
                    </p>
                    {(routeName || stopName) && (
                      <p className="text-xs text-zinc-500 truncate">
                        {routeName}
                        {stopName ? ` · ${stopName}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className="text-zinc-600 shrink-0" />
                      <span className="text-[10px] text-zinc-600">
                        {formatDistanceToNow(new Date(r.created_at), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                      <span
                        className={clsx(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          statusColor(r.status),
                        )}
                      >
                        {statusLabel(r.status)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.section>
    </div>
  );
}
