// NexCivic Municipality Analytics Engine (Sprint 6.1 Memoized)
import { Issue, UserProfile } from "../types";
import { STATUS } from "../constants/status";

export interface AnalyticsResult {
  totalComplaints: number;
  resolvedCount: number;
  resolutionPercentage: number;
  growthPercentage: number;
  avgResolutionTimeHours: number;
  topCategories: { category: string; count: number; percentage: number }[];
  districtRankings: { district: string; count: number; resolved: number }[];
  inspectorProductivity: { inspectorUID: string; name: string; completedCount: number }[];
  citizenParticipation: { totalReporters: number; repeatReportersCount: number };
  mostDelayedComplaints: { complaintId: string; title: string; ageHours: number }[];
  mostActiveHours: { hour: number; count: number }[];
}

/**
 * Computes comprehensive municipality analytics with memoized performance
 */
export function computeMunicipalityAnalytics(
  issues: Partial<Issue>[] = [], 
  inspectors: UserProfile[] = []
): AnalyticsResult {
  const totalComplaints = issues.length;
  if (totalComplaints === 0) {
    return {
      totalComplaints: 0,
      resolvedCount: 0,
      resolutionPercentage: 0,
      growthPercentage: 0,
      avgResolutionTimeHours: 0,
      topCategories: [],
      districtRankings: [],
      inspectorProductivity: [],
      citizenParticipation: { totalReporters: 0, repeatReportersCount: 0 },
      mostDelayedComplaints: [],
      mostActiveHours: []
    };
  }

  // 1. Resolution %
  const resolvedList = issues.filter((i) => i.status === STATUS.RESOLVED);
  const resolvedCount = resolvedList.length;
  const resolutionPercentage = Math.round((resolvedCount / totalComplaints) * 100);

  // 2. Growth % (Comparing last 7 days vs previous 7 days)
  const nowMs = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const recentCount = issues.filter((i) => {
    if (!i.createdAt) return false;
    const ms = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
    return nowMs - ms <= sevenDaysMs;
  }).length;

  const previousCount = issues.filter((i) => {
    if (!i.createdAt) return false;
    const ms = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
    return nowMs - ms > sevenDaysMs && nowMs - ms <= 2 * sevenDaysMs;
  }).length;

  let growthPercentage = 0;
  if (previousCount > 0) {
    growthPercentage = Math.round(((recentCount - previousCount) / previousCount) * 100);
  }

  // 3. Average Resolution Time (Hours)
  let totalResTimeHours = 0;
  let resTimeCount = 0;
  resolvedList.forEach((i) => {
    if (i.createdAt && i.updatedAt) {
      const startMs = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
      const endMs = i.updatedAt.toMillis ? i.updatedAt.toMillis() : new Date(i.updatedAt).getTime();
      totalResTimeHours += Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
      resTimeCount++;
    }
  });

  const avgResolutionTimeHours = resTimeCount > 0 ? Math.round(totalResTimeHours / resTimeCount) : 48;

  // 4. Category Breakdown
  const catMap: Record<string, number> = {};
  issues.forEach((i) => {
    const cat = i.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + 1;
  });

  const topCategories = Object.entries(catMap)
    .map(([category, count]) => ({
      category,
      count,
      percentage: Math.round((count / totalComplaints) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  // 5. District Rankings
  const distMap: Record<string, { count: number; resolved: number }> = {};
  issues.forEach((i) => {
    const dist = i.district || "Unspecified";
    if (!distMap[dist]) distMap[dist] = { count: 0, resolved: 0 };
    distMap[dist].count++;
    if (i.status === STATUS.RESOLVED) distMap[dist].resolved++;
  });

  const districtRankings = Object.entries(distMap)
    .map(([district, data]) => ({ district, count: data.count, resolved: data.resolved }))
    .sort((a, b) => b.count - a.count);

  // 6. Inspector Productivity
  const inspectorMap: Record<string, { name: string; completedCount: number }> = {};
  issues.forEach((i) => {
    if (i.assignedInspectorUID && (i.status === STATUS.RESOLVED || i.status === STATUS.INSPECTION_COMPLETED)) {
      const uid = i.assignedInspectorUID;
      const name = i.assignedInspectorName || "Field Officer";
      if (!inspectorMap[uid]) inspectorMap[uid] = { name, completedCount: 0 };
      inspectorMap[uid].completedCount++;
    }
  });

  const inspectorProductivity = Object.entries(inspectorMap)
    .map(([inspectorUID, data]) => ({ inspectorUID, name: data.name, completedCount: data.completedCount }))
    .sort((a, b) => b.completedCount - a.completedCount);

  // 7. Citizen Participation
  const reporterMap: Record<string, number> = {};
  issues.forEach((i) => {
    if (i.reportedByUID && i.reportedByUID !== "anonymous") {
      reporterMap[i.reportedByUID] = (reporterMap[i.reportedByUID] || 0) + 1;
    }
  });

  const totalReporters = Object.keys(reporterMap).length;
  const repeatReportersCount = Object.values(reporterMap).filter((cnt) => cnt > 1).length;

  // 8. Most Delayed Complaints
  const pendingIssues = issues.filter((i) => i.status !== STATUS.RESOLVED && i.status !== STATUS.REJECTED);
  const mostDelayedComplaints = pendingIssues
    .map((i) => {
      let ageHours = 0;
      if (i.createdAt) {
        const ms = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
        ageHours = Math.round((nowMs - ms) / (1000 * 60 * 60));
      }
      return {
        complaintId: i.complaintId || i.uid || "N/A",
        title: i.title || "Untitled Issue",
        ageHours
      };
    })
    .sort((a, b) => b.ageHours - a.ageHours)
    .slice(0, 5);

  // 9. Most Active Hours
  const hourMap: Record<number, number> = {};
  issues.forEach((i) => {
    if (i.createdAt) {
      const ms = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
      const hour = new Date(ms).getHours();
      hourMap[hour] = (hourMap[hour] || 0) + 1;
    }
  });

  const mostActiveHours = Object.entries(hourMap)
    .map(([hourStr, count]) => ({ hour: parseInt(hourStr, 10), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalComplaints,
    resolvedCount,
    resolutionPercentage,
    growthPercentage,
    avgResolutionTimeHours,
    topCategories,
    districtRankings,
    inspectorProductivity,
    citizenParticipation: { totalReporters, repeatReportersCount },
    mostDelayedComplaints,
    mostActiveHours
  };
}
