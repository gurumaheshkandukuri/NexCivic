// NexCivic GIS Layer & Dynamic Heatmap Engine (Sprint 8.1)
import { Issue } from "../types";
import { STATUS } from "../constants/status";
import { calculateExplainableSeverity } from "./severityEngine";

export type GISLayerType = 
  | "ALL"
  | "ROAD_DAMAGE"
  | "GARBAGE"
  | "DRAINAGE"
  | "WATER_SUPPLY"
  | "STREET_LIGHTS"
  | "CRITICAL_ISSUES"
  | "RESOLVED"
  | "PENDING";

export interface WeightedHeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number; // 0.0 to 1.0 intensity
  issueId: string;
  category: string;
  severityScore: number;
}

/**
 * Filters complaint issues by active GIS Layer Type
 */
export function getGISLayerData(issues: Partial<Issue>[] = [], layerType: GISLayerType = "ALL"): Partial<Issue>[] {
  const valid = issues.filter((i) => typeof i.latitude === "number" && typeof i.longitude === "number");

  switch (layerType) {
    case "ROAD_DAMAGE":
      return valid.filter((i) => i.category === "Road Damage" || i.category === "Pothole");
    case "GARBAGE":
      return valid.filter((i) => i.category === "Garbage" || i.category === "Sanitation");
    case "DRAINAGE":
      return valid.filter((i) => i.category === "Drainage");
    case "WATER_SUPPLY":
      return valid.filter((i) => i.category === "Water Supply");
    case "STREET_LIGHTS":
      return valid.filter((i) => i.category === "Street Light" || i.category === "Electricity");
    case "CRITICAL_ISSUES":
      return valid.filter((i) => calculateExplainableSeverity(i, issues).score >= 75);
    case "RESOLVED":
      return valid.filter((i) => i.status === STATUS.RESOLVED);
    case "PENDING":
      return valid.filter((i) => i.status !== STATUS.RESOLVED && i.status !== STATUS.REJECTED);
    case "ALL":
    default:
      return valid;
  }
}

/**
 * Computes dynamic spatial heatmap points weighted by Severity, Age, Density, and Priority
 */
export function generateWeightedHeatmapPoints(issues: Partial<Issue>[] = []): WeightedHeatmapPoint[] {
  const valid = issues.filter((i) => typeof i.latitude === "number" && typeof i.longitude === "number");
  const nowMs = Date.now();

  return valid.map((issue) => {
    // 1. Severity Weight (40% contribution)
    const severityScore = calculateExplainableSeverity(issue, issues).score; // 0-100
    const severityFactor = severityScore / 100;

    // 2. Complaint Age Factor (30% contribution)
    let ageFactor = 0.5;
    if (issue.createdAt) {
      const createdMs = issue.createdAt.toMillis ? issue.createdAt.toMillis() : new Date(issue.createdAt).getTime();
      const ageHours = Math.max(0, (nowMs - createdMs) / (1000 * 60 * 60));
      ageFactor = Math.min(ageHours / 72, 1.0); // max out at 72h
    }

    // 3. Priority Factor (20% contribution)
    const priorityWeights: Record<string, number> = { Critical: 1.0, High: 0.8, Medium: 0.5, Low: 0.3 };
    const priorityFactor = priorityWeights[issue.priority || "Medium"] || 0.5;

    // 4. Duplicate Density Factor (10% contribution)
    const duplicates = issue.communitySupportCount || 0;
    const densityFactor = Math.min(duplicates / 10, 1.0);

    // Compute composite weight (0.1 to 1.0)
    const rawWeight = (
      severityFactor * 0.40 +
      ageFactor * 0.30 +
      priorityFactor * 0.20 +
      densityFactor * 0.10
    );

    const weight = Math.round(Math.min(Math.max(rawWeight, 0.1), 1.0) * 100) / 100;

    return {
      latitude: issue.latitude!,
      longitude: issue.longitude!,
      weight,
      issueId: issue.uid || issue.complaintId || "N/A",
      category: issue.category || "Other",
      severityScore
    };
  });
}
