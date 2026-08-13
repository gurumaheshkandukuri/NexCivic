// NexCivic Spatial Cluster & Heatmap Intelligence Engine
import { Issue } from "../types";
import { calculateExplainableSeverity } from "./severityEngine";

export interface HeatmapCluster {
  clusterId: string;
  centerLat: number;
  centerLng: number;
  complaintCount: number;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  averageSeverity: number;
  dominantCategory: string;
  clusterRadiusKm: number;
  populationEstimate: number;
  priorityRank: number;
  issues: Partial<Issue>[];
}

/**
 * Calculates Haversine distance between two lat/lng coordinates in kilometers
 */
export function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Clusters nearby complaints spatially using distance threshold (default 2km)
 */
export function generateHeatmapClusters(issues: Partial<Issue>[] = [], radiusKm: number = 2.0): HeatmapCluster[] {
  const validIssues = issues.filter((i) => typeof i.latitude === "number" && typeof i.longitude === "number");
  if (validIssues.length === 0) return [];

  const visited = new Set<string>();
  const rawClusters: Partial<Issue>[][] = [];

  for (const issue of validIssues) {
    const issueId = issue.uid || `${issue.latitude}_${issue.longitude}`;
    if (visited.has(issueId)) continue;

    const currentCluster: Partial<Issue>[] = [issue];
    visited.add(issueId);

    for (const other of validIssues) {
      const otherId = other.uid || `${other.latitude}_${other.longitude}`;
      if (visited.has(otherId)) continue;

      const dist = getHaversineDistanceKm(
        issue.latitude!,
        issue.longitude!,
        other.latitude!,
        other.longitude!
      );

      if (dist <= radiusKm) {
        currentCluster.push(other);
        visited.add(otherId);
      }
    }

    rawClusters.push(currentCluster);
  }

  // Format clusters with intelligent metrics
  const clusters: HeatmapCluster[] = rawClusters.map((group, idx) => {
    const complaintCount = group.length;
    const centerLat = group.reduce((sum, i) => sum + i.latitude!, 0) / complaintCount;
    const centerLng = group.reduce((sum, i) => sum + i.longitude!, 0) / complaintCount;

    // Severity scores
    const severities = group.map((i) => calculateExplainableSeverity(i, issues).score);
    const averageSeverity = Math.round(severities.reduce((sum, s) => sum + s, 0) / complaintCount);

    // Dominant Category
    const catMap: Record<string, number> = {};
    group.forEach((i) => {
      const cat = i.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const dominantCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "General";

    // Risk Level
    let riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" = "LOW";
    if (averageSeverity >= 75 || complaintCount >= 10) riskLevel = "CRITICAL";
    else if (averageSeverity >= 55 || complaintCount >= 5) riskLevel = "HIGH";
    else if (averageSeverity >= 35) riskLevel = "MEDIUM";

    // Population Estimate (Estimated ~150 residents per complaint cluster density)
    const populationEstimate = complaintCount * 180;

    return {
      clusterId: `cluster_${idx + 1}_${Math.round(centerLat * 1000)}_${Math.round(centerLng * 1000)}`,
      centerLat,
      centerLng,
      complaintCount,
      riskLevel,
      averageSeverity,
      dominantCategory,
      clusterRadiusKm: radiusKm,
      populationEstimate,
      priorityRank: 0,
      issues: group
    };
  });

  // Sort and rank clusters by severity & complaint volume
  clusters.sort((a, b) => (b.averageSeverity * b.complaintCount) - (a.averageSeverity * a.complaintCount));
  clusters.forEach((c, idx) => {
    c.priorityRank = idx + 1;
  });

  return clusters;
}
