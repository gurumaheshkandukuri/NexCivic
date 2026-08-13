// NexCivic Executive Natural Language Summary Generator (Sprint 6.1)
import { Issue, UserProfile } from "../types";
import { computeMunicipalityAnalytics } from "./analyticsEngine";
import { calculateMunicipalityHealth } from "./healthScoreEngine";

/**
 * Generates an executive natural-language narrative summarizing municipal operations and key intelligence metrics
 */
export function generateExecutiveSummary(issues: Partial<Issue>[] = [], inspectors: UserProfile[] = []): string {
  if (issues.length === 0) {
    return "Municipal civic operations are running smoothly with no active complaint backlog logged. Resolution systems remain at 100% operational readiness.";
  }

  const analytics = computeMunicipalityAnalytics(issues, inspectors);
  const health = calculateMunicipalityHealth(issues);

  const dominantCat = analytics.topCategories[0]?.category || "General";
  const dominantPct = analytics.topCategories[0]?.percentage || 0;
  const topDistrict = analytics.districtRankings[0]?.district || "the municipality";

  const growthText = analytics.growthPercentage >= 0
    ? `increased by ${analytics.growthPercentage}%`
    : `decreased by ${Math.abs(analytics.growthPercentage)}%`;

  const narrativeParts: string[] = [];

  narrativeParts.push(
    `Overall civic complaint volume has ${growthText} compared to the previous week, totaling ${analytics.totalComplaints} registered grievances.`
  );

  narrativeParts.push(
    `'${dominantCat}' infrastructure complaints remain the dominant issue type, representing ${dominantPct}% of all logged reports.`
  );

  narrativeParts.push(
    `${topDistrict} exhibits the highest complaint volume. The municipal platform maintains a ${health.letterGrade} health grade (${health.healthScore}/100) with a ${analytics.resolutionPercentage}% resolution completion rate.`
  );

  if (analytics.mostDelayedComplaints.length > 0) {
    narrativeParts.push(
      `Priority focus is recommended for ${analytics.mostDelayedComplaints.length} overdue grievances currently exceeding initial response thresholds.`
    );
  }

  return narrativeParts.join(" ");
}
