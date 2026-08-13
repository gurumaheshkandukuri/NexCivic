// NexCivic Offline Queue Service (IndexedDB)

export type QueueStatus = "Pending" | "Syncing" | "Synced" | "Failed";

export interface QueuedComplaint {
  id: string; // Temporary UUID
  timestamp: number;
  status: QueueStatus;
  retryCount: number;
  error?: string | null;
  complaintData: any; // Complete complaint payload + Base64 evidence images + location
}

const DB_NAME = "NexCivicOfflineDB";
const DB_VERSION = 1;
const STORE_NAME = "queued_complaints";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Enqueue a new complaint to IndexedDB
 */
export async function enqueueComplaint(complaintData: any): Promise<QueuedComplaint | null> {
  try {
    const db = await openDB();
    const tempId = `off_cmp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const queuedItem: QueuedComplaint = {
      id: tempId,
      timestamp: Date.now(),
      status: "Pending",
      retryCount: 0,
      error: null,
      complaintData
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(queuedItem);

      req.onsuccess = () => {
        console.log(`[OfflineQueue] Complaint queued successfully: ${tempId}`);
        window.dispatchEvent(new CustomEvent("nexcivic-queue-updated"));
        resolve(queuedItem);
      };

      req.onerror = () => {
        console.error("[OfflineQueue] Failed to queue complaint:", req.error);
        reject(req.error);
      };
    });
  } catch (err) {
    console.error("[OfflineQueue] Error opening IndexedDB for enqueue:", err);
    return null;
  }
}

/**
 * Get all queued complaints ordered by timestamp (FIFO)
 */
export async function getQueuedComplaints(): Promise<QueuedComplaint[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const items: QueuedComplaint[] = req.result || [];
        // Sort FIFO by timestamp
        items.sort((a, b) => a.timestamp - b.timestamp);
        resolve(items);
      };

      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error("[OfflineQueue] Error reading queued complaints:", err);
    return [];
  }
}

/**
 * Get count of pending or failed complaints
 */
export async function getPendingCount(): Promise<number> {
  const items = await getQueuedComplaints();
  return items.filter(item => item.status === "Pending" || item.status === "Failed" || item.status === "Syncing").length;
}

/**
 * Update an existing queue item's status, retry count, or error
 */
export async function updateQueueItem(id: string, updates: Partial<QueuedComplaint>): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          resolve(false);
          return;
        }

        const updated = { ...existing, ...updates };
        const putReq = store.put(updated);

        putReq.onsuccess = () => {
          window.dispatchEvent(new CustomEvent("nexcivic-queue-updated"));
          resolve(true);
        };

        putReq.onerror = () => resolve(false);
      };

      getReq.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error("[OfflineQueue] Error updating queue item:", err);
    return false;
  }
}

/**
 * Dequeue (delete) a complaint after successful upload confirmation
 */
export async function dequeueComplaint(id: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => {
        console.log(`[OfflineQueue] Dequeued successfully synced complaint: ${id}`);
        window.dispatchEvent(new CustomEvent("nexcivic-queue-updated"));
        resolve(true);
      };

      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error("[OfflineQueue] Error dequeuing complaint:", err);
    return false;
  }
}
