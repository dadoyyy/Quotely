/** Option lists shared by forms and validation. Kept in step with the database enums by a test. */
export const CATALOG_KINDS = ["service", "material", "labor", "fee"] as const;
export type CatalogKind = (typeof CATALOG_KINDS)[number];

export const UNITS = ["hour", "day", "sqm", "lm", "piece", "head", "set", "lot"] as const;
export type Unit = (typeof UNITS)[number];

export const KIND_LABELS: Record<CatalogKind, string> = {
  service: "Service",
  material: "Material",
  labor: "Labor",
  fee: "Fee",
};

export const UNIT_LABELS: Record<Unit, string> = {
  hour: "hour",
  day: "day",
  sqm: "sqm",
  lm: "linear m",
  piece: "piece",
  head: "head",
  set: "set",
  lot: "lot",
};
