export const STATUS = {
  SUBMITTED: "Submitted",
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  INSPECTION_STARTED: "Inspection Started",
  INSPECTION_COMPLETED: "Inspection Completed",
  AWAITING_HQ_REVIEW: "Awaiting HQ Review",
  IN_PROGRESS: "In Progress",
  RECOMMENDED_RESOLUTION: "Recommended Resolution",
  RECOMMENDED_REJECTION: "Recommended Rejection",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
} as const;

export type StatusType = typeof STATUS[keyof typeof STATUS];

export function getStatusBadgeClass(status: string): string {
  const base = "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap border";
  switch (status) {
    case STATUS.SUBMITTED:
      return `${base} bg-slate-500/10 text-slate-300 border-slate-500/20`;
    case STATUS.ASSIGNED:
    case STATUS.ACCEPTED:
      return `${base} bg-indigo-500/10 text-indigo-300 border-indigo-500/20`;
    case STATUS.INSPECTION_STARTED:
    case STATUS.IN_PROGRESS:
      return `${base} bg-blue-500/10 text-blue-300 border-blue-500/20`;
    case STATUS.INSPECTION_COMPLETED:
    case STATUS.AWAITING_HQ_REVIEW:
    case STATUS.RECOMMENDED_RESOLUTION:
    case STATUS.RECOMMENDED_REJECTION:
      return `${base} bg-purple-500/10 text-purple-300 border-purple-500/20`;
    case STATUS.RESOLVED:
      return `${base} bg-emerald-500/10 text-emerald-300 border-emerald-500/20`;
    case STATUS.REJECTED:
      return `${base} bg-rose-500/10 text-rose-300 border-rose-500/20`;
    default:
      return `${base} bg-gray-500/10 text-gray-300 border-gray-500/20`;
  }
}

