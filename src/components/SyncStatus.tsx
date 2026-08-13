import React, { useState, useEffect } from "react";
import { 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  CloudUpload 
} from "lucide-react";
import { getPendingCount, getQueuedComplaints } from "../services/offlineQueue";
import { queueManager } from "../services/queueManager";

export default function SyncStatus() {
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [hasFailed, setHasFailed] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showSyncedSuccess, setShowSyncedSuccess] = useState<boolean>(false);

  const refreshQueueStats = async () => {
    const count = await getPendingCount();
    const items = await getQueuedComplaints();
    const failedExists = items.some((item) => item.status === "Failed");

    if (pendingCount > 0 && count === 0) {
      setShowSyncedSuccess(true);
      setTimeout(() => setShowSyncedSuccess(false), 4000);
    }

    setPendingCount(count);
    setHasFailed(failedExists);
  };

  useEffect(() => {
    refreshQueueStats();

    const handleQueueUpdate = () => refreshQueueStats();
    const handleSyncState = (e: Event) => {
      const custom = e as CustomEvent<{ syncing: boolean }>;
      setIsSyncing(custom.detail?.syncing || false);
      refreshQueueStats();
    };

    window.addEventListener("nexcivic-queue-updated", handleQueueUpdate);
    window.addEventListener("nexcivic-sync-state", handleSyncState);
    window.addEventListener("online", handleQueueUpdate);
    window.addEventListener("offline", handleQueueUpdate);

    return () => {
      window.removeEventListener("nexcivic-queue-updated", handleQueueUpdate);
      window.removeEventListener("nexcivic-sync-state", handleSyncState);
      window.removeEventListener("online", handleQueueUpdate);
      window.removeEventListener("offline", handleQueueUpdate);
    };
  }, []);

  const handleManualRetry = () => {
    queueManager.triggerSync();
  };

  if (pendingCount === 0 && !showSyncedSuccess) {
    return null;
  }

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 z-40 max-w-xs w-auto p-3 bg-[#0b0f19]/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl text-slate-100 animate-slideUp glass">
      {isSyncing ? (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <RefreshCw className="w-4 h-4 animate-spin" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Uploading complaints...</span>
            <span className="text-[10px] text-cyan-400 block font-mono">Syncing {pendingCount} item(s)</span>
          </div>
        </div>
      ) : hasFailed ? (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-200 block">Upload paused</span>
            <span className="text-[10px] text-rose-400 block font-mono">{pendingCount} item(s) pending retry</span>
          </div>
          <button
            onClick={handleManualRetry}
            className="py-1 px-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-mono text-[10px] font-bold rounded-lg border border-rose-500/30 touch-target cursor-pointer transition-colors"
          >
            Retry
          </button>
        </div>
      ) : showSyncedSuccess ? (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Everything synced</span>
            <span className="text-[10px] text-emerald-400 block font-mono">All queued complaints uploaded</span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <span className="text-xs font-bold text-slate-200 block">Offline Queue</span>
            <span className="text-[10px] text-amber-400 block font-mono">
              {pendingCount} complaint{pendingCount > 1 ? "s" : ""} waiting to sync
            </span>
          </div>
          {navigator.onLine && (
            <button
              onClick={handleManualRetry}
              className="py-1 px-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-mono text-[10px] font-bold rounded-lg border border-amber-500/30 touch-target cursor-pointer transition-colors flex items-center gap-1"
            >
              <CloudUpload className="w-3 h-3" /> Sync
            </button>
          )}
        </div>
      )}
    </div>
  );
}
