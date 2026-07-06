import { PRIORITIES } from "./priorities";

// Expected Review times based on Complaint Priority
export const SLA_HOURS: Record<string, number> = {
  [PRIORITIES.HIGH]: 12,
  [PRIORITIES.MEDIUM]: 24,
  [PRIORITIES.LOW]: 48
};

export const getExpectedReviewTime = (priority: string): string => {
  const hours = SLA_HOURS[priority] || 24;
  return `${hours} Hours`;
};
