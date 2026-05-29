"use client";

import { driver } from "driver.js";
import { useCallback } from "react";

const TOUR_KEY = "dicis_tour_done";

export function useTour(isStudent: boolean) {
  const startTour = useCallback(
    (force = false) => {
      if (!force && localStorage.getItem(TOUR_KEY)) return;

      const steps = [
        {
          element: "[data-tour='sidebar']",
          popover: {
            title: "Panel lateral",
            description:
              "Aquí está toda la información del servicio: rutas, horarios, avisos y tu perfil.",
            side: "right" as const,
            align: "start" as const,
          },
        },
        {
          element: "[data-tour='tab-home']",
          popover: {
            title: "Inicio",
            description:
              "Resumen del servicio: estado actual, próximas salidas y tu parada más cercana.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='tab-routes']",
          popover: {
            title: "Rutas",
            description:
              "Explora todas las rutas disponibles. Puedes buscar por nombre, filtrar por día y marcar favoritas.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='tab-schedules']",
          popover: {
            title: "Horarios",
            description:
              "Consulta los horarios completos de cada ruta. Los próximos camiones se resaltan en tiempo real.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='tab-alerts']",
          popover: {
            title: "Avisos",
            description:
              "Desvíos temporales, cancelaciones y avisos urgentes del servicio.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='tab-profile']",
          popover: {
            title: "Perfil",
            description:
              "Tu puntuación de credibilidad, logros desbloqueados y preferencias de notificaciones.",
            side: "bottom" as const,
            align: "center" as const,
          },
        },
        {
          element: "[data-tour='service-status']",
          popover: {
            title: "Estado del servicio",
            description:
              "Indica si hay camiones activos en este momento, cuándo sale el próximo o si el servicio ya terminó.",
            side: "top" as const,
            align: "start" as const,
          },
        },
        ...(isStudent
          ? [
              {
                element: "[data-tour='report-btn']",
                popover: {
                  title: "Reportar incidencia",
                  description:
                    "¿El camión no pasó, venía lleno o se adelantó? Repórtalo aquí para ayudar a otros estudiantes.",
                  side: "left" as const,
                  align: "end" as const,
                },
              },
            ]
          : []),
      ];

      const driverObj = driver({
        showProgress: true,
        animate: true,
        overlayOpacity: 0.35,
        stagePadding: 6,
        stageRadius: 12,
        nextBtnText: "Siguiente",
        prevBtnText: "Atrás",
        doneBtnText: "¡Listo!",
        progressText: "{{current}} de {{total}}",
        onDestroyStarted: () => {
          driverObj.destroy();
          localStorage.setItem(TOUR_KEY, "1");
        },
        steps,
      });

      driverObj.drive();
    },
    [isStudent],
  );

  const shouldAutoStart = () => !localStorage.getItem(TOUR_KEY);

  return { startTour, shouldAutoStart };
}
