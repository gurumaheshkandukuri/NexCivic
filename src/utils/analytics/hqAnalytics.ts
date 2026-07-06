import { Issue } from "../../types";
import { 
  calculateResolutionTimeDays, 
  calculateAverage, 
  countByField,
  groupIssuesByMonth,
  getTimestampMs
} from "./analyticsUtils";

export interface HQAnalyticsResult {
  summary: {
    totalIncidents: number;
    openBacklog: number;
    activeInField: number;
    certifiedClosed: number;
    averageResolutionTimeDays: number | "Insufficient Data";
    citizenSatisfaction: number | "Insufficient Data";
    topCategory: string | "Insufficient Data";
    topDistrict: string | "Insufficient Data";
    workloadTrend: string;
  };
  charts: {
    districtComparison: { district: string; count: number }[];
    ulbComparison: { ulb: string; count: number }[];
    categoryDistribution: { category: string; total: number; resolved: number }[];
    priorityDistribution: { priority: string; count: number }[];
    monthlyTrend: { name: string; submitted: number; resolved: number }[];
  };
  metadata: {
    lastUpdated: number;
    version: number;
  };
}

export function generateHQAnalytics(issues: Issue[]): HQAnalyticsResult {
  const totalIncidents = issues.length;
  const openBacklog = issues.filter(i => ["Submitted", "Assigned", "Accepted"].includes(i.status as string)).length;
  const activeInField = issues.filter(i => ["In Progress", "Inspection Started"].includes(i.status as string)).length;
  const certifiedClosed = issues.filter(i => ["Resolved", "Inspection Completed", "Awaiting_HQ"].includes(i.status as string)).length;

  const resolutionTimes = issues
    .filter(i => i.status === "Resolved")
    .map(i => calculateResolutionTimeDays(i))
    .filter((t): t is number => t !== null);
  const averageResolutionTimeDays = calculateAverage(resolutionTimes);

  const ratings = issues
    .map(i => i.rating)
    .filter((r): r is number => r !== null && r !== undefined);
  const citizenSatisfaction = calculateAverage(ratings);

  // Groupings
  const districtsCount = countByField(issues, "district");
  const districtComparison = Object.keys(districtsCount).map(k => ({ district: k, count: districtsCount[k] }));

  const ulbCount = countByField(issues, "ulb");
  const ulbComparison = Object.keys(ulbCount).map(k => ({ ulb: k, count: ulbCount[k] }));

  const categoryCount = countByField(issues, "category");
  const categoryDistribution = Object.keys(categoryCount).map(k => {
    const resolved = issues.filter(i => i.category === k && i.status === "Resolved").length;
    return { category: k, total: categoryCount[k], resolved };
  });
  const topCategory = Object.keys(categoryCount).sort((a, b) => categoryCount[b] - categoryCount[a])[0] || "None";

  const priorityCount = countByField(issues, "priority");
  const priorityDistribution = Object.keys(priorityCount).map(k => ({ priority: k, count: priorityCount[k] }));

  const monthlyGroups = groupIssuesByMonth(issues);
  const monthlyTrend = Object.keys(monthlyGroups).sort().map(month => {
    return {
      name: month,
      submitted: monthlyGroups[month].length,
      resolved: monthlyGroups[month].filter(i => i.status === "Resolved").length
    };
  });

  // Calculate top performing and slowest district
  // "Top performing" = lowest avg resolution time
  // "Slowest" = highest avg resolution time
  const districtPerformance: Record<string, number[]> = {};
  issues.forEach(i => {
    if (i.status === "Resolved") {
      const rt = calculateResolutionTimeDays(i);
      if (rt !== null) {
        if (!districtPerformance[i.district]) districtPerformance[i.district] = [];
        districtPerformance[i.district].push(rt);
      }
    }
  });

  let topPerformingDistrict = "None";
  let slowestDistrict = "None";
  let minAvg = Infinity;
  let maxAvg = -1;

  Object.keys(districtPerformance).forEach(district => {
    const avg = calculateAverage(districtPerformance[district]);
    if (avg < minAvg) {
      minAvg = avg;
      topPerformingDistrict = district;
    }
    if (avg > maxAvg) {
      maxAvg = avg;
      slowestDistrict = district;
    }
  });

  let workloadTrend = "Insufficient Data";
  if (monthlyTrend.length >= 2) {
    const lastMonth = monthlyTrend[monthlyTrend.length - 1];
    const prevMonth = monthlyTrend[monthlyTrend.length - 2];
    if (lastMonth.submitted > prevMonth.submitted) workloadTrend = "↑ Increased";
    else if (lastMonth.submitted < prevMonth.submitted) workloadTrend = "↓ Decreased";
    else workloadTrend = "→ Stable";
  }

  return {
    summary: {
      totalIncidents,
      openBacklog,
      activeInField,
      certifiedClosed,
      averageResolutionTimeDays: resolutionTimes.length > 0 ? Number(averageResolutionTimeDays.toFixed(1)) : "Insufficient Data",
      citizenSatisfaction: ratings.length > 0 ? Number(citizenSatisfaction.toFixed(1)) : "Insufficient Data",
      topCategory: totalIncidents > 0 ? topCategory : "Insufficient Data",
      topDistrict: totalIncidents > 0 ? topPerformingDistrict : "Insufficient Data",
      workloadTrend
    },
    charts: {
      districtComparison,
      ulbComparison,
      categoryDistribution,
      priorityDistribution,
      monthlyTrend
    },
    metadata: {
      lastUpdated: Date.now(),
      version: 1
    }
  };
}
