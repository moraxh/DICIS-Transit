export const DICIS_COORDS = {
  lat: 20.549879054215197,
  lng: -101.2008414859346,
} as const;

export const REPORT_TYPE_LABEL: Record<string, string> = {
  did_not_pass: "No pasó el camión",
  full_bus: "Venía lleno",
  early: "Se adelantó",
  delay: "Se tardó",
};
