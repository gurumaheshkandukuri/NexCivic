import { issueEvents, IssueEventPayload } from "./issueEvents";
import { NOTIFICATION_TEMPLATES } from "../constants/notificationTemplates";
import { createNotification, NotificationType } from "./notificationService";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../firebase-init";
import { ROLES } from "../constants/roles";

class NotificationWorkflowService {
  private initialized = false;
  private processedEvents = new Set<string>();

  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    console.log("[NotificationWorkflow] Initializing decoupled event listeners...");

    issueEvents.on("ISSUE_CREATED", this.handleIssueCreated.bind(this));
    issueEvents.on("INSPECTOR_ASSIGNED", this.handleInspectorAssigned.bind(this));
    issueEvents.on("INSPECTION_STARTED", this.handleInspectionStarted.bind(this));
    issueEvents.on("INSPECTION_COMPLETED", this.handleInspectionCompleted.bind(this));
    issueEvents.on("RESOLUTION_APPROVED", this.handleResolutionApproved.bind(this));
    issueEvents.on("ISSUE_REJECTED", this.handleStatusUpdated.bind(this));
    issueEvents.on("ISSUE_REOPENED", this.handleStatusUpdated.bind(this));
    issueEvents.on("STATUS_UPDATED", this.handleStatusUpdated.bind(this));
    issueEvents.on("FEEDBACK_SUBMITTED", this.handleFeedbackSubmitted.bind(this));
  }

  /**
   * Deduplication check: guarantees 1 notification per event execution
   */
  private isDuplicate(eventId: string): boolean {
    if (this.processedEvents.has(eventId)) return true;
    this.processedEvents.add(eventId);
    if (this.processedEvents.size > 1000) {
      const first = this.processedEvents.values().next().value;
      if (first) this.processedEvents.delete(first);
    }
    return false;
  }

  /**
   * Check if recipient user has enabled notification delivery for this category
   */
  private async isDeliveryEnabled(recipientUID: string, categoryKey: string): Promise<boolean> {
    if (!recipientUID || recipientUID === "MUNICIPALITY_HQ_ALL") return true;
    
    // Only attempt reading profile if recipient is current user to avoid permission errors
    const currentUID = auth.currentUser?.uid;
    if (recipientUID !== currentUID) {
      return true; // Default enabled for cross-user event notifications
    }

    try {
      const userDoc = await getDoc(doc(db, "users", recipientUID));
      if (userDoc.exists()) {
        const prefs = userDoc.data()?.notificationPreferences;
        if (prefs && typeof prefs[categoryKey] === "boolean") {
          return prefs[categoryKey];
        }
      }
    } catch (e) {
      // Return true on read failure
    }
    return true; // Default enabled
  }

  /**
   * Safe Dispatch Helper with Event Metadata and Expiration
   */
  private async dispatch(params: {
    eventId: string;
    recipientUID: string;
    recipientRole: string;
    templateResult: { title: string; body: string; type: string; priority: string };
    issueId: string;
    categoryKey: string;
    sourceEvent?: string;
    createdBy?: string;
    expiresAt?: any;
  }): Promise<void> {
    const isEnabled = await this.isDeliveryEnabled(params.recipientUID, params.categoryKey);
    
    // Always write notification history document (Audit Trail)
    await createNotification({
      recipientUID: params.recipientUID,
      recipientRole: params.recipientRole,
      title: params.templateResult.title,
      body: params.templateResult.body,
      type: params.templateResult.type as NotificationType,
      issueId: params.issueId,
      read: false,
      expiresAt: params.expiresAt || null,
      metadata: {
        eventId: params.eventId,
        issueId: params.issueId,
        createdBy: params.createdBy || "system",
        recipientUID: params.recipientUID,
        recipientRole: params.recipientRole,
        sourceEvent: params.sourceEvent || params.templateResult.type,
        priority: (params.templateResult.priority as any) || "MEDIUM",
        deliverySuppressed: !isEnabled
      }
    });
  }

  // --- EVENT HANDLERS ---

  private async handleIssueCreated(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.NEW_COMPLAINT({
      complaintId: payload.complaintId,
      title: payload.title,
      category: payload.category || "General",
      district: payload.district || "Local Region"
    });

    // Notify Municipality HQ role group
    await this.dispatch({
      eventId: `${payload.eventId}_hq`,
      recipientUID: "MUNICIPALITY_HQ_ALL",
      recipientRole: ROLES.MUNICIPALITY_HQ,
      templateResult: template,
      issueId: payload.issueId,
      categoryKey: "newComplaint",
      createdBy: payload.reportedByUID
    });

    // If auto-assigned to inspector, notify inspector
    if (payload.assignedInspectorUID) {
      const assignTemplate = NOTIFICATION_TEMPLATES.COMPLAINT_ASSIGNED({
        complaintId: payload.complaintId,
        title: payload.title,
        inspectorName: payload.assignedInspectorName || "Field Officer"
      });

      await this.dispatch({
        eventId: `${payload.eventId}_inspector`,
        recipientUID: payload.assignedInspectorUID,
        recipientRole: ROLES.FIELD_INSPECTOR,
        templateResult: assignTemplate,
        issueId: payload.issueId,
        categoryKey: "assignment",
        createdBy: payload.reportedByUID
      });
    }
  }

  private async handleInspectorAssigned(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;
    if (!payload.assignedInspectorUID) return;

    const template = NOTIFICATION_TEMPLATES.COMPLAINT_ASSIGNED({
      complaintId: payload.complaintId,
      title: payload.title,
      inspectorName: payload.assignedInspectorName || "Field Officer"
    });

    await this.dispatch({
      eventId: payload.eventId,
      recipientUID: payload.assignedInspectorUID,
      recipientRole: ROLES.FIELD_INSPECTOR,
      templateResult: template,
      issueId: payload.issueId,
      categoryKey: "assignment"
    });
  }

  private async handleInspectionStarted(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.INSPECTION_STARTED({
      complaintId: payload.complaintId,
      title: payload.title,
      inspectorName: payload.assignedInspectorName || "Field Officer"
    });

    if (payload.reportedByUID) {
      await this.dispatch({
        eventId: payload.eventId,
        recipientUID: payload.reportedByUID,
        recipientRole: ROLES.CITIZEN,
        templateResult: template,
        issueId: payload.issueId,
        categoryKey: "inspection",
        createdBy: payload.assignedInspectorUID
      });
    }
  }

  private async handleInspectionCompleted(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.INSPECTION_COMPLETED({
      complaintId: payload.complaintId,
      title: payload.title,
      inspectorName: payload.assignedInspectorName || "Field Officer"
    });

    await this.dispatch({
      eventId: payload.eventId,
      recipientUID: "MUNICIPALITY_HQ_ALL",
      recipientRole: ROLES.MUNICIPALITY_HQ,
      templateResult: template,
      issueId: payload.issueId,
      categoryKey: "inspection",
      createdBy: payload.assignedInspectorUID
    });
  }

  private async handleResolutionApproved(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.RESOLUTION_APPROVED({
      complaintId: payload.complaintId,
      title: payload.title
    });

    if (payload.reportedByUID) {
      await this.dispatch({
        eventId: `${payload.eventId}_citizen`,
        recipientUID: payload.reportedByUID,
        recipientRole: ROLES.CITIZEN,
        templateResult: template,
        issueId: payload.issueId,
        categoryKey: "approval"
      });
    }

    if (payload.assignedInspectorUID) {
      await this.dispatch({
        eventId: `${payload.eventId}_inspector`,
        recipientUID: payload.assignedInspectorUID,
        recipientRole: ROLES.FIELD_INSPECTOR,
        templateResult: template,
        issueId: payload.issueId,
        categoryKey: "approval"
      });
    }
  }

  private async handleStatusUpdated(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.STATUS_UPDATED({
      complaintId: payload.complaintId,
      title: payload.title,
      newStatus: payload.status || "Updated",
      remarks: payload.remarks
    });

    if (payload.reportedByUID) {
      await this.dispatch({
        eventId: payload.eventId,
        recipientUID: payload.reportedByUID,
        recipientRole: ROLES.CITIZEN,
        templateResult: template,
        issueId: payload.issueId,
        categoryKey: "system"
      });
    }
  }

  private async handleFeedbackSubmitted(payload: IssueEventPayload): Promise<void> {
    if (this.isDuplicate(payload.eventId)) return;

    const template = NOTIFICATION_TEMPLATES.FEEDBACK_RECEIVED({
      complaintId: payload.complaintId,
      title: payload.title,
      rating: payload.rating || 5,
      citizenName: payload.citizenName || "Citizen"
    });

    await this.dispatch({
      eventId: `${payload.eventId}_hq`,
      recipientUID: "MUNICIPALITY_HQ_ALL",
      recipientRole: ROLES.MUNICIPALITY_HQ,
      templateResult: template,
      issueId: payload.issueId,
      categoryKey: "feedback",
      createdBy: payload.reportedByUID
    });

    if (payload.assignedInspectorUID) {
      await this.dispatch({
        eventId: `${payload.eventId}_inspector`,
        recipientUID: payload.assignedInspectorUID,
        recipientRole: ROLES.FIELD_INSPECTOR,
        templateResult: template,
        issueId: payload.issueId,
        categoryKey: "feedback",
        createdBy: payload.reportedByUID
      });
    }
  }
}

export const notificationWorkflow = new NotificationWorkflowService();
