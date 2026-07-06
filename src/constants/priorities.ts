export const PRIORITIES = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
} as const;

export type PriorityType = typeof PRIORITIES[keyof typeof PRIORITIES];

export const PRIORITY_LIST = Object.values(PRIORITIES);
