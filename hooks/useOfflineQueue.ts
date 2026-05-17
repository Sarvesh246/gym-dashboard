"use client";

import { useEffect, useState, useCallback } from "react";
import { getPendingCount, flushQueue } from "@/lib/offline/offlineQueue";
import { startSyncScheduler, onSync } from "@/lib/offline/syncManager";
import { useNetworkStatus } from "./useNetworkStatus";

export interface OfflineQueueState {
  pendingCount: number;
  syncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
}

export function useOfflineQueue(): OfflineQueueState {
  const { online } = useNetworkStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshCount();

    const stopScheduler = startSyncScheduler();

    const unsubscribe = onSync((result) => {
      setSyncing(false);
      setLastSyncAt(new Date());
      refreshCount();
      if (process.env.NODE_ENV === "development") {
        console.debug("[sync]", result);
      }
    });

    return () => {
      stopScheduler();
      unsubscribe();
    };
  }, [refreshCount]);

  // Sync when coming back online
  useEffect(() => {
    if (online) refreshCount();
  }, [online, refreshCount]);

  const syncNow = useCallback(async () => {
    if (!online || syncing) return;
    setSyncing(true);
    try {
      await flushQueue();
    } finally {
      setSyncing(false);
      setLastSyncAt(new Date());
      refreshCount();
    }
  }, [online, syncing, refreshCount]);

  return { pendingCount, syncing, lastSyncAt, syncNow };
}
