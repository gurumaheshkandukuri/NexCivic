export const CATEGORIES = {
  GARBAGE_OVERFLOW: "Garbage Overflow",
  DRAINAGE_OVERFLOW: "Drainage Overflow",
  ROAD_DAMAGE: "Road Damage",
  STREET_LIGHT: "Street Light",
  WATER_LEAKAGE: "Water Leakage",
  PUBLIC_PROPERTY_DAMAGE: "Public Property Damage",
  TRAFFIC_SIGNAL: "Traffic Signal",
  ILLEGAL_DUMPING: "Illegal Dumping",
  DEAD_ANIMAL: "Dead Animal",
  OTHERS: "Others",
} as const;

export type CategoryType = typeof CATEGORIES[keyof typeof CATEGORIES];

export const CATEGORY_LIST = Object.values(CATEGORIES);
