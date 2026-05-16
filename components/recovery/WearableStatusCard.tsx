"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, Watch } from "lucide-react";

interface WearableStatus {
  provider: string;
  connected: boolean;
  last_synced_at: string | null;
  sync_health?: {
    isStale: boolean;
    daysSinceSync: number;
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  garmin: "Garmin Connect",
  apple: "Apple Health",
  fitbit: "Fitbit",
  polar: "Polar",
  wahoo: "Wahoo",
};

export function WearableStatusCard() {
  const [statuses, setStatuses] = useState<WearableStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/wearables/status");
      if (!response.ok) throw new Error("Failed to fetch status");
      const data = await response.json();
      setStatuses(data.providers || []);
    } catch (err) {
      setError("Failed to load wearable status");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const connectedCount = statuses.filter((s) => s.connected).length;
  const hasStaleData = statuses.some((s) => s.sync_health?.isStale && s.connected);

  if (loading) {
    return (
      <SectionCard title="Wearable Devices" action={<Watch size={16} className="text-muted-foreground" />}>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin mr-2" size={16} />
          <span className="text-sm text-muted-foreground">Loading wearables...</span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Wearable Devices"
      action={<Watch size={16} className="text-muted-foreground" />}
      subtitle={connectedCount > 0 ? `${connectedCount} connected` : "No devices connected"}
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}

      {hasStaleData && (
        <div className="mb-4 p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-warning mt-0.5 shrink-0" />
          <span className="text-xs text-warning">Some wearable data is stale. Sync to refresh.</span>
        </div>
      )}

      <div className="space-y-3">
        {statuses.slice(0, 3).map((status) => {
          const label = PROVIDER_LABELS[status.provider] || status.provider;
          const daysSince = status.sync_health?.daysSinceSync || null;
          const isStale = status.sync_health?.isStale || false;

          return (
            <div
              key={status.provider}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{label}</p>
                {status.connected && daysSince !== null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {daysSince === 0
                      ? "Synced today"
                      : daysSince === 1
                        ? "Synced yesterday"
                        : `${daysSince} days ago`}
                    {isStale && " (stale)"}
                  </p>
                )}
              </div>
              <div className="shrink-0 ml-2">
                {status.connected ? (
                  <StatusChip label="Connected" variant="success" />
                ) : (
                  <StatusChip label="Disconnected" variant="neutral" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="w-full">
            Manage Devices
          </Button>
        </Link>
      </div>
    </SectionCard>
  );
}
