import { Issue } from "../../types";
import { calculateResolutionTimeDays, calculateAverage, countByField, groupIssuesByMonth } from "./analyticsUtils";

export interface CitizenAnalyticsResult {
  summary: {
    reportsSubmitted: number;
    pending: number;
    resolved: number;
    resolutionSuccessRate: number | "Insufficient Data";
    averageResolutionTimeDays: number | "Insufficient Data";
    contributionScore: number;
    communitySupport: number;
    mostReportedCategory: string | "Insufficient Data";
    currentReportingStreak: number;
    resolutionTrend: string;
  };
  charts: {
    monthlyActivity: { name: string; submitted: number; resolved: number }[];
  };
  metadata: {
    lastUpdated: number;
    version: number;
  };
}

export function generateCitizenAnalytics(issues: Issue[]): CitizenAnalyticsResult {
  const total = issues.length;
  const resolved = issues.filter(i => i.status === "Resolved").length;
  const pending = total - resolved;

  const resolutionTimes = issues
    .filter(i => i.status === "Resolved")
    .map(i => calculateResolutionTimeDays(i))
    .filter((t): t is number => t !== null);

  const averageResolutionTimeDays = calculateAverage(resolutionTimes);
  const resolutionSuccessRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const contributionScore = issues.reduce((acc, issue) => acc + (issue.hotScore || 0), 0);
  const communitySupport = issues.reduce((acc, issue) => acc + (issue.communitySupportCount || 0), 0);

  const categories = countByField(issues, "category");
  const mostReportedCategory = Object.keys(categories).sort((a, b) => categories[b] - categories[a])[0] || "None";

  const monthlyGroups = groupIssuesByMonth(issues);
  const monthlyActivity = Object.keys(monthlyGroups).sort().map(month => {
    const monthIssues = monthlyGroups[month];
    return {
      name: month,
      submitted: monthIssues.length,
      resolved: monthIssues.filter(i => i.status === "Resolved").length
    };
  });

  // Calculate reporting streak (consecutive months)
  let streak = 0;
  if (monthlyActivity.length > 0) {
    const now = new Date();
    let currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    while (true) {
      const key = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyGroups[key]) {
        streak++;
        currentMonth.setMonth(currentMonth.getMonth() - 1);
      } else {
        break;
      }
    }
  }

  let resolutionTrend = "Insufficient Data";
  if (monthlyActivity.length >= 2) {
    const lastMonth = monthlyActivity[monthlyActivity.length - 1];
    const prevMonth = monthlyActivity[monthlyActivity.length - 2];
    const lastRate = lastMonth.submitted > 0 ? lastMonth.resolved / lastMonth.submitted : 0;
    const prevRate = prevMonth.submitted > 0 ? prevMonth.resolved / prevMonth.submitted : 0;
    
    if (lastRate > prevRate) resolutionTrend = "↑ Improved";
    else if (lastRate < prevRate) resolutionTrend = "↓ Declined";
    else resolutionTrend = "→ Stable";
  }

  return {
    summary: {
      reportsSubmitted: total,
      pending,
      resolved,
      resolutionSuccessRate: total > 0 ? resolutionSuccessRate : "Insufficient Data",
      averageResolutionTimeDays: resolutionTimes.length > 0 ? Number(averageResolutionTimeDays.toFixed(1)) : "Insufficient Data",
      contributionScore,
      communitySupport,
      mostReportedCategory: total > 0 ? mostReportedCategory : "Insufficient Data",
      currentReportingStreak: streak,
      resolutionTrend
    },
    charts: {
      monthlyActivity
    },
    metadata: {
      lastUpdated: Date.now(),
      version: 1
    }
  };
}
