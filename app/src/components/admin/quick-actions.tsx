"use client";

import { Map, Megaphone } from "lucide-react";

interface QuickActionsProps {
  onNewNotice: () => void;
  onManageRoutes: () => void;
}

const actions = [
  {
    key: "notice" as const,
    label: "Nuevo aviso",
    description: "Publicar aviso a estudiantes",
    icon: Megaphone,
    color:
      "text-orange-400 bg-orange-500/10 border-orange-500/15 hover:bg-orange-500/15",
  },
  {
    key: "routes" as const,
    label: "Editar rutas",
    description: "Gestionar desvios temporales",
    icon: Map,
    color:
      "text-blue-400 bg-blue-500/10 border-blue-500/15 hover:bg-blue-500/15",
  },
];

export function QuickActions({
  onNewNotice,
  onManageRoutes,
}: QuickActionsProps) {
  function handleClick(key: "notice" | "routes") {
    if (key === "notice") onNewNotice();
    else onManageRoutes();
  }

  return (
    <div className="flex flex-col gap-2">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={() => handleClick(action.key)}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all group text-left active:scale-[0.98] ${action.color}`}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-white/10">
            <action.icon size={15} className="shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-white">
              {action.label}
            </div>
            <div className="text-xs text-zinc-400 mt-0.5">
              {action.description}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
