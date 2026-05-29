"use client";

import { createContext, useContext } from "react";

interface TourContextValue {
  startTour: (force?: boolean) => void;
}

export const TourContext = createContext<TourContextValue>({
  startTour: () => {},
});

export function useTourContext() {
  return useContext(TourContext);
}
