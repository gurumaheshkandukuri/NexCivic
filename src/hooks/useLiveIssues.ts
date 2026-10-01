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

  const scope = options.scope;
  const userId = options.userId;
  const state = options.state;
  const district = options.district;
  const enabled = options.enabled;
  const filtersKey = JSON.stringify(options.filters);

  useEffect(() => {
    if (enabled === false) return;

    // Guard: Don't subscribe or fire un-scoped queries if required role parameters are not ready
    if ((scope === "user" || scope === "inspector") && !userId) {
      setIssues([]);
      setIsSyncing(false);
      return;
    }
    if (scope === "hq" && !state) {
      setIssues([]);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);

    const listenerKey = `${scope}:${userId || ""}:${state || ""}:${district || ""}:${filtersKey}`;

    if (import.meta.env.DEV) {
      const current = _listenerRegistry.get(listenerKey) || 0;
      if (current > 0) {
        console.warn(`[NexCivic Realtime] Listener active for: ${listenerKey}`);
      }
      _listenerRegistry.set(listenerKey, current + 1);
    }

    const unsub = subscribeToIssues(
      { scope, userId, state, district, filters: options.filters },
      (data, metadata) => {
        setIssues(data);
        setLastSynced(new Date());
        setIsSyncing(metadata.hasPendingWrites);
        setIsOffline(metadata.fromCache);
      }
    );

    return () => {
      unsub && unsub();
      if (import.meta.env.DEV) {
        const current = _listenerRegistry.get(listenerKey) || 1;
        _listenerRegistry.set(listenerKey, Math.max(0, current - 1));
      }
    };
  }, [scope, userId, state, district, enabled, filtersKey]);

  return { issues, isSyncing, isOffline, lastSynced };
}
