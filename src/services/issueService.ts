import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  arrayUnion, 
  serverTimestamp, 
  writeBatch,
  runTransaction,
  getDocs,
  limit
} from "firebase/firestore";
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, uploadString } from "firebase/storage";
import { db, storage, OperationType, handleFirestoreError } from "../firebase-init";
import { Issue, UserProfile, TimelineItem, Comment } from "../types";
import { ROLES } from "../constants/roles";
import { STATUS } from "../constants/status";
import { createNotification, getAdvancedNotificationPayload } from "./notificationService";
import { createActivityLog } from "./userService";

import { stateCodes, districtCodes } from "../constants/locations";

export async function createIssue(issueData: Partial<Issue>): Promise<{ id: string, complaintId: string, assignedInspectorName: string | null } | undefined> {
  const path = "issues";
  try {
    // 1. Auto Assignment Lookup (Must happen before transaction)
    let assignedInspectorUID = null;
    let assignedInspectorName = null;
    let assignedInspectorEmail = null;

    const stateCode = stateCodes[issueData.state || ""] || "XX";
    const districtCode = districtCodes[issueData.district || ""] || "XXX";

    if (issueData.state && issueData.district) {
      const q = query(
        collection(db, "users"),
        where("role", "==", "FIELD_INSPECTOR"),
        where("assignedState", "==", issueData.state),
        where("assignedDistrict", "==", issueData.district),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const inspectorData = querySnapshot.docs[0].data();
        assignedInspectorUID = inspectorData.uid;
        assignedInspectorName = inspectorData.name;
        assignedInspectorEmail = inspectorData.email;
      }
    }

    // 2. Transaction for Complaint ID Generation and Issue Creation
    const counterDocId = `${stateCode}_${districtCode}`;
    const counterDocRef = doc(db, "counters", counterDocId);
    const newIssueRef = doc(collection(db, "issues"));
    const id = newIssueRef.id;

    let complaintId = "";
    let seq = 1;
    const year = new Date().getFullYear();

    await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      
      if (!counterDoc.exists()) {
        seq = 1;
      } else {
        seq = (counterDoc.data().currentSequence || 0) + 1;
      }
      
      // NC-YYYY-STATECODE-DISTRICTCODE-000001
      const paddedSeq = String(seq).padStart(6, "0");
      complaintId = `NC-${year}-${stateCode}-${districtCode}-${paddedSeq}`;

      transaction.set(counterDocRef, {
        currentSequence: seq,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const nowTs = Date.now();
      const initialTimeline: TimelineItem[] = [
        {
          id: `${nowTs}_1_${issueData.reportedByUID || "system"}`,
          status: STATUS.SUBMITTED,
          updatedByUID: issueData.reportedByUID || "system",
          updatedByName: issueData.reportedByName || "System",
          updatedByRole: ROLES.CITIZEN,
          remarks: "Issue submitted by citizen.",
          timestamp: new Date().toISOString()
        },
        {
          id: `${nowTs}_2_system`,
          status: STATUS.SUBMITTED,
          updatedByUID: "system",
          updatedByName: "System",
          updatedByRole: "System",
          remarks: `Complaint ID Generated: ${complaintId}`,
          timestamp: new Date().toISOString()
        }
      ];

      if (assignedInspectorUID) {
        initialTimeline.push({
          id: `${nowTs}_3_system`,
          status: STATUS.ASSIGNED,
          updatedByUID: "system",
          updatedByName: "System",
          updatedByRole: "System",
          remarks: `Inspector Auto Assigned: ${assignedInspectorName}`,
          timestamp: new Date().toISOString()
        });
      }

      initialTimeline.push({
        id: `${nowTs}_4_system`,
        status: STATUS.SUBMITTED,
        updatedByUID: "system",
        updatedByName: "System",
        updatedByRole: "System",
        remarks: `Citizen Notified.`,
        timestamp: new Date().toISOString()
      });

      const payload: Issue = {
        uid: id,
        complaintId: complaintId,
        sequenceNumber: seq,
        title: issueData.title || "Untitled Civic Issue",
        description: issueData.description || "No description provided",
        category: issueData.category || "Other",
        priority: issueData.priority || "Medium",
        status: assignedInspectorUID ? STATUS.ASSIGNED : STATUS.SUBMITTED,
        state: issueData.state || "",
        district: issueData.district || "",
        ulb: issueData.ulb || "",
        area: issueData.area || "",
        landmark: issueData.landmark || "",
        imageUrl: null,
        imageData: (issueData as any).imageUrl || null,
        latitude: issueData.latitude || 19.076,
        longitude: issueData.longitude || 72.8777,
        reportedByUID: issueData.reportedByUID || "anonymous",
        reportedByName: issueData.reportedByName || "Anonymous Reporter",
        assignedInspectorUID: assignedInspectorUID,
        assignedInspectorName: assignedInspectorName,
        assignedInspectorEmail: assignedInspectorEmail,
        assignedDistrict: issueData.district || null,
        assignedState: issueData.state || null,
        communitySupportCount: issueData.communitySupportCount || 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastUpdatedBy: issueData.reportedByUID || "anonymous",
        lastUpdatedAt: serverTimestamp(),
        inspectionImages: issueData.inspectionImages || [],
        resolutionImages: issueData.resolutionImages || [],
        timeline: initialTimeline,
        comments: [],
        
        // Legacy fields
        isDuplicate: false,
        duplicateOf: null,
        duplicates: [],
        hotScore: 20,
        source: issueData.source || "app",
        importBatch: issueData.importBatch || null,
        rating: null,
      };

      transaction.set(newIssueRef, payload);

      // Notifications inside transaction
      if (issueData.reportedByUID && issueData.reportedByUID !== "anonymous") {
        const citizenNotifRef = doc(collection(db, "notifications"));
        transaction.set(citizenNotifRef, getAdvancedNotificationPayload({
          targetUID: issueData.reportedByUID,
          type: "COMPLAINT_SUBMITTED",
          category: "WORKFLOW",
          title: "Complaint Submitted",
          message: `Your complaint "${issueData.title || ''}" has been successfully submitted. ID: ${complaintId}`,
          severity: "low",
          actorUID: "system",
          complaintUID: id,
          complaintId: complaintId,
          state: issueData.state,
          district: issueData.district,
          actionRoute: `/dashboard/issue/${id}`
        }));
      }

      if (assignedInspectorUID) {
        const inspectorNotifRef = doc(collection(db, "notifications"));
        transaction.set(inspectorNotifRef, getAdvancedNotificationPayload({
          targetUID: assignedInspectorUID,
          type: "INSPECTOR_ASSIGNED",
          category: "WORKFLOW",
          title: "New Assignment",
          message: `A new complaint "${issueData.title || ''}" has been auto-assigned to you. ID: ${complaintId}`,
          severity: "medium",
          actorUID: "system",
          complaintUID: id,
          complaintId: complaintId,
          state: issueData.state,
          district: issueData.district,
          actionRoute: `/dashboard/issue/${id}`
        }));
      }
    });

    // STEP 6: Console log immediately after Firestore create
    console.log("TRACE [issueService]: Document created successfully.");
    console.log("TRACE [issueService]: imageData length is:", (issueData as any).imageUrl?.length || "undefined");

    // TEMPORARILY DISABLED FIREBASE STORAGE ENTIRELY
    /*
    // Upload image OUTSIDE the transaction to avoid timeout and retry issues
    if ((issueData as any).imageFile) {
      // ... storage code bypassed for Zero-Cost fallback ...
    }
    */

    // Since ReportIssue.tsx uses the returned ID (uid), return uid so that component knows to update itself
    // We return an object containing id, complaintId, and assignedInspectorName
    return { id, complaintId, assignedInspectorName };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return undefined;
  }
}

export async function addCommentToIssue(issueId: string, comment: { userId: string; name: string; text: string; role: string }): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) throw new Error("Issue not found");
    const issue = snap.data() as Issue;

    if (comment.role === ROLES.CITIZEN) {
      if (issue.reportedByUID !== comment.userId) throw new Error("Unauthorized: Citizens can only comment on their own complaints.");
    } else if (comment.role === ROLES.FIELD_INSPECTOR) {
      if (issue.assignedInspectorUID !== comment.userId) throw new Error("Unauthorized: You are not assigned to this complaint.");
    } else if (comment.role === ROLES.MUNICIPALITY_HQ) {
      const userSnap = await getDoc(doc(db, "users", comment.userId));
      if (userSnap.exists()) {
        const uData = userSnap.data() as UserProfile;
        if (uData.assignedState !== issue.state) throw new Error("Unauthorized: This complaint is outside your assigned state.");
      }
    }

    const commentPayload: Comment = {
      userUID: comment.userId,
      userName: comment.name,
      role: comment.role,
      message: comment.text,
      createdAt: new Date().toISOString()
    };
    
    const batch = writeBatch(db);
    batch.update(doc(db, "issues", issueId), {
      comments: arrayUnion(commentPayload),
      updatedAt: serverTimestamp(),
      lastUpdatedBy: comment.userId,
      lastUpdatedAt: serverTimestamp()
    });

    const isCitizen = comment.role === ROLES.CITIZEN;

    // Notify relevant parties based on role
    if (isCitizen) {
      if (issue.assignedInspectorUID) {
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, getAdvancedNotificationPayload({
          targetUID: issue.assignedInspectorUID,
          type: "system", // Or a new type if desired, kept system for comments per current logic
          category: "WORKFLOW",
          title: "New Comment",
          message: `Resident ${comment.name} commented on assigned issue "${issue.title}".`,
          severity: "low",
          actorUID: comment.userId,
          complaintUID: issueId,
          complaintId: issue.complaintId,
          state: issue.state,
          district: issue.district,
          actionRoute: `/dashboard/issue/${issueId}`
        }));
      }
    } else {
      if (issue.reportedByUID && issue.reportedByUID !== "anonymous") {
        const notifRef = doc(collection(db, "notifications"));
        batch.set(notifRef, getAdvancedNotificationPayload({
          targetUID: issue.reportedByUID,
          type: "system",
          category: "WORKFLOW",
          title: "New Comment",
          message: `Official ${comment.name} left a comment on your report "${issue.title}".`,
          severity: "low",
          actorUID: comment.userId,
          complaintUID: issueId,
          complaintId: issue.complaintId,
          state: issue.state,
          district: issue.district,
          actionRoute: `/dashboard/issue/${issueId}`
        }));
      }
    }
    
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function confirmIssue(issueId: string, userId: string, userName: string): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    if (!userSnap.exists()) throw new Error("User not found");
    const uData = userSnap.data() as UserProfile;
    if (uData.role !== ROLES.CITIZEN) throw new Error("Unauthorized: Only Citizens can confirm complaints.");

    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) return;
    const issue = snap.data() as Issue;

    // Simulate confirmation via communitySupportCount
    const newSupportCount = (issue.communitySupportCount || 0) + 1;
    
    const batch = writeBatch(db);

    // Add to issue_supports collection instead of embedding
    batch.set(doc(collection(db, "issue_supports")), {
      issueId,
      userUID: userId,
      supportedAt: serverTimestamp()
    });

    const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
    const pWeight = priorityWeight[issue.priority as keyof typeof priorityWeight] || 20;
    const hotScore = newSupportCount * 10 + pWeight;

    let updatedPriority = issue.priority;
    if (newSupportCount >= 10) {
      updatedPriority = "Critical";
    } else if (newSupportCount >= 5 && (issue.priority === "Low" || issue.priority === "Medium")) {
      updatedPriority = "High";
    }

    batch.update(doc(db, "issues", issueId), {
      communitySupportCount: newSupportCount,
      priority: updatedPriority,
      hotScore,
      updatedAt: serverTimestamp(),
      lastUpdatedBy: userId,
      lastUpdatedAt: serverTimestamp()
    });

    if (uData) {
      const currentPoints = uData.xp || 0;
      const newPoints = currentPoints + 5;
      
      const newBadges = [...(uData.badges || [])];
      let earnedBadge = null;
      if (newPoints >= 100 && !newBadges.includes("Rising Star")) {
        newBadges.push("Rising Star");
        earnedBadge = "Rising Star";
      }
      if (newPoints >= 500 && !newBadges.includes("Power User")) {
        newBadges.push("Power User");
        earnedBadge = "Power User";
      }
      if (newPoints >= 1000 && !newBadges.includes("Champion")) {
        newBadges.push("Champion");
        earnedBadge = "Champion";
      }

      batch.update(doc(db, "users", userId), {
        xp: newPoints,
        badges: newBadges
      });

      if (earnedBadge) {
        batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
          targetUID: userId,
          type: "BADGE_EARNED",
          category: "ACHIEVEMENT",
          title: `You earned the '${earnedBadge}' badge! 🎖`,
          message: `Congratulations! Your civic engagement has earned you a new badge.`,
          severity: "low"
        }));
      }
    }

    batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
      targetUID: userId,
      type: "POINTS_AWARDED",
      category: "ACHIEVEMENT",
      title: "XP Awarded",
      message: "You earned +5 xp for supporting an issue!",
      severity: "low"
    }));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateIssueStatus(
  issueId: string, 
  status: string, 
  details?: { 
    beforePhotoUrl?: string; 
    afterPhotoUrl?: string; 
    comments?: string;
    assignedDept?: string;
    assignedOfficer?: string;
    updatedByUID?: string;
    updatedByName?: string;
    updatedByRole?: string;
  },
  user?: UserProfile
): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) return;
    const issue = snap.data() as Issue;

    // Authorization validation for HQ
    if (user && user.role === ROLES.MUNICIPALITY_HQ) {
      if (user.assignedState !== issue.state) {
        throw new Error("Unauthorized: This complaint is outside your assigned state.");
      }
    } else if (user && user.role !== ROLES.MUNICIPALITY_HQ) {
      throw new Error("Unauthorized: Only Municipality HQ can use the generic update functionality.");
    }

    const timelineItem: TimelineItem = { id: `${Date.now()}_${Math.random()}`, status: status as any, updatedByUID: details?.updatedByUID || "system",
      updatedByName: details?.updatedByName || "System",
      updatedByRole: details?.updatedByRole || "System",
      remarks: details?.comments || `Status updated to ${status}`,
      timestamp: new Date().toISOString()
    };

    const updates: any = {
      status,
      timeline: arrayUnion(timelineItem),
      updatedAt: serverTimestamp(),
      lastUpdatedBy: details?.updatedByUID || "system",
      lastUpdatedAt: serverTimestamp()
    };

    if (status === STATUS.RESOLVED && details?.afterPhotoUrl) {
      updates.resolutionImages = arrayUnion(details.afterPhotoUrl);
    }
    
    if (details?.comments) {
      const commentPayload: Comment = {
        userUID: details?.updatedByUID || "system",
        userName: details?.updatedByName || "Administrative Officer",
        role: details?.updatedByRole || "System",
        message: `Inspection/Resolution Note: ${details.comments}`,
        createdAt: new Date().toISOString()
      };
      updates.comments = arrayUnion(commentPayload);
    }

    const batch = writeBatch(db);

    batch.update(doc(db, "issues", issueId), updates);

    const reporterId = issue.reportedByUID;
    if (reporterId && reporterId !== "anonymous") {
      let message = `Your issue "${issue.title}" has been updated to ${status}.`;
      if (details?.comments) {
        message = `Official notes posted for your issue "${issue.title}": "${details.comments.substring(0, 45)}..."`;
      } else if (status === STATUS.RESOLVED) {
        message = `Your reported problem "${issue.title}" is now successfully resolved! Rate the resolution.`;
      }

      if (status === STATUS.RESOLVED) {
        const reporterDocRef = doc(db, "users", reporterId);
        const reporterSnap = await getDoc(reporterDocRef);
        if (reporterSnap.exists()) {
          const repData = reporterSnap.data() as UserProfile;
          const currentPoints = repData.xp || 0;
          batch.update(reporterDocRef, {
            xp: currentPoints + 50
          });
          batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
            targetUID: reporterId,
            type: "POINTS_AWARDED",
            category: "ACHIEVEMENT",
            title: "XP Awarded",
            message: "You earned +50 xp for successful issue resolution!",
            severity: "low"
          }));
        }
      }
      
      const typeMap: Record<string, string> = {
        [STATUS.RESOLVED]: "COMPLAINT_RESOLVED",
        [STATUS.REJECTED]: "HQ_REJECTED",
      };

      batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
        targetUID: reporterId,
        type: typeMap[status] || "issue_status_changed",
        category: "WORKFLOW",
        title: "Status Update",
        message,
        severity: "medium",
        actorUID: details?.updatedByUID || "system",
        complaintUID: issueId,
        complaintId: issue.complaintId,
        state: issue.state,
        district: issue.district,
        actionRoute: `/dashboard/issue/${issueId}`
      }));
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -----------------------------------------------------
// SPRINT 4B - FIELD INSPECTOR WORKFLOW (STRICT FSM)
// -----------------------------------------------------

export function uploadInspectionImage(
  file: File, 
  complaintId: string, 
  type: 'before' | 'after',
  onProgress?: (progress: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`TRACE [issueService]: Using zero-cost base64 fallback for inspection image (${type})`);
    
    // Simulate progress
    if (onProgress) onProgress(50);

    const reader = new FileReader();
    reader.onloadend = () => {
        if (onProgress) onProgress(100);
        resolve(reader.result as string);
    };
    reader.onerror = (error) => {
        console.error("FileReader Error:", error);
        reject(error);
    };
    reader.readAsDataURL(file);

    /* TEMPORARILY DISABLED FIREBASE STORAGE
    try {
      const filename = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `issues/${complaintId}/${type}/${filename}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error("Firebase Storage Upload Error:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    } catch (error) {
      console.error("Firebase Storage Upload Error:", error);
      reject(error);
    }
    */
  });
}

export async function acceptCase(issueId: string, user: UserProfile): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const docRef = doc(db, "issues", issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Issue not found");
    const data = snap.data() as Issue;

    if (data.assignedInspectorUID !== user.uid) throw new Error("Unauthorized: You are not assigned to this complaint.");
    if (data.status !== STATUS.ASSIGNED) throw new Error("Invalid transition: Issue is not in ASSIGNED state.");

    const timelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.ACCEPTED,
      timestamp: new Date().toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: "Inspector Accepted"
    };

    const batch = writeBatch(db);
    batch.update(docRef, {
      status: STATUS.ACCEPTED,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: serverTimestamp(),
      timeline: arrayUnion(timelineItem)
    });

    batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
      targetUID: data.reportedByUID, // Notify citizen
      type: "CASE_ACCEPTED",
      category: "WORKFLOW",
      title: "Case Accepted",
      message: `Your complaint ID: ${data.complaintId} has been accepted by the inspector and is scheduled for field visit.`,
      severity: "low",
      actorUID: user.uid,
      complaintUID: issueId,
      complaintId: data.complaintId,
      state: data.state,
      district: data.district,
      actionRoute: `/dashboard/issue/${issueId}`
    }));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function startInspection(issueId: string, user: UserProfile, complaintId: string, citizenUid: string): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const docRef = doc(db, "issues", issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Issue not found");
    const data = snap.data() as Issue;

    if (data.assignedInspectorUID !== user.uid) throw new Error("Unauthorized: You are not assigned to this complaint.");
    if (data.status !== STATUS.ACCEPTED) throw new Error("Invalid transition: Issue is not ACCEPTED.");

    const timelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.INSPECTION_STARTED,
      timestamp: new Date().toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: "Inspection Started"
    };

    const batch = writeBatch(db);
    batch.update(docRef, {
      status: STATUS.INSPECTION_STARTED,
      inspectionStartedAt: serverTimestamp(),
      lastUpdatedBy: user.uid,
      lastUpdatedAt: serverTimestamp(),
      timeline: arrayUnion(timelineItem)
    });

    if (citizenUid && citizenUid !== "anonymous") {
      batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
        targetUID: citizenUid,
        type: "INSPECTION_STARTED",
        category: "WORKFLOW",
        title: "Inspection Started",
        message: `Field inspection has started for your complaint ID: ${complaintId}`,
        severity: "medium",
        actorUID: user.uid,
        complaintUID: issueId,
        complaintId: complaintId,
        state: data.state,
        district: data.district,
        actionRoute: `/dashboard/issue/${issueId}`
      }));
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function completeInspection(
  issueId: string, 
  user: UserProfile, 
  complaintId: string, 
  citizenUid: string, 
  beforeImages: string[], 
  afterImages: string[], 
  notesPayload: {
    workCompleted: string;
    materialsUsed: string;
    estimatedCost: string;
    timeSpent: string;
    remarks: string;
  }
): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const docRef = doc(db, "issues", issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Issue not found");
    const data = snap.data() as Issue;

    if (data.assignedInspectorUID !== user.uid) throw new Error("Unauthorized: You are not assigned to this complaint.");
    if (data.status !== STATUS.INSPECTION_STARTED) throw new Error("Invalid transition: Inspection was not started.");

    const timelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.INSPECTION_COMPLETED,
      timestamp: new Date().toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `Inspection Completed.`
    };
    
    const notesTimelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.IN_PROGRESS,
      timestamp: new Date(Date.now() + 200).toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `Inspection Notes Submitted. Remarks: ${notesPayload.remarks}`
    };
    
    const beforeImageEvents: TimelineItem[] = beforeImages.map((url, i) => ({
      id: crypto.randomUUID(),
      status: STATUS.IN_PROGRESS,
      timestamp: new Date(Date.now() + i).toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `Before Image Uploaded`
    }));

    const afterImageEvents: TimelineItem[] = afterImages.map((url, i) => ({
      id: crypto.randomUUID(),
      status: STATUS.IN_PROGRESS,
      timestamp: new Date(Date.now() + 100 + i).toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `After Image Uploaded`
    }));

    const allEvents = [...beforeImageEvents, ...afterImageEvents, timelineItem, notesTimelineItem];

    const batch = writeBatch(db);

    batch.update(docRef, {
      status: STATUS.INSPECTION_COMPLETED,
      inspectionCompletedAt: serverTimestamp(),
      inspectionImages: beforeImages,
      resolutionImages: afterImages,
      workCompleted: notesPayload.workCompleted || null,
      materialsUsed: notesPayload.materialsUsed || null,
      estimatedCost: notesPayload.estimatedCost || null,
      timeSpent: notesPayload.timeSpent || null,
      inspectionRemarks: notesPayload.remarks || null,
      lastUpdatedBy: user.uid,
      lastUpdatedAt: serverTimestamp(),
      timeline: arrayUnion(...allEvents)
    });

    if (citizenUid && citizenUid !== "anonymous") {
      batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
        targetUID: citizenUid,
        type: "INSPECTION_COMPLETED",
        category: "WORKFLOW",
        title: "Inspection Completed",
        message: `Inspection completed. Your complaint is now awaiting Municipality HQ review.`,
        severity: "medium",
        actorUID: user.uid,
        complaintUID: issueId,
        complaintId: complaintId,
        state: data.state,
        district: data.district,
        actionRoute: `/dashboard/issue/${issueId}`
      }));
    }
    
    // Notify HQ
    if (data.state) {
      const hqQuery = query(
        collection(db, "users"), 
        where("role", "==", ROLES.MUNICIPALITY_HQ),
        where("assignedState", "==", data.state)
      );
      const hqSnap = await getDocs(hqQuery);
      hqSnap.docs.forEach(docSnap => {
        batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
          targetUID: docSnap.id,
          type: "NOTES_SUBMITTED", // As requested: NOTES_SUBMITTED
          category: "WORKFLOW",
          title: "Inspection Completed & Notes Submitted",
          message: `Inspector ${user.name} has completed inspection, uploaded evidence, and submitted notes for ${complaintId}.`,
          severity: "high",
          actorUID: user.uid,
          complaintUID: issueId,
          complaintId: complaintId,
          state: data.state,
          district: data.district,
          actionRoute: `/dashboard/issue/${issueId}`
        }));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function submitRecommendation(
  issueId: string, 
  user: UserProfile, 
  recommendation: 'RESOLVE' | 'REJECT', 
  remarks: string
): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const docRef = doc(db, "issues", issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Issue not found");
    const data = snap.data() as Issue;

    if (data.assignedInspectorUID !== user.uid) throw new Error("Unauthorized: You are not assigned to this complaint.");
    if (data.status !== STATUS.INSPECTION_COMPLETED) throw new Error("Invalid transition: Inspection must be completed first.");

    const timelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.AWAITING_HQ_REVIEW,
      timestamp: new Date().toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `Recommendation Submitted (${recommendation}): ${remarks}`
    };

    const batch = writeBatch(db);

    batch.update(docRef, {
      status: STATUS.AWAITING_HQ_REVIEW,
      recommendationStatus: recommendation,
      recommendationRemarks: remarks,
      recommendationTimestamp: serverTimestamp(),
      lastUpdatedBy: user.uid,
      lastUpdatedAt: serverTimestamp(),
      timeline: arrayUnion(timelineItem)
    });

    // Notify HQ
    if (data.state) {
      const hqQuery = query(
        collection(db, "users"), 
        where("role", "==", ROLES.MUNICIPALITY_HQ),
        where("assignedState", "==", data.state)
      );
      const hqSnap = await getDocs(hqQuery);
      hqSnap.docs.forEach(docSnap => {
        batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
          targetUID: docSnap.id,
          type: "HQ_REVIEW_STARTED",
          category: "WORKFLOW",
          title: "Recommendation Submitted",
          message: `Inspector ${user.name} submitted recommendation ${recommendation} for issue ${issueId}`,
          severity: "high",
          actorUID: user.uid,
          complaintUID: issueId,
          complaintId: data.complaintId,
          state: data.state,
          district: data.district,
          actionRoute: `/dashboard/issue/${issueId}`
        }));
      });
    }

    await batch.commit();
    createActivityLog(user.uid, `Submitted recommendation ${recommendation} for issue ${issueId}`, user.role);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

// -----------------------------------------------------

export async function submitIssueRating(issueId: string, rating: number, userId: string): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) throw new Error("Issue not found");
    const issue = snap.data() as Issue;

    if (issue.reportedByUID !== userId) {
      throw new Error("Unauthorized: Only the creator of this complaint can submit a rating.");
    }

    await updateDoc(doc(db, "issues", issueId), {
      rating,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToIssues(
  options: {
    scope: "all" | "user" | "inspector" | "hq";
    userId?: string;
    role?: string;
    state?: string;
    district?: string;
    filters?: { category?: string; priority?: string; status?: string; };
  }, 
  callback: (issues: Issue[], metadata: { hasPendingWrites: boolean; fromCache: boolean }) => void
) {
  const path = "issues";
  try {
    let conditions: any[] = [];
    
    if (options.scope === "user" && options.userId) {
      conditions.push(where("reportedByUID", "==", options.userId));
    } else if (options.scope === "inspector" && options.userId) {
      conditions.push(where("assignedInspectorUID", "==", options.userId));
    } else if (options.scope === "hq" && options.state) {
      conditions.push(where("state", "==", options.state));
      // In production, we'd add an index for state + district.
      // if (options.district) conditions.push(where("district", "==", options.district));
    }

    if (options.filters) {
      if (options.filters.category && options.filters.category !== "All") conditions.push(where("category", "==", options.filters.category));
      if (options.filters.priority && options.filters.priority !== "All") conditions.push(where("priority", "==", options.filters.priority));
      if (options.filters.status && options.filters.status !== "All") conditions.push(where("status", "==", options.filters.status));
    }

    const q = query(collection(db, "issues"), ...conditions);
    
    return onSnapshot(q, { includeMetadataChanges: true }, (snap) => {
      const docs = snap.docs.map(d => {
        const raw = d.data() as Issue;
        if (options.scope === "all") {
          return {
            uid: d.id,
            complaintId: raw.complaintId,
            category: raw.category,
            priority: raw.priority,
            status: raw.status,
            latitude: raw.latitude,
            longitude: raw.longitude,
            district: raw.district,
            ulb: raw.ulb,
            createdAt: raw.createdAt,
            title: raw.title,
            description: raw.description,
            imageUrl: raw.imageUrl,
            communitySupportCount: raw.communitySupportCount,
            reportedByName: raw.reportedByName,
            reportedByUID: raw.reportedByUID,
            area: raw.area,
            state: raw.state,
            landmark: raw.landmark,
            updatedAt: raw.updatedAt,
          } as Issue;
        } else {
          return { uid: d.id, ...raw } as Issue;
        }
      });

      docs.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds : (a.createdAt ? new Date(a.createdAt).getTime()/1000 : Date.now()/1000);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds : (b.createdAt ? new Date(b.createdAt).getTime()/1000 : Date.now()/1000);
        return timeB - timeA;
      });

      callback(docs, { hasPendingWrites: snap.metadata.hasPendingWrites, fromCache: snap.metadata.fromCache });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function mergeIssues(primaryId: string, duplicateIds: string[], byUserId: string): Promise<void> {
  const path = `issues/${primaryId}`;
  try {
    const batch = writeBatch(db);
    const primaryRef = doc(db, "issues", primaryId);
    batch.update(primaryRef, {
      duplicates: arrayUnion(...duplicateIds),
      updatedAt: serverTimestamp(),
      lastUpdatedBy: byUserId,
      lastUpdatedAt: serverTimestamp()
    });

    duplicateIds.forEach((dupId) => {
      const dupRef = doc(db, "issues", dupId);
      batch.update(dupRef, {
        isDuplicate: true,
        duplicateOf: primaryId,
        status: STATUS.RESOLVED,
        updatedAt: serverTimestamp(),
        lastUpdatedBy: byUserId,
        lastUpdatedAt: serverTimestamp()
      });
    });

    await batch.commit();

    await createActivityLog("merge_issues", { primaryId, duplicateIds }, byUserId);

    for (const dupId of duplicateIds) {
      const snap = await getDoc(doc(db, "issues", dupId));
      if (snap.exists()) {
        const issue = snap.data() as Issue;
        if (issue.reportedByUID && issue.reportedByUID !== "anonymous") {
          const dupBatch = writeBatch(db);
          dupBatch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
            targetUID: issue.reportedByUID,
            type: "SYSTEM", // Using string literal as a fallback for 'duplicate_merged'
            category: "WORKFLOW",
            title: "Issue Merged",
            message: `Your report "${issue.title}" was identified as a duplicate of another report and has been merged for streamlined resolution tracking.`,
            severity: "low",
            actorUID: byUserId,
            complaintUID: dupId,
            complaintId: issue.complaintId,
            state: issue.state,
            district: issue.district,
            actionRoute: `/dashboard/issue/${primaryId}`
          }));
          await dupBatch.commit();
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitResolutionRating(
  issueId: string,
  user: UserProfile,
  rating: number,
  feedback: string
): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const docRef = doc(db, "issues", issueId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error("Issue not found");
    const data = snap.data() as Issue;

    if (data.reportedByUID !== user.uid) throw new Error("Unauthorized");
    if (data.status !== STATUS.RESOLVED) throw new Error("Invalid state for rating");

    const timelineItem: TimelineItem = {
      id: crypto.randomUUID(),
      status: STATUS.RESOLVED,
      timestamp: new Date().toISOString(),
      updatedByUID: user.uid,
      updatedByName: user.name,
      updatedByRole: user.role,
      remarks: `Citizen Resolution Rating: ${rating} Stars. Feedback: ${feedback || "None provided."}`
    };

    const batch = writeBatch(db);

    batch.update(docRef, {
      rating,
      ratingFeedback: feedback,
      timeline: arrayUnion(timelineItem),
      updatedAt: serverTimestamp()
    });

    if (data.assignedInspectorUID) {
      batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
        targetUID: data.assignedInspectorUID,
        type: "RATING_RECEIVED",
        category: "WORKFLOW",
        title: "Resolution Rated",
        message: `Citizen rated your resolution for ${data.complaintId}: ${rating} Stars.`,
        severity: "low",
        actorUID: user.uid,
        complaintUID: issueId,
        complaintId: data.complaintId,
        state: data.state,
        district: data.district,
        actionRoute: `/dashboard/issue/${issueId}`
      }));
    }

    if (data.state) {
      const hqQuery = query(
        collection(db, "users"), 
        where("role", "==", ROLES.MUNICIPALITY_HQ),
        where("assignedState", "==", data.state)
      );
      const hqSnap = await getDocs(hqQuery);
      hqSnap.docs.forEach(docSnap => {
        batch.set(doc(collection(db, "notifications")), getAdvancedNotificationPayload({
          targetUID: docSnap.id,
          type: "RATING_RECEIVED",
          category: "WORKFLOW",
          title: "Resolution Rated",
          message: `Issue ${data.complaintId} received a rating of ${rating} Stars.`,
          severity: "low",
          actorUID: user.uid,
          complaintUID: issueId,
          complaintId: data.complaintId,
          state: data.state,
          district: data.district,
          actionRoute: `/dashboard/issue/${issueId}`
        }));
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
