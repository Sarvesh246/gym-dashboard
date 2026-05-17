"use client";

import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export function SyncStatusIndicator({ className }: { className?: string }) {
  const { online } = useNetworkStatus();
  const { pendingCount, syncing, syncNow } = useOfflineQueue();

  if (online && pendingCount === 0 && !syncing) return null;

  return (
    <button
      onClick={syncNow}
      disabled={!online || syncing}
      aria-label={
        syncing
          ? "Syncing data"
          : pendingCount > 0
          ? `${pendingCount} item${pendingCount !== 1 ? "s" : ""} pending sync — tap to sync`
          : "All synced"
      }
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        syncing
          ? "bg-primary/10 text-primary"
          : pendingCount > 0
          ? "bg-warning/10 text-warning cursor-pointer hover:bg-warning/20"
          : "bg-success/10 text-success",
        className
      )}
    >
      {syncing ? (
        <>
          <RefreshCw size={11} className="animate-spin shrink-0" />
          <span>Syncing</span>
        </>
      ) : pendingCount > 0 ? (
        <>
          <AlertCircle size={11} className="shrink-0" />
          <span>{pendingCount} pending</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={11} className="shrink-0" />
          <span>Synced</span>
        </>
      )}
    </button>
  );
}
