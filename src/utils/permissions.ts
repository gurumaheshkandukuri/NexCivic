import { ROLES, RoleType } from '../constants/roles';

export function canViewIssue(role: string): boolean {
  return [ROLES.CITIZEN, ROLES.FIELD_INSPECTOR, ROLES.MUNICIPALITY_HQ].includes(role as RoleType);
}

export function canEditIssue(role: string): boolean {
  return ([ROLES.FIELD_INSPECTOR, ROLES.MUNICIPALITY_HQ] as string[]).includes(role);
}

export function canResolveIssue(role: string): boolean {
  return ([ROLES.FIELD_INSPECTOR, ROLES.MUNICIPALITY_HQ] as string[]).includes(role);
}

export function canApproveIssue(role: string): boolean {
  return role === ROLES.MUNICIPALITY_HQ;
}

export function canSupportIssue(role: string): boolean {
  return role === ROLES.CITIZEN;
}
