"use client";

import { supabase } from "@lib/supabase/client";
import { useCallback, useEffect, useState } from "react";

export function useFavorites(userId: string | null | undefined) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setFavorites([]);
      return;
    }

    setLoading(true);
    supabase
      .from("user_favorites")
      .select("route_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setFavorites(data.map((r) => r.route_id));
        setLoading(false);
      });
  }, [userId]);

  const isFavorite = useCallback(
    (routeId: string) => favorites.includes(routeId),
    [favorites],
  );

  const toggleFavorite = useCallback(
    async (routeId: string) => {
      if (!userId) return;

      const already = favorites.includes(routeId);

      // Optimistic update
      setFavorites((prev) =>
        already ? prev.filter((id) => id !== routeId) : [...prev, routeId],
      );

      if (already) {
        const { error } = await supabase
          .from("user_favorites")
          .delete()
          .eq("user_id", userId)
          .eq("route_id", routeId);
        if (error) setFavorites((prev) => [...prev, routeId]);
      } else {
        const { error } = await supabase
          .from("user_favorites")
          .insert({ user_id: userId, route_id: routeId });
        if (error) setFavorites((prev) => prev.filter((id) => id !== routeId));
      }
    },
    [userId, favorites],
  );

  return { favorites, loading, isFavorite, toggleFavorite };
}
