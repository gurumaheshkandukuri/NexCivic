// NexCivic Explainable Priority Engine (Sprint 6.1)
import { Issue } from "../types";
import { calculateExplainableSeverity } from "./severityEngine";

export interface PriorityRecommendationResult {
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number; // 0-100%
  reasons: string[];
  supportingMetrics: {
    severityScore: number;
    duplicateCount: number;
    ageHours: number;
    nearbyDensity: number;
  };
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

/**
 * Recommends priority level with confidence score, risk assessment, and human-readable reasons
 */
export function recommendExplainablePriority(
  issue: Partial<Issue>, 
  allIssues: Partial<Issue>[] = []
): PriorityRecommendationResult {
  const severityResult = calculateExplainableSeverity(issue, allIssues);
  const reasons: string[] = [];
  const duplicates = issue.communitySupportCount || 0;

  let ageHours = 0;
  if (issue.createdAt) {
    const createdMs = issue.createdAt.toMillis ? issue.createdAt.toMillis() : new Date(issue.createdAt).getTime();
    ageHours = Math.max(0, Math.round((Date.now() - createdMs) / (1000 * 60 * 60)));
  }

  let nearbyDensity = 0;
  if (typeof issue.latitude === "number" && typeof issue.longitude === "number") {
    nearbyDensity = allIssues.filter((o) => {
      if (o.uid === issue.uid || typeof o.latitude !== "number" || typeof o.longitude !== "number") return false;
      return Math.abs(o.latitude - (issue.latitude || 0)) < 0.02 && Math.abs(o.longitude - (issue.longitude || 0)) < 0.02;
    }).length;
  }

  // Generate explainable reasons
  if (["Drainage", "Water Supply", "Pothole"].includes(issue.category || "")) {
    reasons.push(`High-impact category: ${issue.category}`);
  }

  if (duplicates >= 5) {
    reasons.push(`${duplicates} citizens reported this issue in community feed`);
  }

  if (ageHours >= 48) {
    reasons.push(`Unresolved backlog for ${ageHours} hours`);
  }

  if (nearbyDensity >= 3) {
    reasons.push(`Part of a cluster with ${nearbyDensity} nearby grievances`);
  }

  if (reasons.length === 0) {
    reasons.push(`Baseline evaluation for ${issue.category || "General"} report`);
  }

  let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let confidence = 85;

  if (severityResult.score >= 75) {
    priority = "CRITICAL";
    confidence = 94;
  } else if (severityResult.score >= 55) {
    priority = "HIGH";
    confidence = 89;
  } else if (severityResult.score >= 35) {
    priority = "MEDIUM";
    confidence = 82;
  } else {
    priority = "LOW";
    confidence = 78;
  }

  return {
    priority,
    confidence,
    reasons,
    supportingMetrics: {
      severityScore: severityResult.score,
      duplicateCount: duplicates,
      ageHours,
      nearbyDensity
    },
    riskLevel: priority
  };
}
