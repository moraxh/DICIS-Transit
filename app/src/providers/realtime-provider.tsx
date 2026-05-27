"use client";

import { supabase } from "@lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface RealtimeCtx {
  isLive: boolean;
  newCount: number;
  clearNewCount: () => void;
}

const Ctx = createContext<RealtimeCtx>({
  isLive: false,
  newCount: 0,
  clearNewCount: () => {},
});

export function useRealtimeCtx() {
  return useContext(Ctx);
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [isLive, setIsLive] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (channelRef.current) return;

    const channel = supabase
      .channel("admin-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "reports" },
        () => {
          setNewCount((n) => n + 1);
          queryClient.invalidateQueries({
            queryKey: ["admin", "recent-reports"],
          });
          queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
          queryClient.invalidateQueries({
            queryKey: ["admin", "route-health"],
          });
          queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
          queryClient.invalidateQueries({
            queryKey: ["admin", "reports-list"],
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "reports" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["admin", "recent-reports"],
          });
          queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
          queryClient.invalidateQueries({
            queryKey: ["admin", "reports-list"],
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "route_temporary_overrides" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "overrides"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
          queryClient.invalidateQueries({
            queryKey: ["admin", "route-health"],
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notices" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "notices"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "kpis"] });
          queryClient.invalidateQueries({ queryKey: ["admin", "alerts"] });
        },
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [queryClient]);

  const clearNewCount = useCallback(() => setNewCount(0), []);
  const value = useMemo(
    () => ({ isLive, newCount, clearNewCount }),
    [isLive, newCount, clearNewCount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
