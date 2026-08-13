// NexCivic Municipality Health Engine (Sprint 6.1)
import { Issue } from "../types";
import { STATUS } from "../constants/status";
import { calculateExplainableSeverity } from "./severityEngine";

export interface HealthScoreResult {
  healthScore: number;
  letterGrade: "A+" | "A-" | "B+" | "B" | "C" | "D" | "F";
  trend: "IMPROVING" | "STABLE" | "DECLINING";
  explanation: string;
  recommendations: string[];
  metricsBreakdown: {
    resolutionRateScore: number;
    responseTimeScore: number;
    criticalBacklogScore: number;
    duplicateRateScore: number;
  };
}

/**
 * Calculates overall municipality health score (0-100), letter grade, trend, and targeted recommendations
 */
export function calculateMunicipalityHealth(issues: Partial<Issue>[] = []): HealthScoreResult {
  const totalCount = issues.length;
  if (totalCount === 0) {
    return {
      healthScore: 100,
      letterGrade: "A+",
      trend: "STABLE",
      explanation: "No active civic grievances logged. System functioning at optimal efficiency.",
      recommendations: ["Maintain current preventive maintenance schedules."],
      metricsBreakdown: {
        resolutionRateScore: 100,
        responseTimeScore: 100,
        criticalBacklogScore: 100,
        duplicateRateScore: 100
      }
    };
  }

  // 1. Resolution Rate Score (35% weight)
  const resolvedCount = issues.filter((i) => i.status === STATUS.RESOLVED).length;
  const resolutionRatePct = (resolvedCount / totalCount) * 100;
  const resolutionRateScore = Math.round(resolutionRatePct);

  // 2. Critical Backlog Score (25% weight)
  const pendingCount = issues.filter((i) => i.status !== STATUS.RESOLVED && i.status !== STATUS.REJECTED).length;
  const criticalPendingCount = issues.filter((i) => {
    if (i.status === STATUS.RESOLVED || i.status === STATUS.REJECTED) return false;
    return calculateExplainableSeverity(i, issues).score >= 75;
  }).length;

  const criticalRatio = pendingCount > 0 ? criticalPendingCount / pendingCount : 0;
  const criticalBacklogScore = Math.max(0, Math.round(100 - criticalRatio * 100));

  // 3. Response Time Score (25% weight)
  let totalRespHours = 0;
  let respCount = 0;
  issues.forEach((i) => {
    if (i.createdAt && i.inspectionStartedAt) {
      const startMs = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
      const endMs = i.inspectionStartedAt.toMillis ? i.inspectionStartedAt.toMillis() : new Date(i.inspectionStartedAt).getTime();
      totalRespHours += Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
      respCount++;
    }
  });
  const avgRespTimeHours = respCount > 0 ? totalRespHours / respCount : 24;
  const responseTimeScore = Math.max(0, Math.round(100 - Math.min(avgRespTimeHours * 1.5, 100)));

  // 4. Duplicate Rate Score (15% weight)
  const totalDuplicates = issues.reduce((sum, i) => sum + (i.communitySupportCount || 0), 0);
  const avgDuplicatesPerIssue = totalDuplicates / totalCount;
  const duplicateRateScore = Math.max(0, Math.round(100 - Math.min(avgDuplicatesPerIssue * 15, 100)));

  // Total Health Score Calculation
  const healthScore = Math.round(
    resolutionRateScore * 0.35 +
    criticalBacklogScore * 0.25 +
    responseTimeScore * 0.25 +
    duplicateRateScore * 0.15
  );

  // Letter Grade Assignment
  let letterGrade: "A+" | "A-" | "B+" | "B" | "C" | "D" | "F" = "B+";
  if (healthScore >= 93) letterGrade = "A+";
  else if (healthScore >= 87) letterGrade = "A-";
  else if (healthScore >= 80) letterGrade = "B+";
  else if (healthScore >= 72) letterGrade = "B";
  else if (healthScore >= 62) letterGrade = "C";
  else if (healthScore >= 50) letterGrade = "D";
  else letterGrade = "F";

  // Trend Determination
  let trend: "IMPROVING" | "STABLE" | "DECLINING" = "STABLE";
  if (resolutionRatePct >= 70 && criticalPendingCount <= 2) trend = "IMPROVING";
  else if (criticalPendingCount >= 5 || resolutionRatePct < 50) trend = "DECLINING";

  // Generate Recommendations
  const recommendations: string[] = [];
  if (resolutionRatePct < 60) {
    recommendations.push("Accelerate pending resolution approvals for completed field inspections.");
  }
  if (criticalPendingCount > 0) {
    recommendations.push(`Prioritize dispatching inspectors to ${criticalPendingCount} critical backlog grievances.`);
  }
  if (avgRespTimeHours > 36) {
    recommendations.push("Reduce initial inspection response time below the 24-hour target threshold.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Maintain current response speed and continue proactive site inspections.");
  }

  const explanation = `Municipality health index rated ${letterGrade} (${healthScore}/100). Resolution rate is at ${Math.round(resolutionRatePct)}% with ${criticalPendingCount} critical backlog items pending.`;

  return {
    healthScore,
    letterGrade,
    trend,
    explanation,
    recommendations,
    metricsBreakdown: {
      resolutionRateScore,
      responseTimeScore,
      criticalBacklogScore,
      duplicateRateScore
    }
  };
}
