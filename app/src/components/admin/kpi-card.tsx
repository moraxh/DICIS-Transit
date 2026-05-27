import { cn } from "@lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface KPICardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  delta?: number | null;
  deltaLabel?: string;
  href?: string;
  highlight?: boolean;
  badge?: React.ReactNode;
  className?: string;
}

export function KPICard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  delta,
  deltaLabel,
  href,
  highlight,
  badge,
  className,
}: KPICardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border p-4 flex flex-col gap-3 transition-all",
        highlight
          ? "border-red-500/25 bg-red-500/6 hover:bg-red-500/10"
          : "border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900/80",
        href && "cursor-pointer",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            iconBg,
          )}
        >
          <Icon size={15} className={iconColor} />
        </div>
        {badge}
      </div>

      <div>
        <div className="text-2xl font-bold text-white tabular-nums leading-none">
          {value}
        </div>
        <div className="text-xs text-zinc-400 mt-1.5 font-medium">
          {label}
        </div>
      </div>

      {(delta !== undefined && delta !== null) && (
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "text-xs font-medium",
              delta > 0 ? "text-red-400" : delta < 0 ? "text-emerald-400" : "text-zinc-500",
            )}
          >
            {delta > 0 ? `↑ ${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : "—"}
          </span>
          {deltaLabel && (
            <span className="text-xs text-zinc-600">{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
