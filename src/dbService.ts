import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  arrayUnion, 
  serverTimestamp, 
  writeBatch,
  addDoc
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebase-init";
import { Issue, UserProfile, SurveyResponse, ImportBatch, Zone, ActivityLog, Notification } from "./types";

// ==========================================
// USER OPERATIONS
// ==========================================
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

export async function createUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const payload = {
    // Defaults
    name: "Anonymous Citizen",
    email: "",
    role: "Citizen",
    avatar: null,
    phone: "",
    address: "",
    department: "",
    zone: "Zone A",
    points: 0,
    badges: [],
    reportCount: 0,
    isActive: true,

    // User-provided data, overwrites defaults
    ...data,

    // Server-enforced values, overwrites user data
    id: userId,
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
  };

  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, "users", userId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  const path = `users/${userId}`;
  try {
    await updateDoc(doc(db, "users", userId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const path = "users";
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Gamification leaderboard subscription
export function subscribeLeaderboard(callback: (users: UserProfile[]) => void) {
  const path = "users";
  try {
    const q = query(
      collection(db, "users"),
      where("role", "===", "Citizen"),
      orderBy("points", "desc"),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => d.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// ISSUES OPERATIONS
// ==========================================
export async function createIssue(issueData: Partial<Issue>): Promise<string | undefined> {
  const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
  const pWeight = priorityWeight[issueData.priority || "Medium"] || 20;
  const hotScore = (issueData.confirmCount || 0) * 10 + pWeight;

  const path = "issues";
  try {
    const docRef = doc(collection(db, "issues"));
    const id = docRef.id;

    const payload = {
      id,
      title: issueData.title || "Untitled Civic Issue",
      description: issueData.description || "No description provided",
      category: issueData.category || "Other",
      suggestedDepartment: issueData.suggestedDepartment || "Other",
      location: issueData.location || "Default City",
      address: issueData.address || "No address details",
      lat: issueData.lat || 19.076,
      lng: issueData.lng || 72.8777,
      zone: issueData.zone || "Zone A",
      priority: issueData.priority || "Medium",
      status: issueData.status || "Open",
      reportedBy: issueData.reportedBy || "anonymous",
      reporterName: issueData.reporterName || "Anonymous Reporter",
      reporterEmail: issueData.reporterEmail || "",
      imageUrl: issueData.imageUrl || "",
      confirmations: issueData.confirmations || [],
      confirmCount: issueData.confirmCount || 0,
      isDuplicate: issueData.isDuplicate || false,
      duplicateOf: issueData.duplicateOf || null,
      duplicates: issueData.duplicates || [],
      hotScore,
      comments: issueData.comments || [],
      rating: issueData.rating || null,
      beforePhotoUrl: issueData.imageUrl || null,
      afterPhotoUrl: null,
      source: issueData.source || "app",
      importBatch: issueData.importBatch || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(docRef, payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function addCommentToIssue(issueId: string, comment: { userId: string; name: string; text: string }): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const commentPayload = {
      id: Math.random().toString(36).substring(2, 9),
      userId: comment.userId,
      name: comment.name,
      text: comment.text,
      createdAt: new Date().toISOString()
    };
    await updateDoc(doc(db, "issues", issueId), {
      comments: arrayUnion(commentPayload),
      updatedAt: serverTimestamp()
    });

    const snap = await getDoc(doc(db, "issues", issueId));
    if (snap.exists()) {
      const issue = snap.data() as Issue;
      const isCitizen = !comment.userId.startsWith("auth") && comment.userId !== "manager";

      if (isCitizen) {
        await createNotification("manager", `Resident ${comment.name} commented on issue "${issue.title}": "${comment.text.substring(0, 45)}..."`, "system");
        if (issue.assignedTo && issue.assignedTo !== "manager" && issue.assignedTo !== comment.userId) {
          await createNotification(issue.assignedTo, `Resident ${comment.name} commented on your assigned issue "${issue.title}": "${comment.text.substring(0, 45)}..."`, "system");
        }
      } else {
        if (issue.reportedBy && issue.reportedBy !== "anonymous" && issue.reportedBy !== comment.userId) {
          await createNotification(issue.reportedBy, `Officer ${comment.name} left a comment on your report "${issue.title}": "${comment.text.substring(0, 45)}..."`, "system");
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function confirmIssue(issueId: string, userId: string, userName: string): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) return;
    const issue = snap.data() as Issue;

    const alreadyConfirmed = issue.confirmations.some(c => c.userId === userId);
    if (alreadyConfirmed) return;

    const newConfirmations = [...issue.confirmations, { userId, name: userName, confirmedAt: new Date().toISOString() }];
    const newConfirmCount = newConfirmations.length;

    const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
    const pWeight = priorityWeight[issue.priority] || 20;
    const hotScore = newConfirmCount * 10 + pWeight;

    let updatedPriority = issue.priority;
    if (newConfirmCount >= 10) {
      updatedPriority = "Critical";
    } else if (newConfirmCount >= 5 && (issue.priority === "Low" || issue.priority === "Medium")) {
      updatedPriority = "High";
    }

    await updateDoc(doc(db, "issues", issueId), {
      confirmations: newConfirmations,
      confirmCount: newConfirmCount,
      priority: updatedPriority,
      hotScore,
      updatedAt: serverTimestamp()
    });

    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      const currentPoints = uData.points || 0;
      const newPoints = currentPoints + 5;
      
      const newBadges = [...(uData.badges || [])];
      if (newPoints >= 100 && !newBadges.includes("Rising Star")) {
        newBadges.push("Rising Star");
        await createNotification(userId, "You earned the 'Rising Star' badge! 🎖", "badge_earned");
      }
      if (newPoints >= 500 && !newBadges.includes("Power User")) {
        newBadges.push("Power User");
        await createNotification(userId, "You earned the 'Power User' badge! 🎖", "badge_earned");
      }
      if (newPoints >= 1000 && !newBadges.includes("Champion")) {
        newBadges.push("Champion");
        await createNotification(userId, "You earned the 'Champion' badge! 🎖", "badge_earned");
      }

      await updateDoc(userDocRef, {
        points: newPoints,
        badges: newBadges
      });
    }

    await createNotification(userId, "You earned +5 points for confirming an issue!", "points_awarded");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateIssueStatus(
  issueId: string, 
  status: "Open" | "In Progress" | "Resolved", 
  details?: { 
    beforePhotoUrl?: string; 
    afterPhotoUrl?: string; 
    comments?: string;
    assignedDept?: string;
    assignedOfficer?: string;
  }
): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    const snap = await getDoc(doc(db, "issues", issueId));
    if (!snap.exists()) return;
    const issue = snap.data() as Issue;

    const updates: any = {
      status,
      updatedAt: serverTimestamp()
    };

    if (status === "Resolved") {
      updates.resolvedAt = serverTimestamp();
      if (details?.afterPhotoUrl) updates.afterPhotoUrl = details.afterPhotoUrl;
    } else if (status === "In Progress") {
      updates.acknowledgedAt = serverTimestamp();
    }

    if (details?.assignedDept) {
      updates.suggestedDepartment = details.assignedDept;
    }
    if (details?.assignedOfficer) {
      updates.assignedToName = details.assignedOfficer;
    }

    if (details?.comments) {
      updates.resolutionNotes = details.comments;
      const commentPayload = {
        id: Math.random().toString(36).substring(2, 9),
        userId: "manager",
        name: "Administrative Officer",
        text: `Inspection/Resolution Note: ${details.comments}`,
        createdAt: new Date().toISOString()
      };
      updates.comments = arrayUnion(commentPayload);
    }

    await updateDoc(doc(db, "issues", issueId), updates);

    const reporterId = issue.reportedBy;
    if (reporterId && reporterId !== "anonymous") {
      let message = `Your issue "${issue.title}" has been updated to ${status}.`;
      if (details?.comments) {
        message = `Administrative notes posted for your issue "${issue.title}": "${details.comments.substring(0, 45)}..."`;
      } else if (status === "Resolved") {
        message = `Your reported problem "${issue.title}" is now successfully resolved! Rate the resolution.`;
      }

      if (status === "Resolved") {
        const reporterDocRef = doc(db, "users", reporterId);
        const reporterSnap = await getDoc(reporterDocRef);
        if (reporterSnap.exists()) {
          const repData = reporterSnap.data() as UserProfile;
          const currentPoints = repData.points || 0;
          await updateDoc(reporterDocRef, {
            points: currentPoints + 50
          });
          await createNotification(reporterId, "You earned +50 points for successful issue resolution!", "points_awarded");
        }
      }
      await createNotification(reporterId, message, status === "Resolved" ? "issue_resolved" : "issue_status_changed");
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function submitIssueRating(issueId: string, rating: number): Promise<void> {
  const path = `issues/${issueId}`;
  try {
    await updateDoc(doc(db, "issues", issueId), {
      rating,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeAllIssues(callback: (issues: Issue[]) => void) {
  const path = "issues";
  try {
    const q = query(collection(db, "issues"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as Issue));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function mergeIssues(primaryId: string, duplicateIds: string[], byUserId: string): Promise<void> {
  const path = `issues/${primaryId}`;
  try {
    const batch = writeBatch(db);
    const primaryRef = doc(db, "issues", primaryId);
    batch.update(primaryRef, {
      duplicates: arrayUnion(...duplicateIds),
      updatedAt: serverTimestamp()
    });

    duplicateIds.forEach((dupId) => {
      const dupRef = doc(db, "issues", dupId);
      batch.update(dupRef, {
        isDuplicate: true,
        duplicateOf: primaryId,
        status: "Resolved",
        updatedAt: serverTimestamp()
      });
    });

    await batch.commit();

    await createActivityLog("merge_issues", { primaryId, duplicateIds }, byUserId);

    for (const dupId of duplicateIds) {
      const snap = await getDoc(doc(db, "issues", dupId));
      if (snap.exists()) {
        const issue = snap.data() as Issue;
        if (issue.reportedBy && issue.reportedBy !== "anonymous") {
          await createNotification(
            issue.reportedBy, 
            `Your report "${issue.title}" was identified as a duplicate of another report and has been merged for streamlined resolution tracking.`,
            "duplicate_merged"
          );
        }
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// NOTIFICATIONS OPERATIONS
// ==========================================
export async function createNotification(userId: string, message: string, type: any): Promise<void> {
  const path = "notifications";
  try {
    const docRef = doc(collection(db, "notifications"));
    await setDoc(docRef, {
      id: docRef.id,
      userId,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeNotifications(userId: string, callback: (notifications: Notification[]) => void) {
  const path = "notifications";
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "===", userId),
      orderBy("createdAt", "desc"),
      limit(25)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as Notification));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function markNotificationAsRead(notifId: string): Promise<void> {
  const path = `notifications/${notifId}`;
  try {
    await updateDoc(doc(db, "notifications", notifId), {
      read: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const path = "notifications";
  try {
    const q = query(collection(db, "notifications"), where("userId", "===", userId), where("read", "===", false));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(doc(db, "notifications", d.id), { read: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// ACTIVITY LOG OPERATIONS
// ==========================================
export async function createActivityLog(type: string, data: any, userId: string): Promise<void> {
  const path = "activity_log";
  try {
    const docRef = doc(collection(db, "activity_log"));
    await setDoc(docRef, {
      id: docRef.id,
      type,
      data,
      userId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeActivityLogs(callback: (logs: ActivityLog[]) => void) {
  const path = "activity_log";
  try {
    const q = query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(50));
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as ActivityLog));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// ==========================================
// ZONES OPERATIONS
// ==========================================
export async function getAllZones(): Promise<Zone[]> {
  const path = "zones";
  try {
    const snap = await getDocs(collection(db, "zones"));
    return snap.docs.map(d => d.data() as Zone);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function createZone(name: string, description: string, assignedAuthority: string): Promise<void> {
  const path = "zones";
  try {
    const docRef = doc(collection(db, "zones"));
    await setDoc(docRef, {
      id: docRef.id,
      name,
      description,
      assignedAuthority,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateZone(zoneId: string, updates: Partial<Zone>): Promise<void> {
  const path = `zones/${zoneId}`;
  try {
    await updateDoc(doc(db, "zones", zoneId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ==========================================
// CSV IMPORT BATCH OPERATIONS
// ==========================================
export async function createImportBatch(batch: Partial<ImportBatch>): Promise<string | undefined> {
  const path = "import_batches";
  try {
    const docRef = doc(collection(db, "import_batches"));
    await setDoc(docRef, {
      id: docRef.id,
      batchName: batch.batchName || "New Import Batch",
      type: batch.type || "issues",
      importedBy: batch.importedBy || "system",
      rowCount: batch.rowCount || 0,
      successCount: batch.successCount || 0,
      errorCount: batch.errorCount || 0,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getImportBatches(): Promise<ImportBatch[]> {
  const path = "import_batches";
  try {
    const snap = await getDocs(query(collection(db, "import_batches"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => d.data() as ImportBatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteImportBatchCascade(batchId: string, type: 'issues' | 'survey'): Promise<void> {
  try {
    const batch = writeBatch(db);

    if (type === "issues") {
      const q = query(collection(db, "issues"), where("importBatch", "==", batchId));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        batch.delete(doc(db, "issues", d.id));
      });
    } else {
      const q = query(collection(db, "survey_responses"), where("importBatch", "==", batchId));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        batch.delete(doc(db, "survey_responses", d.id));
      });
    }

    batch.delete(doc(db, "import_batches", batchId));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `import_batches/${batchId}`);
  }
}

// ==========================================
// SURVEY RESPONSES OPERATIONS
// ==========================================
export async function getSurveyResponses(): Promise<SurveyResponse[]> {
  const path = "survey_responses";
  try {
    const snap = await getDocs(collection(db, "survey_responses"));
    return snap.docs.map(d => d.data() as SurveyResponse);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addSurveyResponsesBatch(responses: Partial<SurveyResponse>[]): Promise<void> {
  const path = "survey_responses";
  try {
    const batch = writeBatch(db);
    responses.forEach((resp) => {
      const dRef = doc(collection(db, "survey_responses"));
      batch.set(dRef, {
        id: dRef.id,
        ...resp,
        importedAt: serverTimestamp()
      });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function checkAndSeedDatabase(): Promise<void> {
  // This is a placeholder function to allow the build to proceed.
  // The actual seeding logic is not critical for the application to run.
}
