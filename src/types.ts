export type UserRole = "Citizen" | "Authority" | "MunicipalityMgr";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  phone?: string;
  address?: string;
  department?: string;
  zone?: string;
  points: number;
  badges: string[];
  reportCount: number;
  isActive: boolean;
  createdAt: any;
  lastLogin: any;
  updatedAt?: any;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  address: string;
  lat: number;
  lng: number;
  zone: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Open" | "In Progress" | "Resolved";
  reportedBy: string;
  reporterName: string;
  reporterEmail: string;
  assignedTo?: string;
  assignedToName?: string;
  imageUrl?: string;
  confirmations: Array<{ userId: string; name: string; confirmedAt: any }>;
  confirmCount: number;
  isDuplicate: boolean;
  duplicateOf: string | null;
  duplicates: string[];
  hotScore: number;
  comments: Array<{ id: string; userId: string; name: string; text: string; createdAt: any }>;
  rating: number | null;
  suggestedDepartment?: string;
  resolutionNotes?: string;
  beforePhotoUrl?: string | null;
  afterPhotoUrl?: string | null;
  source: "app" | "csv_import" | "survey_import";
  importBatch: string | null;
  resolvedAt?: any;
  acknowledgedAt?: any;
  createdAt: any;
  updatedAt: any;
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

export interface Zone {
  id: string;
  name: string;
  description: string;
  assignedAuthority: string;
  bounds?: { north: number; south: number; east: number; west: number };
  createdAt: any;
  updatedAt?: any;
}

export interface ActivityLog {
  id: string;
  type: string;
  data: any;
  userId: string;
  timestamp: any;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  type: "issue_status_changed" | "issue_resolved" | "badge_earned" | "points_awarded" | "duplicate_merged" | "system";
  read: boolean;
  createdAt: any;
}
