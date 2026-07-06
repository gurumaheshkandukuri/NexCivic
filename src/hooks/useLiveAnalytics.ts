import { useMemo } from "react";
import { Issue, UserProfile } from "../types";
import { ROLES } from "../constants/roles";
import { generateCitizenAnalytics } from "../utils/analytics/citizenAnalytics";
import { generateInspectorAnalytics } from "../utils/analytics/inspectorAnalytics";
import { generateHQAnalytics } from "../utils/analytics/hqAnalytics";

export function useLiveAnalytics(user: UserProfile | null, issues: Issue[]) {
  const analyticsData = useMemo(() => {
    if (!user) {
      return null;
    }

    if (user.role === ROLES.CITIZEN) {
      return generateCitizenAnalytics(issues);
    } else if (user.role === ROLES.FIELD_INSPECTOR) {
      return generateInspectorAnalytics(issues);
    } else if (user.role === ROLES.MUNICIPALITY_HQ) {
      return generateHQAnalytics(issues);
    }

    return null;
  }, [user, issues]);

  return analyticsData;
}
