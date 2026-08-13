// NexCivic Centralized Notification Templates

export interface NotificationTemplateResult {
  title: string;
  body: string;
  type: string;
  priority: "Low" | "Medium" | "High" | "Critical";
}

export const NOTIFICATION_TEMPLATES = {
  NEW_COMPLAINT: (data: { complaintId: string; title: string; category: string; district: string }): NotificationTemplateResult => ({
    title: `New Grievance Filed: ${data.complaintId}`,
    body: `A new ${data.category} grievance "${data.title}" was submitted in ${data.district}.`,
    type: "NEW_COMPLAINT",
    priority: "High"
  }),

  COMPLAINT_ASSIGNED: (data: { complaintId: string; title: string; inspectorName: string }): NotificationTemplateResult => ({
    title: `Grievance Assigned: ${data.complaintId}`,
    body: `Grievance "${data.title}" has been assigned to Field Officer ${data.inspectorName}.`,
    type: "COMPLAINT_ASSIGNED",
    priority: "High"
  }),

  INSPECTION_STARTED: (data: { complaintId: string; title: string; inspectorName: string }): NotificationTemplateResult => ({
    title: `Physical Inspection Commenced: ${data.complaintId}`,
    body: `Field Officer ${data.inspectorName} has initiated physical inspection for "${data.title}".`,
    type: "INSPECTION_STARTED",
    priority: "Medium"
  }),

  INSPECTION_COMPLETED: (data: { complaintId: string; title: string; inspectorName: string }): NotificationTemplateResult => ({
    title: `Inspection Completed: ${data.complaintId}`,
    body: `Field Officer ${data.inspectorName} has submitted field inspection report for "${data.title}".`,
    type: "INSPECTION_COMPLETED",
    priority: "High"
  }),

  RESOLUTION_APPROVED: (data: { complaintId: string; title: string }): NotificationTemplateResult => ({
    title: `Resolution Approved: ${data.complaintId}`,
    body: `Grievance "${data.title}" has been verified and resolved by Municipality HQ.`,
    type: "RESOLUTION_APPROVED",
    priority: "Critical"
  }),

  STATUS_UPDATED: (data: { complaintId: string; title: string; newStatus: string; remarks?: string }): NotificationTemplateResult => ({
    title: `Status Updated: ${data.complaintId} (${data.newStatus})`,
    body: `Grievance "${data.title}" status changed to ${data.newStatus}.${data.remarks ? ` Remarks: ${data.remarks}` : ""}`,
    type: "STATUS_UPDATED",
    priority: "Medium"
  }),

  FEEDBACK_RECEIVED: (data: { complaintId: string; title: string; rating: number; citizenName: string }): NotificationTemplateResult => ({
    title: `Citizen Feedback Submitted: ${data.complaintId}`,
    body: `${data.citizenName} submitted a ${data.rating}★ rating for grievance "${data.title}".`,
    type: "FEEDBACK_RECEIVED",
    priority: "Medium"
  }),

  SYSTEM_NOTIFICATION: (data: { title: string; message: string }): NotificationTemplateResult => ({
    title: data.title,
    body: data.message,
    type: "SYSTEM_NOTIFICATION",
    priority: "Low"
  })
};
