"use client";

import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { online, quality } = useNetworkStatus();

  if (online && quality !== "slow") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium",
        !online
          ? "bg-destructive/90 text-white"
          : "bg-warning/90 text-foreground"
      )}
    >
      <WifiOff size={14} className="shrink-0" />
      <span>
        {!online
          ? "You're offline — showing cached data"
          : "Slow connection — some data may be delayed"}
      </span>
    </div>
  );
}
