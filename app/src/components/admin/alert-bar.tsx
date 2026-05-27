"use client";

import type { AlertItem } from "@hooks/admin/use-dashboard-data";
import { cn } from "@lib/utils";
import { AlertTriangle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface AlertBarProps {
  alerts: AlertItem[];
}

export function AlertBar({ alerts }: AlertBarProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  const hasCritical = visible.some((a) => a.severity === "critical");

  return (
    <div
      className={cn(
        "border-b px-6",
        hasCritical
          ? "bg-red-500/8 border-red-500/20"
          : "bg-yellow-500/6 border-yellow-500/15",
      )}
    >
      <div className="flex flex-col divide-y divide-white/5">
        {visible.map((alert) => (
          <div key={alert.id} className="flex items-center gap-3 py-2.5">
            <AlertTriangle
              size={13}
              className={cn(
                "shrink-0",
                alert.severity === "critical"
                  ? "text-red-400"
                  : "text-yellow-400",
              )}
            />
            <Link
              href={alert.link}
              className={cn(
                "text-xs flex-1 hover:underline underline-offset-2",
                alert.severity === "critical"
                  ? "text-red-300"
                  : "text-yellow-300",
              )}
            >
              {alert.message}
            </Link>
            <button
              type="button"
              onClick={() =>
                setDismissed((prev) => new Set([...prev, alert.id]))
              }
              className="text-zinc-600 hover:text-zinc-400 transition-colors shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
