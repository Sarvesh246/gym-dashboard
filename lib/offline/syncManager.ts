"use client";

import { flushQueue, type SyncResult } from "./offlineQueue";
import { metaGet, metaSet } from "@/lib/cache/indexedDB";

let syncInProgress = false;
let scheduledTimer: ReturnType<typeof setTimeout> | null = null;

const SYNC_INTERVAL_MS = 30_000; // 30 sec polling when online
const IDLE_SYNC_DELAY_MS = 2_000; // 2 sec debounce after regaining connection

type SyncListener = (result: SyncResult) => void;
const listeners: Set<SyncListener> = new Set();

export function onSync(cb: SyncListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function emit(result: SyncResult) {
  listeners.forEach((cb) => cb(result));
}

// ── Core sync ─────────────────────────────────────────────────────────────────

export async function triggerSync(): Promise<SyncResult | null> {
  if (syncInProgress || !navigator.onLine) return null;

  syncInProgress = true;
  try {
    const result = await flushQueue();
    await metaSet("lastSyncAt", Date.now());
    emit(result);
    return result;
  } finally {
    syncInProgress = false;
  }
}

export async function getLastSyncTime(): Promise<number | null> {
  return metaGet<number>("lastSyncAt");
}

// ── Scheduler ─────────────────────────────────────────────────────────────────

export function startSyncScheduler(): () => void {
  // Attempt sync immediately on start
  triggerSync();

  // Periodic sync while online
  const interval = setInterval(() => {
    if (navigator.onLine) triggerSync();
  }, SYNC_INTERVAL_MS);

  // Reconnect trigger
  const handleOnline = () => {
    if (scheduledTimer) clearTimeout(scheduledTimer);
    scheduledTimer = setTimeout(triggerSync, IDLE_SYNC_DELAY_MS);
  };

  // SW background sync trigger
  const handleMessage = (e: MessageEvent) => {
    if (e.data?.type === "SYNC_REQUESTED") triggerSync();
  };

  window.addEventListener("online", handleOnline);
  navigator.serviceWorker?.addEventListener("message", handleMessage);

  return () => {
    clearInterval(interval);
    if (scheduledTimer) clearTimeout(scheduledTimer);
    window.removeEventListener("online", handleOnline);
    navigator.serviceWorker?.removeEventListener("message", handleMessage);
  };
}

// ── Network quality ───────────────────────────────────────────────────────────

export type NetworkQuality = "offline" | "slow" | "online";

export function getNetworkQuality(): NetworkQuality {
  if (!navigator.onLine) return "offline";

  // Use Network Information API when available
  const conn = (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }).connection;
  if (conn) {
    if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") return "slow";
    if (conn.downlink !== undefined && conn.downlink < 0.5) return "slow";
  }

  return "online";
}
