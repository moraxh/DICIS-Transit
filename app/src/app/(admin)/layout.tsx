"use client";

import { useAuth } from "@providers/auth-provider";
import { LayoutDashboard, Loader2, Megaphone, Route, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/notices", label: "Avisos", icon: Megaphone },
  { href: "/admin/modifications", label: "Modificaciones", icon: Route },
  { href: "/admin/reports", label: "Reportes", icon: TriangleAlert },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
        <Loader2 className="animate-spin text-zinc-500" size={24} />
      </div>
    );
  }

  if (userType !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      <aside className="w-56 shrink-0 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-5 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">DICIS Transit</p>
          <p className="text-xs text-zinc-500">Panel de administrador</p>
        </div>
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white font-medium"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={15} />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
