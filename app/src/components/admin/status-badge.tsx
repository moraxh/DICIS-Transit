import { cn } from "@lib/utils";

type Variant = "critical" | "warning" | "ok" | "info" | "muted" | "pending";

const variants: Record<Variant, string> = {
  critical: "text-red-400 bg-red-500/10 border-red-500/20",
  warning: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  ok: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  muted: "text-zinc-500 bg-zinc-500/10 border-zinc-700/40",
  pending: "text-zinc-300 bg-zinc-800/60 border-zinc-700/40",
};

interface StatusBadgeProps {
  variant: Variant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
