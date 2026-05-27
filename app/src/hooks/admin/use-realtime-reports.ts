"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export function usePendingReportsCount() {
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);

  useEffect(() => {
    function update() {
      const kpis = queryClient.getQueryData<{ pendingReports: number }>(["admin", "kpis"]);
      if (kpis) setCount(kpis.pendingReports);
    }

    update();
    const unsub = queryClient.getQueryCache().subscribe(({ query }) => {
      if (
        Array.isArray(query.queryKey) &&
        query.queryKey[0] === "admin" &&
        query.queryKey[1] === "kpis"
      ) {
        update();
      }
    });

    return unsub;
  }, [queryClient]);

  return count;
}
