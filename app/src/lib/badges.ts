export type BadgeKey = "first_report" | "reliable_reporter" | "early_bird";

export interface Badge {
  label: string;
  description: string;
  emoji: string;
}

export const BADGES: Record<BadgeKey, Badge> = {
  first_report: {
    label: "Primer Reporte",
    description: "Enviaste tu primer reporte",
    emoji: "🚩",
  },
  reliable_reporter: {
    label: "Reportero Confiable",
    description: "10 reportes con credibilidad ≥ 90",
    emoji: "🛡️",
  },
  early_bird: {
    label: "Madrugador",
    description: "5 reportes antes de las 7am",
    emoji: "🌅",
  },
};
