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
