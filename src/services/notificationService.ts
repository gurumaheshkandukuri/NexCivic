import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  writeBatch,
  addDoc
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase-init";
import { Notification } from "../types";

export async function createNotification(
  userId: string, 
  title: string,
  message: string, 
  type: string,
  actionRoute?: string,
  relatedComplaintId?: string
): Promise<void> {
  const path = "notifications";
  try {
    const payload = getAdvancedNotificationPayload({
      targetUID: userId,
      title,
      message,
      type,
      actionRoute,
      relatedComplaintId,
    });
    
    await addDoc(collection(db, "notifications"), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function getAdvancedNotificationPayload(params: {
  targetUID: string;
  title: string;
  message: string;
  type: string;
  category?: string;
  severity?: string;
  actorUID?: string;
  complaintUID?: string;
  complaintId?: string;
  state?: string;
  district?: string;
  metadata?: Record<string, unknown>;
  actionRoute?: string;
  relatedComplaintId?: string;
}): Partial<Notification> {
  return {
    targetUID: params.targetUID,
    userUID: params.targetUID, // for backward compatibility in queries
    title: params.title,
    message: params.message,
    type: params.type,
    category: (params.category as any) || "SYSTEM",
    severity: (params.severity as any) || "medium",
    version: 1,
    read: false,
    deliveryStatus: "pending",
    createdAt: serverTimestamp(),
    ...(params.actorUID && { actorUID: params.actorUID }),
    ...(params.complaintUID && { complaintUID: params.complaintUID }),
    ...(params.complaintId && { complaintId: params.complaintId }),
    ...(params.state && { state: params.state }),
    ...(params.district && { district: params.district }),
    ...(params.metadata && { metadata: params.metadata }),
    ...(params.actionRoute && { actionRoute: params.actionRoute }),
    ...(params.relatedComplaintId && { relatedComplaintId: params.relatedComplaintId }),
  };
}

export function subscribeToNotifications(userId: string, callback: (notifications: Notification[], metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void) {
  if (userId === undefined) return () => {};
  const path = "notifications";
  try {
    const q = query(collection(db, "notifications"), where("userUID", "==", userId), orderBy("createdAt", "desc"));
    return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      callback(snap.docs.map(d => ({ notificationId: d.id, ...d.data() } as Notification)), {
        hasPendingWrites: snap.metadata.hasPendingWrites,
        fromCache: snap.metadata.fromCache
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await updateDoc(doc(db, "notifications", notifId), {
      read: true,
      readAt: serverTimestamp(),
      deliveryStatus: "read"
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (userId === undefined) return;
  const path = "notifications";
  try {
    const q = query(collection(db, "notifications"), where("userUID", "==", userId), where("read", "==", false));
    const snap = await getDocs(q);
    
    if (snap.empty) return;

    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { 
        read: true, 
        readAt: serverTimestamp(),
        deliveryStatus: "read"
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
