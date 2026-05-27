"use client";

import { useAuth } from "@providers/auth-provider";
import { QueryProvider } from "@providers/query-provider";
import { RealtimeProvider } from "@providers/realtime-provider";
import { usePendingReportsCount } from "@hooks/admin/use-realtime-reports";
import { cn } from "@lib/utils";
import { AnimatePresence, motion } from "motion/react";
import {
  Bus,
  LayoutDashboard,
  Loader2,
  LogOut,
  Map as MapIcon,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  TriangleAlert,
} from "lucide-react";
import { supabase } from "@lib/supabase/client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/notices", label: "Avisos", icon: Megaphone, exact: false },
  { href: "/admin/modifications", label: "Desvíos", icon: MapIcon, exact: false },
  { href: "/admin/reports", label: "Reportes", icon: TriangleAlert, exact: false },
];

function Sidebar({
  pendingReports,
  expanded,
  onToggle,
}: {
  pendingReports: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <motion.aside
      animate={{ width: expanded ? 220 : 56 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="shrink-0 border-r border-zinc-800/60 flex flex-col bg-zinc-950 overflow-hidden"
    >
      {/* Logo */}
      <div
        className={cn(
          "h-14 border-b border-zinc-800/60 flex items-center shrink-0",
          expanded ? "px-4 gap-3" : "justify-center",
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
          <Bus size={14} className="text-white" />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <p className="text-sm font-bold text-white tracking-tight truncate leading-none">
                DICIS Transit
              </p>
              <p className="text-[10px] text-zinc-500 font-medium mt-0.5">Panel de administración</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-2 flex-1">
        {navItems.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const isPending = href === "/admin/reports" && pendingReports > 0;

          return (
            <Link
              key={href}
              href={href}
              title={!expanded ? label : undefined}
              className={cn(
                "relative flex items-center rounded-lg text-sm transition-all duration-150",
                expanded ? "gap-3 px-3 py-2.5" : "justify-center p-3",
                active
                  ? "text-white font-medium"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-white/4",
              )}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-white/8 border border-white/8"
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                />
              )}
              <Icon
                size={16}
                className={cn("shrink-0 relative z-10", active ? "text-white" : "text-zinc-500")}
              />
              <AnimatePresence>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 truncate relative z-10"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isPending && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className={cn(
                    "h-4 min-w-4 px-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center tabular-nums relative z-10",
                    !expanded && "absolute top-1 right-1",
                  )}
                >
                  {pendingReports > 99 ? "99+" : pendingReports}
                </motion.span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Toggle + back to map */}
      <div className="p-2 border-t border-zinc-800/60 flex flex-col gap-1">
        <Link
          href="/"
          title={!expanded ? "Volver al mapa" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-white/4 transition-all",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center p-3",
          )}
        >
          <MapIcon size={16} className="shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="truncate flex-1"
              >
                Volver al mapa
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          title={!expanded ? "Cerrar sesión" : undefined}
          className={cn(
            "flex items-center rounded-lg text-sm text-zinc-500 hover:text-red-400 hover:bg-red-500/8 transition-all",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center p-3",
          )}
        >
          <LogOut size={16} className="shrink-0" />
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="truncate flex-1 text-left"
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex items-center rounded-lg text-sm text-zinc-600 hover:text-zinc-400 hover:bg-white/4 transition-all",
            expanded ? "gap-3 px-3 py-2.5" : "justify-center p-3",
          )}
          title={expanded ? "Colapsar" : "Expandir"}
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          <AnimatePresence>
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="truncate flex-1 text-left"
              >
                Colapsar
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pendingReports = usePendingReportsCount();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar-expanded");
    if (stored !== null) setExpanded(stored === "true");
  }, []);

  function handleToggle() {
    setExpanded((prev) => {
      const next = !prev;
      localStorage.setItem("admin-sidebar-expanded", String(next));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <Sidebar pendingReports={pendingReports} expanded={expanded} onToggle={handleToggle} />
      <main className="flex-1 overflow-auto min-w-0">{children}</main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userType, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && userType !== "admin" && pathname !== "/admin/login") {
      router.replace("/admin/login");
    }
  }, [isLoading, userType, router, pathname]);

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
        >
          <Loader2 className="animate-spin text-zinc-600" size={20} />
        </motion.div>
      </div>
    );
  }

  if (userType !== "admin") {
    return null;
  }

  return (
    <QueryProvider>
      <RealtimeProvider>
        <AdminShell>{children}</AdminShell>
      </RealtimeProvider>
    </QueryProvider>
  );
}
