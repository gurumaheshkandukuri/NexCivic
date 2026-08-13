// Decoupled Lifecycle Event Emitter for NexCivic
export type IssueEventType = 
  | "ISSUE_CREATED"
  | "INSPECTOR_ASSIGNED"
  | "INSPECTION_STARTED"
  | "INSPECTION_COMPLETED"
  | "RESOLUTION_APPROVED"
  | "ISSUE_REJECTED"
  | "ISSUE_REOPENED"
  | "FEEDBACK_SUBMITTED"
  | "STATUS_UPDATED";

export interface IssueEventPayload {
  eventId: string;
  eventType: IssueEventType;
  issueId: string;
  complaintId: string;
  title: string;
  category?: string;
  district?: string;
  state?: string;
  reportedByUID?: string;
  assignedInspectorUID?: string;
  assignedInspectorName?: string;
  status?: string;
  remarks?: string;
  rating?: number;
  citizenName?: string;
  timestamp: number;
}

type EventCallback = (payload: IssueEventPayload) => void;

class IssueEventEmitter {
  private listeners: Map<IssueEventType, Set<EventCallback>> = new Map();

  on(eventType: IssueEventType, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  emit(eventType: IssueEventType, payload: Omit<IssueEventPayload, "eventId" | "eventType" | "timestamp">): void {
    const fullPayload: IssueEventPayload = {
      ...payload,
      eventType,
      eventId: `evt_${eventType}_${payload.issueId}_${Date.now()}`,
      timestamp: Date.now()
    };

    console.log(`[IssueEvents] Emitting event ${eventType} for complaint ${payload.complaintId || payload.issueId}`);
    
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach((cb) => {
        try {
          cb(fullPayload);
        } catch (err) {
          console.error(`[IssueEvents] Error in event listener for ${eventType}:`, err);
        }
      });
    }

    // Also dispatch to window for external integration/tests
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("nexcivic-issue-event", { detail: fullPayload }));
    }
  }
}

export const issueEvents = new IssueEventEmitter();
