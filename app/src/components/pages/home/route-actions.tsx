"use client";

import { useFavorites } from "@hooks/use-favorites";
import { useAuth } from "@providers/auth-provider";
import { useMapData } from "@providers/map-provider";
import clsx from "clsx";
import { Share2, Star } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export function RouteActions() {
  const { activeRouteId, routes } = useMapData();
  const { userData } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites(userData?.id);

  if (!activeRouteId) return null;

  const route = routes.find((r) => r.id === activeRouteId);
  if (!route) return null;

  const starred = isFavorite(activeRouteId);

  async function handleShare() {
    const url = `${window.location.origin}/?route=${activeRouteId}`;
    if (navigator.share) {
      await navigator.share({ title: route!.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={() => toggleFavorite(activeRouteId)}
        title={starred ? "Quitar de favoritos" : "Agregar a favoritos"}
        className={clsx(
          "p-2 rounded-full transition-colors",
          starred
            ? "text-amber-400 hover:text-amber-300"
            : "text-zinc-500 hover:text-zinc-300",
        )}
      >
        <Star className="w-4 h-4" fill={starred ? "currentColor" : "none"} />
      </motion.button>

      <motion.button
        type="button"
        whileTap={{ scale: 0.85 }}
        onClick={handleShare}
        title="Compartir ruta"
        className="p-2 rounded-full text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <Share2 className="w-4 h-4" />
      </motion.button>
    </div>
  );
}
