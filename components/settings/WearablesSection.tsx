"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/StatusChip";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type { WearableProvider } from "@/lib/wearables/providers";

interface ProviderStatus {
  provider: WearableProvider;
  connected: boolean;
  last_synced_at: string | null;
  sync_health?: {
    isStale: boolean;
    daysSinceSync: number;
  };
}

const PROVIDER_LABELS: Record<string, string> = {
  garmin: "Garmin Connect",
  apple_health: "Apple Health",
  fitbit: "Fitbit",
  polar: "Polar",
  wahoo: "Wahoo",
};

export function WearablesSection() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
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

  const handleConnect = async (provider: WearableProvider) => {
    try {
      setError(null);
      const response = await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "authorize" }),
      });

      if (!response.ok) throw new Error("Failed to get authorization URL");
      const data = await response.json();

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      setError(`Failed to connect ${provider}`);
      console.error(err);
    }
  };

  const handleSync = async (provider: WearableProvider) => {
    try {
      setSyncing(provider);
      setError(null);
      const response = await fetch("/api/wearables/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) throw new Error("Sync failed");
      const data = await response.json();

      if (data.status === "completed" || data.status === "partial") {
        // Refresh status after sync
        setTimeout(() => fetchStatus(), 1000);
      } else {
        setError(`Sync failed: ${data.error}`);
      }
    } catch (err) {
      setError(`Failed to sync ${provider}`);
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-center">
        <Loader2 className="animate-spin mx-auto mb-2" size={20} />
        <p className="text-sm text-muted-foreground">Loading wearables...</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={16} className="text-destructive mt-0.5" />
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}

      <div className="space-y-3">
        {Object.entries(PROVIDER_LABELS).map(([key, label]) => {
          const status = statuses.find((s) => s.provider === key);
          const isConnected = status?.connected || false;
          const isSyncing = syncing === key;
          const daysSince = status?.sync_health?.daysSinceSync || null;
          const isStale = status?.sync_health?.isStale || false;

          return (
            <div
              key={key}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                {isConnected && daysSince !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {daysSince === 0
                      ? "Synced today"
                      : daysSince === 1
                        ? "Synced yesterday"
                        : `Last synced ${daysSince} days ago`}
                    {isStale && " (stale)"}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isConnected ? (
                  <>
                    <StatusChip label="Connected" variant="success" />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleSync(key as WearableProvider)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleConnect(key as WearableProvider)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
