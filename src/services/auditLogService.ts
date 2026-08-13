// NexCivic Audit Logging Service (Sprint 5.1 Hardened Redaction)
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase-init";

export type AuditSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditLogPayload {
  userUID: string;
  role: string;
  action: string;
  targetIssue?: string;
  severity?: AuditSeverity;
  metadata?: Record<string, any>;
}

/**
 * Sanitizes metadata to ensure zero sensitive credentials (passwords, tokens, JWTs, headers) are logged
 */
function sanitizeAuditMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata) return {};
  const sanitized: Record<string, any> = {};

  const SENSITIVE_KEYS = [
    "password", 
    "token", 
    "jwt", 
    "authheader", 
    "secret", 
    "apikey", 
    "sessionid", 
    "cookie", 
    "authorization", 
    "creditcard"
  ];

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => lowerKey.includes(s))) {
      sanitized[key] = "[REDACTED_SENSITIVE]";
    } else if (typeof value === "string") {
      sanitized[key] = value.substring(0, 500); // Limit string length
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeAuditMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Writes a structured audit event to Firestore append-only audit_logs collection
 */
export async function logAuditEvent(payload: AuditLogPayload): Promise<string | null> {
  try {
    const deviceInfo = typeof navigator !== "undefined" ? {
      userAgent: navigator.userAgent.substring(0, 200),
      platform: navigator.platform,
      language: navigator.language
    } : { userAgent: "Node/Server" };

    const docData = {
      timestamp: serverTimestamp(),
      userUID: payload.userUID || "anonymous",
      role: payload.role || "UNAUTHENTICATED",
      action: payload.action,
      targetIssue: payload.targetIssue || "",
      severity: payload.severity || "MEDIUM",
      deviceInfo,
      metadata: sanitizeAuditMetadata(payload.metadata)
    };

    const docRef = await addDoc(collection(db, "audit_logs"), docData);
    console.log(`[AuditLog] Logged action '${payload.action}' by user ${payload.userUID}`);
    return docRef.id;
  } catch (err) {
    console.warn("[AuditLog] Failed to log audit event:", err);
    return null;
  }
}
