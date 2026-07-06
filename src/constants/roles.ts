export const ROLES = {
  CITIZEN: "CITIZEN",
  FIELD_INSPECTOR: "FIELD_INSPECTOR",
  MUNICIPALITY_HQ: "MUNICIPALITY_HQ",
} as const;

export type RoleType = typeof ROLES[keyof typeof ROLES];
