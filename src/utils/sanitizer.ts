// NexCivic Output Sanitization & Anti-XSS Engine (Hardened Immutable)

/**
 * Strips invisible Unicode characters and escapes dangerous HTML entities
 */
export function escapeHTML(str: string): string {
  if (!str || typeof str !== "string") return str || "";

  // 1. Strip invisible Unicode & RTL overrides
  const cleanStr = str
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u202A-\u202E]/g, "");

  // 2. Escape HTML special characters
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;"
  };

  return cleanStr.replace(/[&<>"'/`]/g, (match) => htmlEscapes[match]);
}

/**
 * Deeply sanitizes nested objects & arrays without mutating the original object (Immutable)
 */
export function sanitizeObject<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = escapeHTML(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}
