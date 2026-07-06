/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import { Issue } from "../types";
import { subscribeToIssues } from "../services/issueService";

export interface UseLiveIssuesOptions {
  scope: "all" | "user" | "inspector" | "hq";
  userId?: string;
  role?: string;
  state?: string;
  district?: string;
  filters?: {
    category?: string;
    priority?: string;
    status?: string;
  };
  enabled?: boolean;
}

// Development-only listener registry to prevent duplicate active listeners
const _listenerRegistry = new Map<string, number>();

export function useLiveIssues(options: UseLiveIssuesOptions) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    if (options.enabled === false) return;

    setIsSyncing(true);
    
    // Create unique key for registry
    const listenerKey = JSON.stringify(options);
    
    if (import.meta.env.DEV) {
      const current = _listenerRegistry.get(listenerKey) || 0;
      if (current > 0) {
         console.warn(`[NexCivic Realtime] Duplicate listener detected for: ${listenerKey}`);
      }
      _listenerRegistry.set(listenerKey, current + 1);
    }

    const unsub = subscribeToIssues(options, (data, metadata) => {
      setIssues(data);
      setLastSynced(new Date());
      setIsSyncing(metadata.hasPendingWrites); 
      setIsOffline(metadata.fromCache);
    });

    return () => {
      unsub && unsub();
      if (import.meta.env.DEV) {
         const current = _listenerRegistry.get(listenerKey) || 1;
         _listenerRegistry.set(listenerKey, current - 1);
      }
    };
  }, [JSON.stringify(options)]); // deep compare stringified options safely since options object is small

  return { issues, isSyncing, isOffline, lastSynced };
}
