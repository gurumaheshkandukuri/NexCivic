import { Issue } from "../../types";
import { 
  calculateResolutionTimeDays, 
  calculateInspectionDurationHours, 
  calculateAverage, 
  getTimestampMs 
} from "./analyticsUtils";

export interface InspectorAnalyticsResult {
  summary: {
    assigned: number;
    accepted: number;
    completed: number;
    averageCompletionTimeDays: number | "Insufficient Data";
    averageInspectionDurationHours: number | "Insufficient Data";
    resolutionSuccessRate: number | "Insufficient Data";
    averageCitizenRating: number | "Insufficient Data";
    casesThisWeek: number;
    casesThisMonth: number;
    longestPendingCaseDays: number;
    performanceTrend: string;
  };
  charts: {};
  metadata: {
    lastUpdated: number;
    version: number;
  };
}

export function generateInspectorAnalytics(issues: Issue[]): InspectorAnalyticsResult {
  const assigned = issues.length;
  const accepted = issues.filter(i => i.status === "In Progress" || i.status === "Resolved" || i.status === "Awaiting HQ Review").length;
  const completed = issues.filter(i => i.status === "Resolved" || i.status === "Awaiting HQ Review").length;

  const resolutionTimes = issues
    .filter(i => i.status === "Resolved")
    .map(i => calculateResolutionTimeDays(i))
    .filter((t): t is number => t !== null);

  const inspectionDurations = issues
    .map(i => calculateInspectionDurationHours(i))
    .filter((t): t is number => t !== null);

  const averageCompletionTimeDays = calculateAverage(resolutionTimes);
  const averageInspectionDurationHours = calculateAverage(inspectionDurations);
  
  const resolutionSuccessRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

  const ratings = issues
    .map(i => i.rating)
    .filter((r): r is number => r !== null && r !== undefined);
  const averageCitizenRating = calculateAverage(ratings);

  const now = Date.now();
  const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
  const oneMonthMs = 30 * 24 * 60 * 60 * 1000;

  const casesThisWeek = issues.filter(i => (now - getTimestampMs(i.createdAt)) <= oneWeekMs).length;
  const casesThisMonth = issues.filter(i => (now - getTimestampMs(i.createdAt)) <= oneMonthMs).length;

  const pendingIssues = issues.filter(i => i.status === "Submitted" || i.status === "In Progress");
  let longestPendingCaseDays = 0;
  if (pendingIssues.length > 0) {
    const oldest = pendingIssues.reduce((min, curr) => {
      const minTs = getTimestampMs(min.createdAt);
      const currTs = getTimestampMs(curr.createdAt);
      return currTs < minTs ? curr : min;
    });
    longestPendingCaseDays = (now - getTimestampMs(oldest.createdAt)) / (1000 * 60 * 60 * 24);
  }

  let performanceTrend = "Insufficient Data";
  if (completed > 10) {
    if (resolutionSuccessRate > 80) performanceTrend = "↑ Improved";
    else if (resolutionSuccessRate < 50) performanceTrend = "↓ Declined";
    else performanceTrend = "→ Stable";
  }

  return {
    summary: {
      assigned,
      accepted,
      completed,
      averageCompletionTimeDays: resolutionTimes.length > 0 ? Number(averageCompletionTimeDays.toFixed(1)) : "Insufficient Data",
      averageInspectionDurationHours: inspectionDurations.length > 0 ? Number(averageInspectionDurationHours.toFixed(1)) : "Insufficient Data",
      resolutionSuccessRate: assigned > 0 ? resolutionSuccessRate : "Insufficient Data",
      averageCitizenRating: ratings.length > 0 ? Number(averageCitizenRating.toFixed(1)) : "Insufficient Data",
      casesThisWeek,
      casesThisMonth,
      longestPendingCaseDays: Number(longestPendingCaseDays.toFixed(1)),
      performanceTrend
    },
    charts: {},
    metadata: {
      lastUpdated: Date.now(),
      version: 1
    }
  };
}
