import { RoleType } from "./constants/roles";
import { PriorityType } from "./constants/priorities";
import { StatusType } from "./constants/status";

export type UserRole = RoleType;

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  assignedState: string | null;
  assignedDistrict: string | null;
  assignedULBs: string[];
  xp: number;
  badges: string[];
  createdAt: any;
  lastLogin: any;
  isActive: boolean;
  avatar?: string | null;
}

export interface TimelineItem {
  id: string;
  status: StatusType;
  timestamp: any;
  updatedByUID?: string;
  updatedByName?: string;
  updatedByRole?: string;
  remarks?: string;
}

export interface Comment {
  userUID: string;
  userName: string;
  role: string;
  message: string;
  createdAt: any;
}

export interface Issue {
  uid?: string; // The generated random Firestore ID
  complaintId: string; // The human-readable NC- ID
  sequenceNumber?: number; // The sequential number for the district
  title: string;
  description: string;
  category: string;
  priority: PriorityType;
  status: StatusType;
  state?: string;
  district?: string;
  ulb?: string;
  area?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  reportedByUID: string;
  reportedByName: string;
  assignedInspectorUID?: string | null;
  assignedInspectorName?: string | null;
  assignedInspectorEmail?: string | null;
  assignedDistrict?: string | null;
  assignedState?: string | null;
  communitySupportCount: number;
  createdAt: any;
  updatedAt: any;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: any;
  inspectionImages: string[];
  resolutionImages: string[];
  timeline: TimelineItem[];
  comments: Comment[];
  
  rating?: number | null;
  ratingFeedback?: string | null;
  isDuplicate?: boolean;
  duplicateOf?: string | null;
  duplicates?: string[];
  hotScore?: number;
  source?: string;
  importBatch?: string | null;
  
  recommendationStatus?: 'RESOLVE' | 'REJECT' | null;
  recommendationRemarks?: string | null;
  recommendationTimestamp?: any;
  inspectionStartedAt?: any;
  inspectionCompletedAt?: any;
  
  // Inspection Notes
  workCompleted?: string | null;
  materialsUsed?: string | null;
  estimatedCost?: string | null;
  timeSpent?: string | null;
  inspectionRemarks?: string | null;
}

export type NotificationType = 
  | "COMPLAINT_SUBMITTED" 
  | "INSPECTOR_ASSIGNED" 
  | "CASE_ACCEPTED" 
  | "INSPECTION_STARTED" 
  | "EVIDENCE_UPLOADED" 
  | "INSPECTION_COMPLETED" 
  | "NOTES_SUBMITTED" 
  | "HQ_REVIEW_STARTED" 
  | "HQ_APPROVED" 
  | "HQ_REJECTED" 
  | "COMPLAINT_RESOLVED" 
  | "RATING_REQUEST" 
  | "RATING_RECEIVED"
  | "BADGE_EARNED"
  | "POINTS_AWARDED"
  | "issue_status_changed"
  | "issue_resolved"
  | "badge_earned"
  | "points_awarded";

export type NotificationCategory = "SYSTEM" | "WORKFLOW" | "SECURITY" | "ACHIEVEMENT" | "REMINDER";
export type NotificationSeverity = "low" | "medium" | "high" | "critical";
export type DeliveryStatus = "pending" | "delivered" | "read";

export interface Notification {
  notificationId?: string;
  type: NotificationType | string; 
  category?: NotificationCategory;
  title: string;
  message: string;
  severity?: NotificationSeverity;
  version?: number;
  read: boolean;
  readAt?: any;
  deliveryStatus?: DeliveryStatus;
  
  actorUID?: string;
  targetUID?: string; // preferred over userUID
  complaintUID?: string;
  complaintId?: string;
  state?: string;
  district?: string;
  metadata?: Record<string, unknown>;

  // Legacy fields for backward compatibility
  userUID?: string;
  actionRoute?: string;
  relatedComplaintId?: string;
  createdAt: any;
}

export interface IssueSupport {
  issueId: string;
  userUID: string;
  supportedAt: any;
}

export interface SurveyResponse {
  id: string;
  timestamp: string;
  ageGroup: string;
  city: string;
  areaType: string;
  occupation: string;
  issueFrequency: string;
  civicIssues: string[];
  severityRating: number;
  reportedBefore: string;
  whyNotReported: string;
  howReported: string;
  authoritySatisfaction: number;
  resolutionTime: string;
  notifiedOfResolution: string;
  transparencyRating: number;
  ownsSmartphone: string;
  appComfort: number;
  desiredFeatures: string[];
  wouldUseNexCivic: string;
  npsScore: number;
  biggestProblem: string;
  motivationToParticipate: string;
  suggestions: string;
  importBatch: string;
  importedAt: any;
  batchName: string;
}

export interface ImportBatch {
  id: string;
  batchName: string;
  type: "issues" | "survey";
  importedBy: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  createdAt: any;
}

export interface ActivityLog {
  id: string;
  type: string;
  data: any;
  userId: string;
  timestamp: any;
}
