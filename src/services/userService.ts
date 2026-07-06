import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  addDoc
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase-init";
import { UserProfile, ActivityLog, UserRole } from "../types";
import { ROLES } from "../constants/roles";
import { locationData } from "../constants/locations";

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
  const role: UserRole = data.role || ROLES.CITIZEN;
  let assignedState = data.assignedState || null;
  let assignedDistrict = data.assignedDistrict || null;
  let assignedULBs: string[] = [];

  if (role === ROLES.CITIZEN) {
    assignedState = null;
    assignedDistrict = null;
    assignedULBs = [];
  } else if (role === ROLES.MUNICIPALITY_HQ) {
    assignedDistrict = null;
    assignedULBs = [];
  } else if (role === ROLES.FIELD_INSPECTOR) {
    if (assignedState && assignedDistrict && locationData[assignedState] && locationData[assignedState][assignedDistrict]) {
      assignedULBs = locationData[assignedState][assignedDistrict];
    }
  }

  const payload: UserProfile = {
    uid: userId,
    name: data.name || "Anonymous User",
    email: data.email || "",
    phone: data.phone || "",
    role: role,
    assignedState: assignedState,
    assignedDistrict: assignedDistrict,
    assignedULBs: assignedULBs,
    xp: data.xp || 0,
    badges: data.badges || [],
    createdAt: serverTimestamp(),
    lastLogin: serverTimestamp(),
    isActive: true,
    avatar: data.avatar || null,
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

export function subscribeLeaderboard(callback: (users: UserProfile[]) => void) {
  const path = "users";
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", ROLES.CITIZEN),
      orderBy("xp", "desc"),
      limit(10)
    );
    return onSnapshot(q, (snap) => {
      callback(snap.docs.map(d => d.data() as UserProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

export async function createActivityLog(type: string, data: any, userId: string): Promise<void> {
  const path = "activity_log";
  try {
    await addDoc(collection(db, "activity_log"), {
      type,
      data,
      userId,
      timestamp: serverTimestamp()
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
      callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}
