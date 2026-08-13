// NexCivic Automatic Queue Manager & Background Synchronizer
import { getQueuedComplaints, updateQueueItem, dequeueComplaint, QueuedComplaint } from "./offlineQueue";
import { createIssue } from "./issueService";

class QueueManager {
  private isSyncing: boolean = false;
  private initialized: boolean = false;

  public init() {
    if (this.initialized) return;
    this.initialized = true;

    console.log("[QueueManager] Initializing Background Sync Manager...");

    // Listen for online reconnection event
    window.addEventListener("online", () => {
      console.log("[QueueManager] Internet connection restored. Triggering automatic background sync...");
      this.triggerSync();
    });

    // Listen for new items enqueued or requested manually
    window.addEventListener("nexcivic-queue-updated", () => {
      if (navigator.onLine && !this.isSyncing) {
        this.triggerSync();
      }
    });

    // Trigger initial sync check if online
    if (navigator.onLine) {
      setTimeout(() => this.triggerSync(), 2000);
    }
  }

  /**
   * Process all queued complaints sequentially with synchronization lock & exponential backoff
   */
  public async triggerSync() {
    if (this.isSyncing) {
      console.log("[QueueManager] Sync operation already in progress. Skipping duplicate run.");
      return;
    }

    if (!navigator.onLine) {
      console.log("[QueueManager] Device is offline. Sync deferred until network returns.");
      return;
    }

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent("nexcivic-sync-state", { detail: { syncing: true } }));

    try {
      const items = await getQueuedComplaints();
      const pendingItems = items.filter(
        (item) => item.status === "Pending" || item.status === "Failed"
      );

      if (pendingItems.length === 0) {
        console.log("[QueueManager] No pending complaints to sync.");
        this.isSyncing = false;
        window.dispatchEvent(new CustomEvent("nexcivic-sync-state", { detail: { syncing: false } }));
        return;
      }

      console.log(`[QueueManager] Processing ${pendingItems.length} queued complaints sequentially...`);

      for (const item of pendingItems) {
        if (!navigator.onLine) {
          console.warn("[QueueManager] Connection lost mid-sync. Pausing queue processing.");
          break;
        }

        // Exponential backoff check: if item previously failed, verify delay has elapsed
        if (item.status === "Failed" && item.retryCount > 0) {
          const backoffDelay = Math.min(1000 * Math.pow(2, item.retryCount), 60000);
          const timeSinceLastAttempt = Date.now() - item.timestamp;
          if (timeSinceLastAttempt < backoffDelay) {
            console.log(`[QueueManager] Skipping item ${item.id} due to exponential backoff (${Math.round((backoffDelay - timeSinceLastAttempt)/1000)}s remaining)`);
            continue;
          }
        }

        // Mark item as Syncing
        await updateQueueItem(item.id, { status: "Syncing" });

        try {
          console.log(`[QueueManager] Uploading queued complaint ${item.id}...`);
          const result = await createIssue(item.complaintData);

          if (result && result.id) {
            console.log(`[QueueManager] ✅ Successfully uploaded complaint ${item.id} -> Firestore ID: ${result.id}`);
            // Delete item from IndexedDB ONLY after confirmed upload to prevent duplicate submissions
            await dequeueComplaint(item.id);
          } else {
            throw new Error("Invalid response from createIssue submission");
          }
        } catch (err: any) {
          console.error(`[QueueManager] ❌ Upload failed for item ${item.id}:`, err);
          const newRetryCount = item.retryCount + 1;
          await updateQueueItem(item.id, {
            status: "Failed",
            retryCount: newRetryCount,
            error: err?.message || "Upload error"
          });
        }
      }
    } catch (globalErr) {
      console.error("[QueueManager] Global sync error:", globalErr);
    } finally {
      this.isSyncing = false;
      window.dispatchEvent(new CustomEvent("nexcivic-sync-state", { detail: { syncing: false } }));
    }
  }
}

export const queueManager = new QueueManager();
