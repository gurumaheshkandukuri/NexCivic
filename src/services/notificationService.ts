// NexCivic Notification Service (Sprint 4B Hardened Production Infrastructure)
import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  startAfter,
  onSnapshot, 
  serverTimestamp, 
  writeBatch,
  addDoc,
  DocumentSnapshot
} from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "../firebase-init";

export type NotificationType = 
  | "NEW_COMPLAINT"
  | "COMPLAINT_ASSIGNED"
  | "INSPECTION_STARTED"
  | "INSPECTION_COMPLETED"
  | "RESOLUTION_APPROVED"
  | "STATUS_UPDATED"
  | "FEEDBACK_RECEIVED"
  | "SYSTEM_NOTIFICATION";

export type NotificationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface NotificationPayload {
  notificationId?: string;
  recipientUID: string;
  recipientRole?: string;
  title: string;
  body: string;
  type: NotificationType;
  issueId?: string;
  read?: boolean;
  createdAt?: any;
  expiresAt?: any;
  metadata?: {
    eventId?: string;
    issueId?: string;
    createdBy?: string;
    recipientUID?: string;
    recipientRole?: string;
    sourceEvent?: string;
    priority?: NotificationPriority;
    deliverySuppressed?: boolean;
    [key: string]: any;
  };
}

/**
 * Persistent Deduplication Check: Queries Firestore to verify if eventId was already dispatched to recipient
 */
export async function hasEventBeenDispatched(eventId: string, recipientUID: string): Promise<boolean> {
  if (!eventId || !recipientUID) return false;
  
  // Security guard: only query deduplication if recipient matches current user or broadcast or authorized
  const currentUID = auth.currentUser?.uid;
  if (recipientUID !== currentUID && recipientUID !== "MUNICIPALITY_HQ_ALL") {
    return false;
  }

  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientUID", "==", recipientUID),
      where("metadata.eventId", "==", eventId),
      firestoreLimit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  } catch (err) {
    return false;
  }
}

/**
 * Create a new notification document in Firestore with metadata & expiration support
 */
export async function createNotification(payload: NotificationPayload): Promise<string | null> {
  const path = "notifications";
  try {
    // Persistent deduplication check
    if (payload.metadata?.eventId) {
      const alreadySent = await hasEventBeenDispatched(payload.metadata.eventId, payload.recipientUID);
      if (alreadySent) {
        console.log(`[NotificationService] Persistent deduplication: Blocked duplicate event ${payload.metadata.eventId}`);
        return null;
      }
    }

    const docData = {
      recipientUID: payload.recipientUID,
      userUID: payload.recipientUID, // backward compatibility
      recipientRole: payload.recipientRole || "CITIZEN",
      title: payload.title,
      message: payload.body, // backward compatibility
      body: payload.body,
      type: payload.type,
      issueId: payload.issueId || "",
      relatedComplaintId: payload.issueId || "",
      read: false,
      createdAt: serverTimestamp(),
      expiresAt: payload.expiresAt || null,
      metadata: {
        eventId: payload.metadata?.eventId || `evt_${Date.now()}`,
        issueId: payload.issueId || "",
        createdBy: payload.metadata?.createdBy || "system",
        recipientUID: payload.recipientUID,
        recipientRole: payload.recipientRole || "CITIZEN",
        sourceEvent: payload.metadata?.sourceEvent || payload.type,
        priority: payload.metadata?.priority || "MEDIUM",
        deliverySuppressed: payload.metadata?.deliverySuppressed || false,
        ...(payload.metadata || {})
      }
    };

    const docRef = await addDoc(collection(db, "notifications"), docData);
    console.log(`[NotificationService] Created notification ${docRef.id} for recipient ${payload.recipientUID}`);
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<void> {
  if (!notificationId) return;
  const path = `notifications/${notificationId}`;
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Mark all unread notifications for a user as read
 */
export async function markAllAsRead(recipientUID: string): Promise<void> {
  if (!recipientUID) return;
  const path = "notifications";
  try {
    const q = query(
      collection(db, "notifications"), 
      where("recipientUID", "==", recipientUID), 
      where("read", "==", false)
    );
    const snap = await getDocs(q);

    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), {
        read: true,
        readAt: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a notification document
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  if (!notificationId) return;
  const path = `notifications/${notificationId}`;
  try {
    await deleteDoc(doc(db, "notifications", notificationId));
    console.log(`[NotificationService] Deleted notification ${notificationId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Realtime subscription with initial 50-item limit, expiration filtering, and Browser Notification API
 */
export function subscribeNotifications(
  recipientUID: string, 
  callback: (notifications: NotificationPayload[], unreadCount: number, lastSnap: DocumentSnapshot | null) => void,
  pageSize: number = 50
) {
  if (!recipientUID) return () => {};
  const path = "notifications";
  let isFirstLoad = true;

  try {
    const q = query(
      collection(db, "notifications"), 
      where("recipientUID", "==", recipientUID), 
      orderBy("createdAt", "desc"),
      firestoreLimit(pageSize)
    );

    return onSnapshot(q, (snap) => {
      const nowMs = Date.now();
      const lastSnap = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

      const items: NotificationPayload[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            notificationId: d.id,
            recipientUID: data.recipientUID || data.userUID || "",
            recipientRole: data.recipientRole || "CITIZEN",
            title: data.title || "Notification",
            body: data.body || data.message || "",
            type: data.type || "SYSTEM_NOTIFICATION",
            issueId: data.issueId || data.relatedComplaintId || "",
            read: data.read ?? false,
            createdAt: data.createdAt,
            expiresAt: data.expiresAt,
            metadata: data.metadata || {}
          };
        })
        // Filter out expired notifications
        .filter((item) => {
          if (!item.expiresAt) return true;
          const expMs = item.expiresAt.toMillis ? item.expiresAt.toMillis() : new Date(item.expiresAt).getTime();
          return expMs > nowMs;
        });

      const unreadCount = items.filter((item) => !item.read).length;

      // Trigger Browser Notification API for new incoming items (if permission granted)
      if (!isFirstLoad && Notification.permission === "granted") {
        snap.docChanges().forEach((change) => {
          if (change.type === "added") {
            const newNotif = change.doc.data();
            try {
              new Notification(newNotif.title || "NexCivic Alert", {
                body: newNotif.body || newNotif.message || "",
                icon: "/icon-192.png",
                badge: "/favicon.ico"
              });
            } catch (e) {
              console.warn("[NotificationService] Browser Notification API trigger error:", e);
            }
          }
        });
      }

      isFirstLoad = false;
      callback(items, unreadCount, lastSnap);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Pagination helper to load older notification pages
 */
export async function loadMoreNotifications(
  recipientUID: string, 
  lastSnap: DocumentSnapshot,
  pageSize: number = 20
): Promise<{ items: NotificationPayload[]; newLastSnap: DocumentSnapshot | null }> {
  if (!recipientUID || !lastSnap) return { items: [], newLastSnap: null };
  try {
    const q = query(
      collection(db, "notifications"),
      where("recipientUID", "==", recipientUID),
      orderBy("createdAt", "desc"),
      startAfter(lastSnap),
      firestoreLimit(pageSize)
    );
    const snap = await getDocs(q);
    const nowMs = Date.now();
    const newLastSnap = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

    const items: NotificationPayload[] = snap.docs
      .map((d) => {
        const data = d.data();
        return {
          notificationId: d.id,
          recipientUID: data.recipientUID || data.userUID || "",
          recipientRole: data.recipientRole || "CITIZEN",
          title: data.title || "Notification",
          body: data.body || data.message || "",
          type: data.type || "SYSTEM_NOTIFICATION",
          issueId: data.issueId || data.relatedComplaintId || "",
          read: data.read ?? false,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          metadata: data.metadata || {}
        };
      })
      .filter((item) => {
        if (!item.expiresAt) return true;
        const expMs = item.expiresAt.toMillis ? item.expiresAt.toMillis() : new Date(item.expiresAt).getTime();
        return expMs > nowMs;
      });

    return { items, newLastSnap };
  } catch (err) {
    return { items: [], newLastSnap: null };
  }
}

/**
 * Get count of unread notifications
 */
export async function getUnreadCount(recipientUID: string): Promise<number> {
  if (!recipientUID) return 0;
  try {
    const q = query(
      collection(db, "notifications"), 
      where("recipientUID", "==", recipientUID), 
      where("read", "==", false)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    return 0;
  }
}

// Backwards-compatibility Aliases & Helpers
export const markNotificationAsRead = markAsRead;
export const markAllNotificationsAsRead = markAllAsRead;
export const subscribeToNotifications = (
  userId: string, 
  callback: (notifications: any[], metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void
) => {
  return subscribeNotifications(userId, (items) => {
    callback(items, { hasPendingWrites: false, fromCache: false });
  });
};

export function getAdvancedNotificationPayload(params: any): any {
  return {
    targetUID: params.targetUID,
    userUID: params.targetUID,
    recipientUID: params.targetUID,
    title: params.title,
    message: params.message || params.body,
    body: params.body || params.message,
    type: params.type || "SYSTEM_NOTIFICATION",
    category: params.category || "SYSTEM",
    severity: params.severity || "medium",
    version: 1,
    read: false,
    deliveryStatus: "pending",
    createdAt: serverTimestamp(),
    expiresAt: params.expiresAt || null,
    metadata: {
      eventId: params.metadata?.eventId || `evt_${Date.now()}`,
      issueId: params.relatedComplaintId || params.complaintUID || "",
      createdBy: params.actorUID || "system",
      recipientUID: params.targetUID,
      recipientRole: "CITIZEN",
      sourceEvent: params.type || "SYSTEM",
      priority: params.severity === "high" ? "HIGH" : "MEDIUM",
      ...(params.metadata || {})
    }
  };
}
