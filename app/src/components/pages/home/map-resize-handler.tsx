"use client";

import { useMap } from "@components/ui/map";
import { useEffect } from "react";

export default function MapResizeHandler() {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!isLoaded || !map) return;

    const container = map.getContainer();
    const sidebarWrapper = container.closest("[data-slot='sidebar-wrapper']");
    let frameId: number | null = null;

    const scheduleResize = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        map.resize();
      });
    };

    const timer = window.setTimeout(scheduleResize, 250);
    const handleTransitionEvent = (event: Event) => {
      const te = event as TransitionEvent;
      if (
        te.propertyName !== "width" &&
        te.propertyName !== "left" &&
        te.propertyName !== "right"
      ) {
        return;
      }

      scheduleResize();
    };

    window.addEventListener("resize", scheduleResize);
    sidebarWrapper?.addEventListener("transitionrun", handleTransitionEvent);
    sidebarWrapper?.addEventListener("transitionend", handleTransitionEvent);

    return () => {
      window.clearTimeout(timer);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", scheduleResize);
      sidebarWrapper?.removeEventListener(
        "transitionrun",
        handleTransitionEvent,
      );
      sidebarWrapper?.removeEventListener(
        "transitionend",
        handleTransitionEvent,
      );
    };
  }, [isLoaded, map]);

  return null;
}
