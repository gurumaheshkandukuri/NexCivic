// NexCivic Client-Side Rate Limiter (LocalStorage Persistent)

class ClientRateLimiter {
  private getStorageKey(actionKey: string): string {
    return `nexcivic_ratelimit_${actionKey}`;
  }

  /**
   * Checks if an action is permitted or restricted by rate limit cooldown.
   * Timestamps are stored in localStorage to survive page reloads and browser refreshes.
   */
  checkRateLimit(actionKey: string, cooldownMs: number): { allowed: boolean; remainingMs: number } {
    const now = Date.now();
    const storageKey = this.getStorageKey(actionKey);

    let lastExecuted = 0;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        lastExecuted = parseInt(stored, 10) || 0;
      }
    } catch (e) {
      console.warn("[RateLimiter] LocalStorage read warning:", e);
    }

    if (lastExecuted > 0) {
      const elapsed = now - lastExecuted;
      if (elapsed < cooldownMs) {
        const remainingMs = cooldownMs - elapsed;
        console.warn(`[RateLimiter] Action '${actionKey}' blocked. Cooldown remaining: ${remainingMs}ms`);
        return { allowed: false, remainingMs };
      }
    }

    try {
      localStorage.setItem(storageKey, now.toString());
    } catch (e) {
      console.warn("[RateLimiter] LocalStorage write warning:", e);
    }

    return { allowed: true, remainingMs: 0 };
  }

  /**
   * Action Helpers
   */
  canSubmitComplaint(userUID: string): { allowed: boolean; remainingMs: number } {
    return this.checkRateLimit(`submit_complaint_${userUID}`, 10000); // 10s cooldown
  }

  canSubmitFeedback(userUID: string): { allowed: boolean; remainingMs: number } {
    return this.checkRateLimit(`submit_feedback_${userUID}`, 5000); // 5s cooldown
  }

  canPerformNotificationAction(userUID: string): { allowed: boolean; remainingMs: number } {
    return this.checkRateLimit(`notification_action_${userUID}`, 1000); // 1s cooldown
  }
}

export const rateLimiter = new ClientRateLimiter();
