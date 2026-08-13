// NexCivic Explainable Severity Engine (Sprint 6.1)
import { Issue } from "../types";

export interface SeverityFactor {
  name: string;
  contribution: number;
  explanation: string;
}

export interface SeverityResult {
  score: number;
  level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  factors: SeverityFactor[];
}

const CATEGORY_WEIGHTS: Record<string, { weight: number; name: string }> = {
  Drainage: { weight: 35, name: "Drainage Overflow Hazard" },
  "Water Supply": { weight: 30, name: "Water Supply Contamination Risk" },
  Pothole: { weight: 25, name: "Road Infrastructure Damage" },
  Electricity: { weight: 25, name: "Electrical / Power Safety Risk" },
  Garbage: { weight: 20, name: "Sanitation & Waste Accumulation" },
  "Street Light": { weight: 15, name: "Public Lighting Failure" }
};

/**
 * Calculates an explainable dynamic severity score (0-100) with factor breakdowns
 */
export function calculateExplainableSeverity(issue: Partial<Issue>, allIssues: Partial<Issue>[] = []): SeverityResult {
  const factors: SeverityFactor[] = [];
  let totalScore = 0;

  // 1. Category Urgency Weight
  const catKey = issue.category || "Other";
  const catData = CATEGORY_WEIGHTS[catKey] || { weight: 15, name: `${catKey} Category Weight` };
  totalScore += catData.weight;
  factors.push({
    name: catData.name,
    contribution: catData.weight,
    explanation: `Assigned baseline urgency weight for category '${catKey}'`
  });

  // 2. Duplicate Report Amplification
  const duplicates = issue.communitySupportCount || 0;
  if (duplicates > 0) {
    const dupContrib = Math.min(duplicates * 5, 30);
    totalScore += dupContrib;
    factors.push({
      name: `${duplicates} Duplicate Reports`,
      contribution: dupContrib,
      explanation: `${duplicates} citizens confirmed this grievance (+5 per report, max 30)`
    });
  }

  // 3. Citizen Priority Selection
  const priorityMap: Record<string, number> = { Critical: 25, High: 18, Medium: 10, Low: 5 };
  const pWeight = priorityMap[issue.priority || "Medium"] || 10;
  totalScore += pWeight;
  factors.push({
    name: `Priority (${issue.priority || "Medium"})`,
    contribution: pWeight,
    explanation: `Citizen flagged report priority as '${issue.priority || "Medium"}'`
  });

  // 4. Complaint Age / Unresolved Duration
  if (issue.createdAt) {
    const createdMs = issue.createdAt.toMillis ? issue.createdAt.toMillis() : new Date(issue.createdAt).getTime();
    const ageHours = Math.max(0, (Date.now() - createdMs) / (1000 * 60 * 60));
    if (ageHours > 12) {
      const ageContrib = Math.min(Math.round(ageHours * 0.4), 20);
      totalScore += ageContrib;
      factors.push({
        name: `Unresolved Age (${Math.round(ageHours)}h)`,
        contribution: ageContrib,
        explanation: `Grievance has remained unresolved for ${Math.round(ageHours)} hours`
      });
    }
  }

  // 5. Spatial Density Factor (Nearby complaints within ~2km)
  if (typeof issue.latitude === "number" && typeof issue.longitude === "number" && allIssues.length > 0) {
    const nearby = allIssues.filter((other) => {
      if (other.uid === issue.uid || typeof other.latitude !== "number" || typeof other.longitude !== "number") return false;
      const dLat = Math.abs(other.latitude - (issue.latitude || 0));
      const dLng = Math.abs(other.longitude - (issue.longitude || 0));
      return dLat < 0.02 && dLng < 0.02; // ~2km bounding box
    }).length;

    if (nearby > 0) {
      const densityContrib = Math.min(nearby * 3, 15);
      totalScore += densityContrib;
      factors.push({
        name: `Nearby Complaint Density (${nearby} issues)`,
        contribution: densityContrib,
        explanation: `Located within a high-density cluster of ${nearby} nearby grievances`
      });
    }
  }

  const finalScore = Math.min(Math.max(Math.round(totalScore), 0), 100);

  let level: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
  if (finalScore >= 75) level = "CRITICAL";
  else if (finalScore >= 55) level = "HIGH";
  else if (finalScore >= 35) level = "MEDIUM";

  return {
    score: finalScore,
    level,
    factors
  };
}
