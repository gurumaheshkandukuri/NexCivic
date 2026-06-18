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
import firebaseConfig from "../firebase-applet-config.json";

// Automatically identify if we should run in high-fidelity simulation mode
export const isSimulatedMode = 
  !firebaseConfig.apiKey || 
  firebaseConfig.apiKey === "remixed-api-key" || 
  firebaseConfig.apiKey === "" || 
  firebaseConfig.apiKey.includes("MY_") || 
  firebaseConfig.apiKey.includes("dummy");

// --- LOCAL STORAGE HELPERS FOR HIGH-FIDELITY SIMULATION ---
function getLocalCollection<T>(key: string): T[] {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
}

function setLocalCollection<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// Global pub/sub listeners table for simulation reactivity
const listeners = {
  issues: [] as ((data: Issue[]) => void)[],
  notifications: {} as Record<string, ((data: Notification[]) => void)[]>,
  leaderboard: [] as ((data: UserProfile[]) => void)[],
  activityLogs: [] as ((data: ActivityLog[]) => void)[]
};

function notifyIssuesListeners() {
  const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
  listeners.issues.forEach(cb => cb(issues));
}

function notifyNotificationsListeners(userId: string) {
  const notifs = getLocalCollection<Notification>("telangana_civic_sim_notifications")
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (listeners.notifications[userId]) {
    listeners.notifications[userId].forEach(cb => cb(notifs));
  }
}

function notifyLeaderboardListeners() {
  const users = getLocalCollection<UserProfile>("telangana_civic_sim_users")
    .filter(u => u.role === "Citizen")
    .sort((a, b) => b.points - a.points)
    .slice(0, 10);
  listeners.leaderboard.forEach(cb => cb(users));
}

function notifyActivityLogsListeners() {
  const logs = getLocalCollection<ActivityLog>("telangana_civic_sim_activity_log")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);
  listeners.activityLogs.forEach(cb => cb(logs));
}

// ==========================================
// USER OPERATIONS
// ==========================================
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (isSimulatedMode) {
    const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
    const user = users.find(u => u.id === userId);
    return user || null;
  }

  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, "users", userId));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserProfile(userId: string, data: Partial<UserProfile>): Promise<void> {
  const payload = {
    id: userId,
    name: data.name || "Anonymous Citizen",
    email: data.email || "",
    role: data.role || "Citizen",
    avatar: data.avatar || null,
    phone: data.phone || "",
    address: data.address || "",
    department: data.department || "",
    zone: data.zone || "Zone A",
    points: data.points ?? 0,
    badges: data.badges || [],
    reportCount: data.reportCount ?? 0,
    isActive: true,
    createdAt: (isSimulatedMode ? new Date().toISOString() : serverTimestamp()) as any,
    lastLogin: (isSimulatedMode ? new Date().toISOString() : serverTimestamp()) as any,
    ...data
  };

  if (isSimulatedMode) {
    const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
    const filtered = users.filter(u => u.id !== userId);
    filtered.push(payload as UserProfile);
    setLocalCollection("telangana_civic_sim_users", filtered);
    notifyLeaderboardListeners();
    return;
  }

  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, "users", userId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  if (isSimulatedMode) {
    const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx] = {
        ...users[idx],
        ...updates,
        updatedAt: new Date().toISOString() as any
      };
      setLocalCollection("telangana_civic_sim_users", users);
      notifyLeaderboardListeners();
    }
    return;
  }

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
  if (isSimulatedMode) {
    return getLocalCollection<UserProfile>("telangana_civic_sim_users");
  }

  const path = "users";
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map(d => d.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Gamification leaderboard subscription
export function subscribeLeaderboard(callback: (users: UserProfile[]) => void) {
  if (isSimulatedMode) {
    listeners.leaderboard.push(callback);
    const initial = getLocalCollection<UserProfile>("telangana_civic_sim_users")
      .filter(u => u.role === "Citizen")
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);
    callback(initial);
    return () => {
      listeners.leaderboard = listeners.leaderboard.filter(cb => cb !== callback);
    };
  }

  const path = "users";
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "Citizen"),
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
export async function createIssue(issueData: Partial<Issue>): Promise<string> {
  const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
  const pWeight = priorityWeight[issueData.priority || "Medium"] || 20;
  const hotScore = (issueData.confirmCount || 0) * 10 + pWeight;

  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const id = "sim_issue_" + Math.random().toString(36).substring(2, 9);
    
    const payload: Issue = {
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
      createdAt: new Date().toISOString() as any,
      updatedAt: new Date().toISOString() as any,
      assignedTo: issueData.assignedTo || "",
      assignedToName: issueData.assignedToName || ""
    };

    issues.unshift(payload);
    setLocalCollection("telangana_civic_sim_issues", issues);
    notifyIssuesListeners();

    // Reward points and increment issue counter for Citizen
    if (issueData.reportedBy && issueData.reportedBy !== "anonymous") {
      const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
      const uIdx = users.findIndex(u => u.id === issueData.reportedBy);
      if (uIdx !== -1) {
        users[uIdx].reportCount = (users[uIdx].reportCount || 0) + 1;
        users[uIdx].points = (users[uIdx].points || 0) + 15; // 15 points per issue report
        
        // Dynamic badge awards
        const currentBadges = users[uIdx].badges || [];
        if (!currentBadges.includes("First Reporter")) {
          currentBadges.push("First Reporter");
          await createNotification(issueData.reportedBy, "Congratulations! You earned the 'First Reporter' badge! 🎖", "badge_earned");
        }
        
        users[uIdx].badges = currentBadges;
        setLocalCollection("telangana_civic_sim_users", users);
        notifyLeaderboardListeners();
      }
      await createNotification(issueData.reportedBy, "You received +15 points for submitting a verified neighborhood report!", "points_awarded");
    }

    return id;
  }

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
  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx !== -1) {
      const commentPayload = {
        id: Math.random().toString(36).substring(2, 9),
        userId: comment.userId,
        name: comment.name,
        text: comment.text,
        createdAt: new Date().toISOString()
      };
      issues[idx].comments = [...(issues[idx].comments || []), commentPayload];
      issues[idx].updatedAt = new Date().toISOString() as any;
      setLocalCollection("telangana_civic_sim_issues", issues);
      notifyIssuesListeners();

      const issue = issues[idx];
      const isCitizen = !comment.userId.startsWith("auth") && comment.userId !== "manager" && !comment.userId.includes("authority");

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
    return;
  }

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
  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx !== -1) {
      const issue = issues[idx];
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

      issue.confirmations = newConfirmations;
      issue.confirmCount = newConfirmCount;
      issue.priority = updatedPriority;
      issue.hotScore = hotScore;
      issue.updatedAt = new Date().toISOString() as any;

      setLocalCollection("telangana_civic_sim_issues", issues);
      notifyIssuesListeners();

      // Provide gamification benefit
      const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
      const uIdx = users.findIndex(u => u.id === userId);
      if (uIdx !== -1) {
        const uData = users[uIdx];
        const newPoints = (uData.points || 0) + 5;
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

        uData.points = newPoints;
        uData.badges = newBadges;
        setLocalCollection("telangana_civic_sim_users", users);
        notifyLeaderboardListeners();
      }
      await createNotification(userId, "You earned +5 points for confirming/upvoting an issue!", "points_awarded");
    }
    return;
  }

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
  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx !== -1) {
      const issue = issues[idx];
      issue.status = status;
      issue.updatedAt = new Date().toISOString() as any;

      if (status === "Resolved") {
        issue.resolvedAt = new Date().toISOString() as any;
        if (details?.afterPhotoUrl) issue.afterPhotoUrl = details.afterPhotoUrl;
      } else if (status === "In Progress") {
        issue.acknowledgedAt = new Date().toISOString() as any;
      }

      if (details?.assignedDept) {
        issue.suggestedDepartment = details.assignedDept;
      }
      if (details?.assignedOfficer) {
        issue.assignedToName = details.assignedOfficer;
      }

      if (details?.comments) {
        issue.resolutionNotes = details.comments;
        const commentPayload = {
          id: Math.random().toString(36).substring(2, 9),
          userId: "manager",
          name: "Administrative Officer",
          text: `Inspection/Resolution Note: ${details.comments}`,
          createdAt: new Date().toISOString()
        };
        issue.comments = [...(issue.comments || []), commentPayload];
      }

      setLocalCollection("telangana_civic_sim_issues", issues);
      notifyIssuesListeners();

      const reporterId = issue.reportedBy;
      if (reporterId && reporterId !== "anonymous") {
        let message = `Your issue "${issue.title}" has been updated to ${status}.`;
        if (details?.comments) {
          message = `Administrative notes posted for your issue "${issue.title}": "${details.comments.substring(0, 45)}..."`;
        } else if (status === "Resolved") {
          message = `Your reported problem "${issue.title}" is now successfully resolved! Rate the resolution.`;
        }

        if (status === "Resolved") {
          const users = getLocalCollection<UserProfile>("telangana_civic_sim_users");
          const uIdx = users.findIndex(u => u.id === reporterId);
          if (uIdx !== -1) {
            users[uIdx].points = (users[uIdx].points || 0) + 50;
            setLocalCollection("telangana_civic_sim_users", users);
            notifyLeaderboardListeners();
          }
          await createNotification(reporterId, "You earned +50 points for successful issue resolution!", "points_awarded");
        }
        await createNotification(reporterId, message, status === "Resolved" ? "issue_resolved" : "issue_status_changed");
      }
    }
    return;
  }

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
  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const idx = issues.findIndex(i => i.id === issueId);
    if (idx !== -1) {
      issues[idx].rating = rating;
      issues[idx].updatedAt = new Date().toISOString() as any;
      setLocalCollection("telangana_civic_sim_issues", issues);
      notifyIssuesListeners();
    }
    return;
  }

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
  if (isSimulatedMode) {
    listeners.issues.push(callback);
    const list = getLocalCollection<Issue>("telangana_civic_sim_issues");
    callback(list);
    return () => {
      listeners.issues = listeners.issues.filter(cb => cb !== callback);
    };
  }

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
  if (isSimulatedMode) {
    const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    const primaryIdx = issues.findIndex(i => i.id === primaryId);
    if (primaryIdx !== -1) {
      issues[primaryIdx].duplicates = [...(issues[primaryIdx].duplicates || []), ...duplicateIds];
      issues[primaryIdx].updatedAt = new Date().toISOString() as any;

      duplicateIds.forEach((dupId) => {
        const dupIdx = issues.findIndex(i => i.id === dupId);
        if (dupIdx !== -1) {
          issues[dupIdx].isDuplicate = true;
          issues[dupIdx].duplicateOf = primaryId;
          issues[dupIdx].status = "Resolved";
          issues[dupIdx].updatedAt = new Date().toISOString() as any;
        }
      });

      setLocalCollection("telangana_civic_sim_issues", issues);
      notifyIssuesListeners();

      await createActivityLog("merge_issues", { primaryId, duplicateIds }, byUserId);

      for (const dupId of duplicateIds) {
        const dup = issues.find(i => i.id === dupId);
        if (dup && dup.reportedBy && dup.reportedBy !== "anonymous") {
          await createNotification(
            dup.reportedBy, 
            `Your report "${dup.title}" was identified as a duplicate of another report and has been merged for streamlined resolution tracking.`,
            "duplicate_merged"
          );
        }
      }
    }
    return;
  }

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
  if (isSimulatedMode) {
    const notifs = getLocalCollection<Notification>("telangana_civic_sim_notifications");
    const newNotif: Notification = {
      id: "sim_notif_" + Math.random().toString(36).substring(2, 9),
      userId,
      message,
      type,
      read: false,
      createdAt: new Date().toISOString()
    };
    notifs.unshift(newNotif);
    setLocalCollection("telangana_civic_sim_notifications", notifs);
    notifyNotificationsListeners(userId);
    return;
  }

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
  if (isSimulatedMode) {
    if (!listeners.notifications[userId]) {
      listeners.notifications[userId] = [];
    }
    listeners.notifications[userId].push(callback);
    const initialList = getLocalCollection<Notification>("telangana_civic_sim_notifications")
      .filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 25);
    callback(initialList);
    return () => {
      if (listeners.notifications[userId]) {
        listeners.notifications[userId] = listeners.notifications[userId].filter(cb => cb !== callback);
      }
    };
  }

  const path = "notifications";
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
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
  if (isSimulatedMode) {
    const notifs = getLocalCollection<Notification>("telangana_civic_sim_notifications");
    const idx = notifs.findIndex(n => n.id === notifId);
    if (idx !== -1) {
      notifs[idx].read = true;
      setLocalCollection("telangana_civic_sim_notifications", notifs);
      notifyNotificationsListeners(notifs[idx].userId);
    }
    return;
  }

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
  if (isSimulatedMode) {
    const notifs = getLocalCollection<Notification>("telangana_civic_sim_notifications");
    let changed = false;
    notifs.forEach(n => {
      if (n.userId === userId && !n.read) {
        n.read = true;
        changed = true;
      }
    });
    if (changed) {
      setLocalCollection("telangana_civic_sim_notifications", notifs);
      notifyNotificationsListeners(userId);
    }
    return;
  }

  const path = "notifications";
  try {
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false));
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
  if (isSimulatedMode) {
    const logs = getLocalCollection<ActivityLog>("telangana_civic_sim_activity_log");
    const newLog: ActivityLog = {
      id: "sim_log_" + Math.random().toString(36).substring(2, 9),
      type,
      data,
      userId,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    setLocalCollection("telangana_civic_sim_activity_log", logs);
    notifyActivityLogsListeners();
    return;
  }

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
  if (isSimulatedMode) {
    listeners.activityLogs.push(callback);
    const logs = getLocalCollection<ActivityLog>("telangana_civic_sim_activity_log")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50);
    callback(logs);
    return () => {
      listeners.activityLogs = listeners.activityLogs.filter(cb => cb !== callback);
    };
  }

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
  if (isSimulatedMode) {
    return getLocalCollection<Zone>("telangana_civic_sim_zones");
  }

  const path = "zones";
  try {
    const snap = await getDocs(collection(db, "zones"));
    return snap.docs.map(d => d.data() as Zone);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createZone(name: string, description: string, assignedAuthority: string): Promise<void> {
  if (isSimulatedMode) {
    const zones = getLocalCollection<Zone>("telangana_civic_sim_zones");
    zones.push({
      id: "sim_zone_" + Math.random().toString(36).substring(2, 9),
      name,
      description,
      assignedAuthority,
      createdAt: new Date().toISOString() as any
    });
    setLocalCollection("telangana_civic_sim_zones", zones);
    return;
  }

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
  if (isSimulatedMode) {
    const zones = getLocalCollection<Zone>("telangana_civic_sim_zones");
    const idx = zones.findIndex(z => z.id === zoneId);
    if (idx !== -1) {
      zones[idx] = {
        ...zones[idx],
        ...updates,
        updatedAt: new Date().toISOString() as any
      };
      setLocalCollection("telangana_civic_sim_zones", zones);
    }
    return;
  }

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
export async function createImportBatch(batch: Partial<ImportBatch>): Promise<string> {
  if (isSimulatedMode) {
    const batches = getLocalCollection<ImportBatch>("telangana_civic_sim_import_batches");
    const id = "sim_batch_" + Math.random().toString(36).substring(2, 9);
    batches.unshift({
      id,
      batchName: batch.batchName || "New Import Batch",
      type: batch.type || "issues",
      importedBy: batch.importedBy || "system",
      rowCount: batch.rowCount || 0,
      successCount: batch.successCount || 0,
      errorCount: batch.errorCount || 0,
      createdAt: new Date().toISOString() as any
    });
    setLocalCollection("telangana_civic_sim_import_batches", batches);
    return id;
  }

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
  if (isSimulatedMode) {
    return getLocalCollection<ImportBatch>("telangana_civic_sim_import_batches");
  }

  const path = "import_batches";
  try {
    const snap = await getDocs(query(collection(db, "import_batches"), orderBy("createdAt", "desc")));
    return snap.docs.map(d => d.data() as ImportBatch);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteImportBatchCascade(batchId: string, type: 'issues' | 'survey'): Promise<void> {
  if (isSimulatedMode) {
    if (type === "issues") {
      const issues = getLocalCollection<Issue>("telangana_civic_sim_issues");
      const filtered = issues.filter(i => i.importBatch !== batchId);
      setLocalCollection("telangana_civic_sim_issues", filtered);
      notifyIssuesListeners();
    } else {
      const surveys = getLocalCollection<SurveyResponse>("telangana_civic_sim_survey_responses");
      const filtered = surveys.filter(s => s.importBatch !== batchId);
      setLocalCollection("telangana_civic_sim_survey_responses", filtered);
    }
    const batches = getLocalCollection<ImportBatch>("telangana_civic_sim_import_batches");
    const filteredBatches = batches.filter(b => b.id !== batchId);
    setLocalCollection("telangana_civic_sim_import_batches", filteredBatches);
    return;
  }

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
  if (isSimulatedMode) {
    return getLocalCollection<SurveyResponse>("telangana_civic_sim_survey_responses");
  }

  const path = "survey_responses";
  try {
    const snap = await getDocs(collection(db, "survey_responses"));
    return snap.docs.map(d => d.data() as SurveyResponse);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function addSurveyResponsesBatch(responses: Partial<SurveyResponse>[]): Promise<void> {
  if (isSimulatedMode) {
    const surveys = getLocalCollection<SurveyResponse>("telangana_civic_sim_survey_responses");
    responses.forEach((resp) => {
      surveys.push({
        id: "sim_survey_" + Math.random().toString(36).substring(2, 9),
        ...resp,
        importedAt: new Date().toISOString() as any
      } as SurveyResponse);
    });
    setLocalCollection("telangana_civic_sim_survey_responses", surveys);
    return;
  }

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

// ==========================================
// SEEDING AND INITIAL DEMO DATA INITIALIZATION
// ==========================================
export async function checkAndSeedDatabase() {
  if (isSimulatedMode) {
    const existingIssues = getLocalCollection<Issue>("telangana_civic_sim_issues");
    if (existingIssues.length > 0) {
      console.log("[Simulation] Database has already been seeded with reports in localStorage.");
      return;
    }

    console.log("[Simulation] Empty simulated database detected. Seeding 52 issues across Mumbai, 9 demo profiles, and 3 default zones...");
    
    // 1. Seed Zones
    const zonesToSeed = [
      { id: "zone_a", name: "Zone A", description: "Andheri, Bandra, and West suburban administrative division", assignedAuthority: "auth1" },
      { id: "zone_b", name: "Zone B", description: "Kurla, Ghatkopar, and Central division administrative area", assignedAuthority: "auth2" },
      { id: "zone_all", name: "All Zones", description: "Entire Metropolitan Municipality Administrative oversight", assignedAuthority: "manager" }
    ];
    setLocalCollection("telangana_civic_sim_zones", zonesToSeed);

    // 2. Seed Users
    const demoUsers = [
      { id: "citizen1", name: "Rohan Sawant", email: "citizen1@demo.com", role: "Citizen" as const, points: 245, badges: ["First Reporter", "Reporter", "Rising Star"], reportCount: 6, zone: "Zone A" },
      { id: "citizen2", name: "Sneha Nair", email: "citizen2@demo.com", role: "Citizen" as const, points: 189, badges: ["First Reporter", "Rising Star"], reportCount: 3, zone: "Zone B" },
      { id: "citizen3", name: "Aditya Verma", email: "citizen3@demo.com", role: "Citizen" as const, points: 156, badges: ["First Reporter", "Rising Star"], reportCount: 1, zone: "Zone A" },
      { id: "authority1", name: "Inspector Suresh Patil", email: "authority1@demo.com", role: "Authority" as const, points: 0, badges: [], reportCount: 0, department: "Roads and Infrastructure", zone: "Zone A" },
      { id: "authority2", name: "Inspector Kavita Rao", email: "authority2@demo.com", role: "Authority" as const, points: 0, badges: [], reportCount: 0, department: "Utilities and Water Works", zone: "Zone B" },
      { id: "manager", name: "Municipal Commissioner Mehta", email: "manager@demo.com", role: "MunicipalityMgr" as const, points: 0, badges: [], reportCount: 0, department: "Municipality HQ", zone: "All zones" },
      { id: "guru12", name: "Guru", email: "guru12@gmail.com", role: "Citizen" as const, points: 245, badges: ["First Reporter", "Rising Star"], reportCount: 0, zone: "Zone A" },
      { id: "authority_nexcivic", name: "Inspector NexCivic", email: "authority@nexcivic.com", role: "Authority" as const, points: 0, badges: [], reportCount: 0, department: "Government Roads", zone: "All Zones" },
      { id: "commissioner_nexcivic", name: "Commissioner NexCivic", email: "commisioner@nexcivic.com", role: "MunicipalityMgr" as const, points: 0, badges: [], reportCount: 0, department: "Headquarters", zone: "All Zones" }
    ];

    const fullyFormedUsers = demoUsers.map((u) => ({
      ...u,
      avatar: null,
      phone: "+91 98765 43210",
      address: "Mumbai Metropolitan District",
      isActive: true,
      createdAt: new Date().toISOString() as any,
      lastLogin: new Date().toISOString() as any
    }));
    setLocalCollection("telangana_civic_sim_users", fullyFormedUsers);

    // 3. Generate 52 issues across realistic landmarks in Mumbai
    const categories = ["Pothole", "Garbage Overflow", "Water Leakage", "Street Light", "Drainage", "Infrastructure", "Other"];
    const priorities: Array<"Low" | "Medium" | "High" | "Critical"> = ["Low", "Medium", "High", "Critical"];
    const statuses: Array<"Open" | "In Progress" | "Resolved"> = ["Open", "In Progress", "Resolved"];
    
    const landmarks = [
      { title: "Sewri Pothole", address: "Sewri Fort Road, Sewri, Mumbai", lat: 19.0012, lng: 72.8554 },
      { title: "Colaba Pavement Gap", address: "Gateway Of India Promenade, Colaba, Mumbai", lat: 18.9220, lng: 72.8347 },
      { title: "Bandra Dump Site", address: "Carter Road near Promenade, Bandra West, Mumbai", lat: 19.0654, lng: 72.8222 },
      { title: "Juhu Drainage Clog", address: "Juhu Tara Road near beach gate, Juhu, Mumbai", lat: 19.1023, lng: 72.8265 },
      { title: "Andheri Streetlight Fault", address: "S.V. Road near junction, Andheri West, Mumbai", lat: 19.1197, lng: 72.8468 },
      { title: "Kurla Garbage Overflow", address: "LBS Marg, Kurla West, Mumbai", lat: 19.0704, lng: 72.8795 },
      { title: "Ghatkopar Pipeline Leak", address: "MG Road Near Station, Ghatkopar East, Mumbai", lat: 19.0837, lng: 72.9090 },
      { title: "Dadar Traffic Grid Signage", address: "Gokhale Road, Dadar West, Mumbai", lat: 19.0222, lng: 72.8415 },
      { title: "Prabhadevi Drainage Backflow", address: "Sayani Road near junction, Prabhadevi, Mumbai", lat: 19.0145, lng: 72.8276 },
      { title: "Worli Sea Side Garbage", address: "Worli Sea Face Promenade, Worli, Mumbai", lat: 19.0068, lng: 72.8123 },
      { title: "Chembur Pothole Array", address: "Sion-Trombay Road, Chembur, Mumbai", lat: 19.0522, lng: 72.8988 },
      { title: "Byculla Water Leakage", address: "Clare Road near Zoo entrance, Byculla, Mumbai", lat: 18.9774, lng: 72.8331 },
      { title: "Marine Drive Promenade Defect", address: "Netaji Subhash Chandra Bose Road, Marine Lines, Mumbai", lat: 18.9415, lng: 72.8236 }
    ];

    const issuesToSeed: Issue[] = [];
    for (let i = 1; i <= 52; i++) {
      const landmark = landmarks[(i - 1) % landmarks.length];
      const category = categories[i % categories.length];
      const priority = priorities[i % priorities.length];
      const status = statuses[i % statuses.length];
      
      const jitterLat = (Math.random() - 0.5) * 0.008;
      const jitterLng = (Math.random() - 0.5) * 0.008;
      const finalLat = Number((landmark.lat + jitterLat).toFixed(4));
      const finalLng = Number((landmark.lng + jitterLng).toFixed(4));

      const confirmCount = Math.floor(Math.random() * 8);
      const issueId = `mumbai_issue_${i}`;
      const reporter = demoUsers[i % 3];
      const desc = `System tracked issue #${i} at ${landmark.title}. Citizens highlighted a problem regarding the local ${category.toLowerCase()} causing civic discomfort in ${landmark.address.split(',')[1]}. Urgent municipality field inspection is requested.`;

      const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
      const hotScore = confirmCount * 10 + priorityWeight[priority];

      issuesToSeed.push({
        id: issueId,
        title: `${category} near ${landmark.title.split(' ').slice(1).join(' ')}`,
        description: desc,
        category,
        location: "Mumbai",
        address: `${landmark.address} (Landmark Ref: ${landmark.title})`,
        lat: finalLat,
        lng: finalLng,
        zone: i % 2 === 0 ? "Zone A" : "Zone B",
        priority,
        status,
        reportedBy: reporter.id,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        assignedTo: status !== "Open" ? (i % 2 === 0 ? "authority1" : "authority2") : "",
        assignedToName: status !== "Open" ? (i % 2 === 0 ? "Inspector S. Patil" : "Inspector K. Rao") : "",
        imageUrl: "",
        confirmations: Array.from({ length: confirmCount }).map((_, cIdx) => ({
          userId: `citizen_${cIdx}`,
          name: `Resident ${cIdx + 1}`,
          confirmedAt: new Date(Date.now() - cIdx * 3600000).toISOString()
        })),
        confirmCount,
        isDuplicate: i === 12 || i === 24,
        duplicateOf: i === 12 ? "mumbai_issue_5" : i === 24 ? "mumbai_issue_18" : null,
        duplicates: [],
        hotScore,
        comments: [
          { id: "com_1", userId: "authority1", name: "Inspector Suresh Patil", text: "Logged on local municipal terminal. Inspecting soon.", createdAt: new Date(Date.now() - 4800000).toISOString() }
        ],
        rating: status === "Resolved" ? 4 : null,
        beforePhotoUrl: null,
        afterPhotoUrl: null,
        source: "app",
        importBatch: null,
        createdAt: new Date(Date.now() - i * 86400000).toISOString() as any,
        updatedAt: new Date(Date.now() - i * 3600000).toISOString() as any
      });
    }

    setLocalCollection("telangana_civic_sim_issues", issuesToSeed);
    console.log("[Simulation] Seeding completed! 52 issues successfully created in local storage.");
    return;
  }

  // --- STANDARD FIREBASE CLOUD SEEDING ---
  try {
    const qIssues = query(collection(db, "issues"), limit(1));
    const snapIssues = await getDocs(qIssues);
    if (!snapIssues.empty) {
      console.log("Database has already been seeded with reports.");
      return;
    }

    console.log("Empty database detected. Seeding 52 issues across Mumbai, 6 demo accounts, and 2 default zones...");
    const batch = writeBatch(db);

    const zonesToSeed = [
      { id: "zone_a", name: "Zone A", description: "Andheri, Bandra, and West suburban administrative division", assignedAuthority: "auth1" },
      { id: "zone_b", name: "Zone B", description: "Kurla, Ghatkopar, and Central division administrative area", assignedAuthority: "auth2" },
      { id: "zone_all", name: "All Zones", description: "Entire Metropolitan Municipality Administrative oversight", assignedAuthority: "manager" }
    ];
    zonesToSeed.forEach((z) => {
      batch.set(doc(db, "zones", z.id), {
        id: z.id,
        name: z.name,
        description: z.description,
        assignedAuthority: z.assignedAuthority,
        createdAt: new Date().toISOString()
      });
    });

    const demoUsers = [
      { id: "citizen1", name: "Rohan Sawant", email: "citizen1@demo.com", role: "Citizen" as const, points: 245, badges: ["First Reporter", "Reporter", "Rising Star"], reportCount: 6, zone: "Zone A" },
      { id: "citizen2", name: "Sneha Nair", email: "citizen2@demo.com", role: "Citizen" as const, points: 189, badges: ["First Reporter", "Rising Star"], reportCount: 3, zone: "Zone B" },
      { id: "citizen3", name: "Aditya Verma", email: "citizen3@demo.com", role: "Citizen" as const, points: 156, badges: ["First Reporter", "Rising Star"], reportCount: 1, zone: "Zone A" },
      { id: "authority1", name: "Inspector Suresh Patil", email: "authority1@demo.com", role: "Authority" as const, points: 0, badges: [], reportCount: 0, department: "Roads and Infrastructure", zone: "Zone A" },
      { id: "authority2", name: "Inspector Kavita Rao", email: "authority2@demo.com", role: "Authority" as const, points: 0, badges: [], reportCount: 0, department: "Utilities and Water Works", zone: "Zone B" },
      { id: "manager", name: "Municipal Commissioner Mehta", email: "manager@demo.com", role: "MunicipalityMgr" as const, points: 0, badges: [], reportCount: 0, department: "Municipality HQ", zone: "All zones" }
    ];

    demoUsers.forEach((u) => {
      batch.set(doc(db, "users", u.id), {
        ...u,
        avatar: null,
        phone: "+91 98765 43210",
        address: "Mumbai Metropolitan District",
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    });

    const categories = ["Pothole", "Garbage Overflow", "Water Leakage", "Street Light", "Drainage", "Infrastructure", "Other"];
    const priorities: Array<"Low" | "Medium" | "High" | "Critical"> = ["Low", "Medium", "High", "Critical"];
    const statuses: Array<"Open" | "In Progress" | "Resolved"> = ["Open", "In Progress", "Resolved"];
    
    const landmarks = [
      { title: "Sewri Pothole", address: "Sewri Fort Road, Sewri, Mumbai", lat: 19.0012, lng: 72.8554 },
      { title: "Colaba Pavement Gap", address: "Gateway Of India Promenade, Colaba, Mumbai", lat: 18.9220, lng: 72.8347 },
      { title: "Bandra Dump Site", address: "Carter Road near Promenade, Bandra West, Mumbai", lat: 19.0654, lng: 72.8222 },
      { title: "Juhu Drainage Clog", address: "Juhu Tara Road near beach gate, Juhu, Mumbai", lat: 19.1023, lng: 72.8265 },
      { title: "Andheri Streetlight Fault", address: "S.V. Road near junction, Andheri West, Mumbai", lat: 19.1197, lng: 72.8468 },
      { title: "Kurla Garbage Overflow", address: "LBS Marg, Kurla West, Mumbai", lat: 19.0704, lng: 72.8795 },
      { title: "Ghatkopar Pipeline Leak", address: "MG Road Near Station, Ghatkopar East, Mumbai", lat: 19.0837, lng: 72.9090 },
      { title: "Dadar Traffic Grid Signage", address: "Gokhale Road, Dadar West, Mumbai", lat: 19.0222, lng: 72.8415 },
      { title: "Prabhadevi Drainage Backflow", address: "Sayani Road near junction, Prabhadevi, Mumbai", lat: 19.0145, lng: 72.8276 },
      { title: "Worli Sea Side Garbage", address: "Worli Sea Face Promenade, Worli, Mumbai", lat: 19.0068, lng: 72.8123 },
      { title: "Chembur Pothole Array", address: "Sion-Trombay Road, Chembur, Mumbai", lat: 19.0522, lng: 72.8988 },
      { title: "Byculla Water Leakage", address: "Clare Road near Zoo entrance, Byculla, Mumbai", lat: 18.9774, lng: 72.8331 },
      { title: "Marine Drive Promenade Defect", address: "Netaji Subhash Chandra Bose Road, Marine Lines, Mumbai", lat: 18.9415, lng: 72.8236 }
    ];

    for (let i = 1; i <= 52; i++) {
      const landmark = landmarks[(i - 1) % landmarks.length];
      const category = categories[i % categories.length];
      const priority = priorities[i % priorities.length];
      const status = statuses[i % statuses.length];
      
      const jitterLat = (Math.random() - 0.5) * 0.008;
      const jitterLng = (Math.random() - 0.5) * 0.008;
      const finalLat = Number((landmark.lat + jitterLat).toFixed(4));
      const finalLng = Number((landmark.lng + jitterLng).toFixed(4));

      const confirmCount = Math.floor(Math.random() * 8);
      const issueId = `mumbai_issue_${i}`;
      const reporter = demoUsers[i % 3];
      const desc = `System tracked issue #${i} at ${landmark.title}. Citizens highlighted a problem regarding the local ${category.toLowerCase()} causing civic discomfort in ${landmark.address.split(',')[1]}. Urgent municipality field inspection is requested.`;

      const priorityWeight = { Critical: 40, High: 30, Medium: 20, Low: 10 };
      const hotScore = confirmCount * 10 + priorityWeight[priority];

      batch.set(doc(db, "issues", issueId), {
        id: issueId,
        title: `${category} near ${landmark.title.split(' ').slice(1).join(' ')}`,
        description: desc,
        category,
        location: "Mumbai",
        address: `${landmark.address} (Landmark Ref: ${landmark.title})`,
        lat: finalLat,
        lng: finalLng,
        zone: i % 2 === 0 ? "Zone A" : "Zone B",
        priority,
        status,
        reportedBy: reporter.id,
        reporterName: reporter.name,
        reporterEmail: reporter.email,
        assignedTo: status !== "Open" ? (i % 2 === 0 ? "authority1" : "authority2") : "",
        assignedToName: status !== "Open" ? (i % 2 === 0 ? "Inspector S. Patil" : "Inspector K. Rao") : "",
        imageUrl: "",
        confirmations: Array.from({ length: confirmCount }).map((_, cIdx) => ({
          userId: `citizen_${cIdx}`,
          name: `Resident ${cIdx + 1}`,
          confirmedAt: new Date(Date.now() - cIdx * 3600000).toISOString()
        })),
        confirmCount,
        isDuplicate: i === 12 || i === 24,
        duplicateOf: i === 12 ? "mumbai_issue_5" : i === 24 ? "mumbai_issue_18" : null,
        duplicates: [],
        hotScore,
        comments: [
          { id: "com_1", userId: "authority1", name: "Inspector Suresh Patil", text: "Logged on local municipal terminal. Inspecting soon.", createdAt: new Date(Date.now() - 4800000).toISOString() }
        ],
        rating: status === "Resolved" ? 4 : null,
        beforePhotoUrl: null,
        afterPhotoUrl: null,
        source: "app",
        importBatch: null,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - i * 3600000).toISOString()
      });
    }

    await batch.commit();
    console.log("Seeding complete! 52 issues successfully created in the Firestore database.");
  } catch (error) {
    console.error("Database seeding errored, skipping:", error);
  }
}
