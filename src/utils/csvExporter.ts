import { Issue } from "../types";

/**
 * Safely parse Firebase Timestamp, ISO string, or number to JS Date object
 */
export function parseTimestamp(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }
  if (typeof timestamp === "string" || typeof timestamp === "number") {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return null;
}

/**
 * Formats a Date object to readable date string YYYY-MM-DD HH:mm
 */
export function formatDateString(timestamp: any): string {
  const d = parseTimestamp(timestamp);
  if (!d) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

/**
 * Safe CSV Cell Formatting: escapes quotes, commas, and newlines
 */
function formatCSVCell(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generic CSV Content Generator with UTF-8 BOM for Microsoft Excel compatibility
 */
export function generateCSV<T>(
  data: T[],
  headers: { key: string; label: string; formatter?: (item: T) => any }[]
): string {
  const bom = "\uFEFF"; // UTF-8 Byte Order Mark
  const headerRow = headers.map((h) => formatCSVCell(h.label)).join(",");
  const dataRows = data.map((item) =>
    headers
      .map((h) => {
        const val = h.formatter ? h.formatter(item) : (item as any)[h.key];
        return formatCSVCell(val);
      })
      .join(",")
  );

  return bom + [headerRow, ...dataRows].join("\r\n");
}

/**
 * Triggers Native Browser File Download
 */
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Filters Issues by Month and Year based on createdAt timestamp
 */
export function filterIssuesByMonth(issues: Issue[], year: number, monthIndex: number): Issue[] {
  return issues.filter((issue) => {
    const d = parseTimestamp(issue.createdAt);
    if (!d) return false;
    if (monthIndex === -1) {
      return d.getFullYear() === year; // All months in selected year
    }
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
}

/**
 * Month names for UI dropdown selectors and filenames
 */
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- ROLE-SPECIFIC CSV EXPORT IMPLEMENTATIONS (FIO & HQ ONLY) ---

export function exportFIOCSV(issues: Issue[], monthName: string, year: number): void {
  const headers = [
    { key: "complaintId", label: "Complaint ID" },
    { key: "createdAt", label: "Date Reported", formatter: (i: Issue) => formatDateString(i.createdAt) },
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "state", label: "State", formatter: (i: Issue) => i.state || "" },
    { key: "district", label: "District", formatter: (i: Issue) => i.district || "" },
    { key: "ulb", label: "ULB", formatter: (i: Issue) => i.ulb || "" },
    { key: "landmark", label: "Landmark", formatter: (i: Issue) => i.landmark || i.area || "" },
    { key: "status", label: "Status" },
    { key: "assignedInspectorName", label: "Assigned Officer", formatter: (i: Issue) => i.assignedInspectorName || "Unassigned" },
    { key: "inspectionStartedAt", label: "Inspection Started", formatter: (i: Issue) => formatDateString(i.inspectionStartedAt) },
    { key: "inspectionCompletedAt", label: "Inspection Completed", formatter: (i: Issue) => formatDateString(i.inspectionCompletedAt) },
    { key: "dateResolved", label: "Date Resolved", formatter: (i: Issue) => ((i.status as string) === "Resolved" || (i.status as string) === "RESOLVED") ? formatDateString(i.inspectionCompletedAt || i.updatedAt) : "" },
    { key: "workCompleted", label: "Work Completed", formatter: (i: Issue) => i.workCompleted || "" },
    { key: "resolutionRemarks", label: "Resolution Remarks", formatter: (i: Issue) => i.recommendationRemarks || i.inspectionRemarks || "" }
  ];

  const content = generateCSV(issues, headers);
  const fileName = `NexCivic_FIO_Report_${monthName}_${year}.csv`;
  downloadCSV(content, fileName);
}

export function exportHQCSV(issues: Issue[], monthName: string, year: number): void {
  const headers = [
    { key: "complaintId", label: "Complaint ID" },
    { key: "createdAt", label: "Date Reported", formatter: (i: Issue) => formatDateString(i.createdAt) },
    { key: "state", label: "State", formatter: (i: Issue) => i.state || "" },
    { key: "district", label: "District", formatter: (i: Issue) => i.district || "" },
    { key: "ulb", label: "ULB", formatter: (i: Issue) => i.ulb || "" },
    { key: "category", label: "Category" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "assignedInspectorName", label: "Assigned Officer", formatter: (i: Issue) => i.assignedInspectorName || "Unassigned" },
    { key: "inspectionStartedAt", label: "Inspection Started", formatter: (i: Issue) => formatDateString(i.inspectionStartedAt) },
    { key: "inspectionCompletedAt", label: "Inspection Completed", formatter: (i: Issue) => formatDateString(i.inspectionCompletedAt) },
    { key: "dateResolved", label: "Date Resolved", formatter: (i: Issue) => ((i.status as string) === "Resolved" || (i.status as string) === "RESOLVED") ? formatDateString(i.inspectionCompletedAt || i.updatedAt) : "" },
    { key: "estimatedCost", label: "Estimated Cost", formatter: (i: Issue) => i.estimatedCost || "" },
    { key: "materialsUsed", label: "Materials Used", formatter: (i: Issue) => i.materialsUsed || "" },
    { key: "resolutionRemarks", label: "Resolution Remarks", formatter: (i: Issue) => i.recommendationRemarks || i.inspectionRemarks || "" }
  ];

  const content = generateCSV(issues, headers);
  const fileName = `NexCivic_HQ_Report_${monthName}_${year}.csv`;
  downloadCSV(content, fileName);
}
