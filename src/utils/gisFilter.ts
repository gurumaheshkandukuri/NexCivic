// NexCivic Smart Spatial Filter Engine (Sprint 8.1)
import { Issue } from "../types";
import { calculateExplainableSeverity } from "../services/severityEngine";

export interface GISFilters {
  category?: string;
  status?: string;
  district?: string;
  ward?: string;
  inspectorUID?: string;
  priority?: string;
  severityLevel?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "ALL";
  dateRangeDays?: number;
}

/**
 * Multi-dimensional spatial & attribute filtering for GIS mapping
 */
export function filterGISComplaints(issues: Partial<Issue>[] = [], filters: GISFilters = {}): Partial<Issue>[] {
  const nowMs = Date.now();

  return issues.filter((issue) => {
    // Coordinate requirement for GIS map rendering
    if (typeof issue.latitude !== "number" || typeof issue.longitude !== "number") {
      return false;
    }

    // 1. Category Filter
    if (filters.category && filters.category !== "ALL" && issue.category !== filters.category) {
      return false;
    }

    // 2. Status Filter
    if (filters.status && filters.status !== "ALL" && issue.status !== filters.status) {
      return false;
    }

    // 3. District Filter
    if (filters.district && filters.district !== "ALL" && issue.district !== filters.district) {
      return false;
    }

    // 4. Ward Filter
    if (filters.ward && filters.ward !== "ALL" && issue.area !== filters.ward && issue.landmark !== filters.ward) {
      return false;
    }

    // 5. Inspector Filter
    if (filters.inspectorUID && filters.inspectorUID !== "ALL" && issue.assignedInspectorUID !== filters.inspectorUID) {
      return false;
    }

    // 6. Priority Filter
    if (filters.priority && filters.priority !== "ALL" && issue.priority !== filters.priority) {
      return false;
    }

    // 7. Severity Level Filter
    if (filters.severityLevel && filters.severityLevel !== "ALL") {
      const severity = calculateExplainableSeverity(issue, issues);
      if (severity.level !== filters.severityLevel) {
        return false;
      }
    }

    // 8. Date Range Filter
    if (filters.dateRangeDays && filters.dateRangeDays > 0 && issue.createdAt) {
      const createdMs = issue.createdAt.toMillis ? issue.createdAt.toMillis() : new Date(issue.createdAt).getTime();
      const ageDays = (nowMs - createdMs) / (1000 * 60 * 60 * 24);
      if (ageDays > filters.dateRangeDays) {
        return false;
      }
    }

    return true;
  });
}
