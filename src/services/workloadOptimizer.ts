// NexCivic Inspector Workload & Burnout Intelligence Engine
import { Issue, UserProfile } from "../types";
import { STATUS } from "../constants/status";
import { calculateExplainableSeverity } from "./severityEngine";

export interface InspectorWorkloadMetrics {
  inspectorUID: string;
  inspectorName: string;
  assignedDistrict: string;
  currentLoad: number;
  criticalLoad: number;
  avgResponseTimeHours: number;
  resolutionPercentage: number;
  burnoutRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommendation?: string;
}

export interface WorkloadOptimizationResult {
  inspectors: InspectorWorkloadMetrics[];
  redistributionAdvised: boolean;
  globalSummary: string;
}

/**
 * Analyzes inspector workload, burnout risk, response times, and workload redistribution recommendations
 */
export function analyzeInspectorWorkload(
  issues: Partial<Issue>[] = [], 
  inspectors: UserProfile[] = []
): WorkloadOptimizationResult {
  const inspectorMetrics: InspectorWorkloadMetrics[] = inspectors
    .filter((user) => user.role === "FIELD_INSPECTOR")
    .map((inspector) => {
      const assignedIssues = issues.filter((i) => i.assignedInspectorUID === inspector.uid);
      const currentLoad = assignedIssues.filter((i) => i.status !== STATUS.RESOLVED && i.status !== STATUS.REJECTED).length;

      // Critical load count (issues with severity >= 75)
      const criticalLoad = assignedIssues.filter((i) => {
        if (i.status === STATUS.RESOLVED || i.status === STATUS.REJECTED) return false;
        return calculateExplainableSeverity(i, issues).score >= 75;
      }).length;

      // Resolution %
      const totalCount = assignedIssues.length;
      const resolvedCount = assignedIssues.filter((i) => i.status === STATUS.RESOLVED).length;
      const resolutionPercentage = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 100;

      // Avg Response Time (Hours)
      let totalHours = 0;
      let respCount = 0;
      assignedIssues.forEach((i) => {
        if (i.createdAt && i.inspectionStartedAt) {
          const startMs = i.createdAt.toMillis ? i.createdAt.toMillis() : new Date(i.createdAt).getTime();
          const endMs = i.inspectionStartedAt.toMillis ? i.inspectionStartedAt.toMillis() : new Date(i.inspectionStartedAt).getTime();
          totalHours += Math.max(0, (endMs - startMs) / (1000 * 60 * 60));
          respCount++;
        }
      });
      const avgResponseTimeHours = respCount > 0 ? Math.round(totalHours / respCount) : 24;

      // Burnout Risk Rating
      let burnoutRisk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
      if (currentLoad >= 12 || criticalLoad >= 5) burnoutRisk = "CRITICAL";
      else if (currentLoad >= 8 || criticalLoad >= 3) burnoutRisk = "HIGH";
      else if (currentLoad >= 5) burnoutRisk = "MEDIUM";

      // Redistribution recommendation
      let recommendation = "Workload balanced.";
      if (burnoutRisk === "CRITICAL") {
        recommendation = `High workload alert (${currentLoad} pending, ${criticalLoad} critical). Recommend reassigning ${Math.ceil(currentLoad / 3)} cases to nearby inspectors.`;
      } else if (burnoutRisk === "HIGH") {
        recommendation = `Moderate load capacity reached (${currentLoad} pending). Monitor dispatch queues.`;
      }

      return {
        inspectorUID: inspector.uid,
        inspectorName: inspector.name,
        assignedDistrict: inspector.assignedDistrict || "Unassigned",
        currentLoad,
        criticalLoad,
        avgResponseTimeHours,
        resolutionPercentage,
        burnoutRisk,
        recommendation
      };
    });

  const highRiskCount = inspectorMetrics.filter((m) => m.burnoutRisk === "CRITICAL" || m.burnoutRisk === "HIGH").length;
  const redistributionAdvised = highRiskCount > 0;

  const globalSummary = redistributionAdvised
    ? `${highRiskCount} field officer(s) are operating at critical or high capacity. Workload redistribution is recommended.`
    : "All field inspection officer workloads are balanced within normal operating parameters.";

  return {
    inspectors: inspectorMetrics,
    redistributionAdvised,
    globalSummary
  };
}
