/// <reference types="vite/client" />
import { useState, useEffect } from "react";
import { Notification } from "../types";
import { subscribeToNotifications } from "../services/notificationService";

// Development-only listener registry to prevent duplicate active listeners
const _listenerRegistry = new Map<string, number>();

export function useLiveNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(true);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setIsSyncing(false);
      return;
    }

    setIsSyncing(true);
    
    // Create unique key for registry
    const listenerKey = `notifications_${userId}`;
    
    if (import.meta.env.DEV) {
      const current = _listenerRegistry.get(listenerKey) || 0;
      if (current > 0) {
         console.warn(`[NexCivic Realtime] Duplicate listener detected for: ${listenerKey}`);
      }
      _listenerRegistry.set(listenerKey, current + 1);
    }

    const unsub = subscribeToNotifications(userId, (data, metadata) => {
      setNotifications(data);
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
  }, [userId]);

  return { notifications, isSyncing, isOffline, lastSynced };
}
