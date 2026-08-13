// Resilient Geolocation Utility for NexCivic (Sprint 9 QA Hardening)
import { logAuditEvent } from "../services/auditLogService";

export interface GeolocationResult {
  success: boolean;
  coords?: {
    latitude: number;
    longitude: number;
  };
  errorMessage?: string;
  errorCode?: number;
}

const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 30000, // 30 seconds
  maximumAge: 300000 // 5 minutes cache
};

/**
 * Returns a human-friendly message for GeolocationPositionError codes
 */
export function getFriendlyGeolocationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Location permission denied. Please allow location access in your browser settings or select manually.";
    case error.POSITION_UNAVAILABLE:
      return "Location signal unavailable. You can retry or select your location manually.";
    case error.TIMEOUT:
      return "Unable to fetch your current location due to request timeout. You can retry or manually choose your location.";
    default:
      return "Unable to fetch your current location. You can retry or manually choose your location.";
  }
}

/**
 * Requests browser Geolocation position with 30s timeout, 1-time auto-retry on timeout, and audit logging
 */
export async function getResilientCurrentPosition(isRetryAttempt = false): Promise<GeolocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return {
      success: false,
      errorMessage: "Geolocation is not supported by your browser. Please select location manually."
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          success: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          }
        });
      },
      async (error: GeolocationPositionError) => {
        // Log to Audit Trail without throwing runtime exception
        logAuditEvent({
          userUID: "client_gps",
          role: "CLIENT",
          action: "GEOLOCATION_ERROR",
          severity: "LOW",
          metadata: {
            errorCode: error.code,
            errorMessage: error.message,
            isRetryAttempt
          }
        });

        // 1-Time Auto Retry on Timeout (code 3) after 2 seconds
        if (error.code === error.TIMEOUT && !isRetryAttempt) {
          console.warn("[Geolocation] Request timed out. Retrying automatically in 2 seconds...");
          setTimeout(async () => {
            const retryResult = await getResilientCurrentPosition(true);
            resolve(retryResult);
          }, 2000);
          return;
        }

        const friendlyMsg = getFriendlyGeolocationError(error);
        console.warn(`[Geolocation] Position request failed (code ${error.code}): ${friendlyMsg}`);

        resolve({
          success: false,
          errorMessage: friendlyMsg,
          errorCode: error.code
        });
      },
      GEOLOCATION_OPTIONS
    );
  });
}
