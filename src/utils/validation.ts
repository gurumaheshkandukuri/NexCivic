// Centralized Input Validation Engine for NexCivic (Sprint 5.1 Hardened)

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Strips zero-width Unicode characters, RTL overrides, and normalizes excessive whitespace
 */
export function sanitizeString(input: string): string {
  if (!input) return "";
  return input
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Invisible zero-width Unicode
    .replace(/[\u202A-\u202E]/g, "")     // RTL override characters
    .replace(/\s{50,}/g, " ")             // Prevent whitespace amplification attacks
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "") // Script tags
    .trim();
}

/**
 * Detects dangerous payloads: HTML/JS injection, data URIs, and SQL injection patterns
 */
export function containsDangerousPayload(input: string): boolean {
  if (!input) return false;
  const lower = input.toLowerCase();

  // 1. Script, iframe, object, embed, javascript, data:text/html tags
  const dangerousHTML = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i,
    /<svg.*onload/i
  ];

  if (dangerousHTML.some((regex) => regex.test(input))) {
    return true;
  }

  // 2. SQL injection patterns (O(n) un-backtracked checks)
  const sqlKeywords = [
    /\bselect\b.*\bfrom\b/i,
    /\bunion\b.*\bselect\b/i,
    /\bdrop\b\s+\btable\b/i,
    /\binsert\b\s+\binto\b/i,
    /\bdelete\b\s+\bfrom\b/i,
    /\bupdate\b\s+.*\bset\b/i,
    /--/,
    /;/
  ];

  if (sqlKeywords.some((pattern) => pattern.test(lower))) {
    return true;
  }

  return false;
}

/**
 * Validates 10-digit Indian mobile numbers
 */
export function validatePhone(phone: string): boolean {
  if (!phone) return false;
  const cleanPhone = phone.replace(/[\s\-\+]/g, "");
  return /^[6-9]\d{9}$/.test(cleanPhone);
}

/**
 * Validates RFC-compliant email strings
 */
export function validateEmail(email: string): boolean {
  if (!email) return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates GPS Latitude & Longitude bounds
 */
export function validateGPS(latitude: number, longitude: number): boolean {
  if (typeof latitude !== "number" || typeof longitude !== "number") return false;
  if (isNaN(latitude) || isNaN(longitude)) return false;
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Comprehensive Complaint Form Input Validator
 */
export function validateComplaintInput(data: {
  title?: string;
  description?: string;
  category?: string;
  priority?: string;
  landmark?: string;
  district?: string;
  state?: string;
  ulb?: string;
  latitude?: number;
  longitude?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Title validation
  const title = sanitizeString(data.title || "");
  if (!title) {
    errors.title = "Grievance title is required.";
  } else if (title.length < 3) {
    errors.title = "Title must be at least 3 characters.";
  } else if (title.length > 120) {
    errors.title = "Title cannot exceed 120 characters.";
  } else if (containsDangerousPayload(title)) {
    errors.title = "Title contains prohibited HTML, script, or SQL injection payload.";
  }

  // Description validation
  const description = sanitizeString(data.description || "");
  if (!description) {
    errors.description = "Grievance description is required.";
  } else if (description.length < 10) {
    errors.description = "Description must be at least 10 characters.";
  } else if (description.length > 1000) {
    errors.description = "Description cannot exceed 1000 characters.";
  } else if (containsDangerousPayload(description)) {
    errors.description = "Description contains prohibited HTML, script, or SQL injection payload.";
  }

  // Location validation
  if (!data.district || !data.district.trim()) {
    errors.district = "District selection is required.";
  }

  if (!data.state || !data.state.trim()) {
    errors.state = "State selection is required.";
  }

  if (data.landmark && containsDangerousPayload(data.landmark)) {
    errors.landmark = "Landmark contains prohibited characters.";
  }

  // GPS Coordinates validation
  if (typeof data.latitude === "number" && typeof data.longitude === "number") {
    if (!validateGPS(data.latitude, data.longitude)) {
      errors.gps = "Invalid GPS coordinates provided.";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
