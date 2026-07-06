import { Issue, TimelineItem } from "../../types";

export function getTimestampMs(ts: any): number {
  if (!ts) return Date.now();
  if (ts.seconds) return ts.seconds * 1000;
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'string') return new Date(ts).getTime();
  if (ts instanceof Date) return ts.getTime();
  return Date.now();
}

export function calculateDurationInHours(startTs: any, endTs: any): number {
  if (!startTs || !endTs) return 0;
  const start = getTimestampMs(startTs);
  const end = getTimestampMs(endTs);
  if (start >= end) return 0;
  return (end - start) / (1000 * 60 * 60);
}

export function calculateDurationInDays(startTs: any, endTs: any): number {
  return calculateDurationInHours(startTs, endTs) / 24;
}

export function getTimelineStatusTime(timeline: TimelineItem[] | undefined, status: string): number | null {
  if (!timeline) return null;
  const item = timeline.find(t => t.status === status);
  if (!item) return null;
  return getTimestampMs(item.timestamp);
}

export function calculateResolutionTimeDays(issue: Issue): number | null {
  const start = getTimestampMs(issue.createdAt);
  const resolvedStatusTime = getTimelineStatusTime(issue.timeline, "Resolved") || getTimestampMs(issue.updatedAt);
  if (issue.status === "Resolved") {
    return calculateDurationInDays(start, resolvedStatusTime);
  }
  return null;
}

export function calculateInspectionDurationHours(issue: Issue): number | null {
  const start = getTimelineStatusTime(issue.timeline, "Inspection_Started");
  const end = getTimelineStatusTime(issue.timeline, "Inspection_Completed");
  if (start && end) {
    return calculateDurationInHours(start, end);
  }
  return null;
}

export function groupIssuesByMonth(issues: Issue[]): Record<string, Issue[]> {
  const groups: Record<string, Issue[]> = {};
  issues.forEach(issue => {
    const d = new Date(getTimestampMs(issue.createdAt));
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(issue);
  });
  return groups;
}

export function calculateSuccessRate(resolvedCount: number, totalHandled: number): number {
  if (totalHandled === 0) return 0;
  return Math.round((resolvedCount / totalHandled) * 100);
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

export function countByField(issues: Issue[], field: keyof Issue): Record<string, number> {
  const counts: Record<string, number> = {};
  issues.forEach(issue => {
    const val = String(issue[field] || 'Unknown');
    counts[val] = (counts[val] || 0) + 1;
  });
  return counts;
}

export const COLORS = {
  submitted: "#3b82f6", // blue-500
  pending: "#f59e0b", // amber-500
  resolved: "#10b981", // emerald-500
  rejected: "#ef4444", // red-500
  assigned: "#6366f1", // indigo-500
  accepted: "#8b5cf6", // violet-500
  awaiting_hq: "#ec4899", // pink-500
};

export const PRIORITY_COLORS: Record<string, string> = {
  Low: "#34d399", // emerald-400
  Medium: "#fbbf24", // amber-400
  High: "#f87171", // red-400
  Critical: "#dc2626" // red-600
};
