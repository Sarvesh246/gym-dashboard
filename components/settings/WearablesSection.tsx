"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/StatusChip";
import { AlertCircle, Loader2, RefreshCw, Unlink } from "lucide-react";
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

const WEARABLE_UI_ROWS: {
  provider: WearableProvider;
  label: string;
  note?: string;
  aliasProviders?: WearableProvider[];
}[] = [
  { provider: "garmin", label: "Garmin Connect" },
  {
    provider: "fitbit",
    label: "Google Fit",
    aliasProviders: ["google_fit"],
    note:
      "For iPhone: Garmin → Apple Health → Google Fit app. Connect with the same Google account you use in the Google Fit app, then tap Sync.",
  },
  { provider: "apple_health", label: "Apple Health" },
  { provider: "polar", label: "Polar" },
  { provider: "wahoo", label: "Wahoo" },
];

function resolveRowStatus(
  row: (typeof WEARABLE_UI_ROWS)[number],
  statuses: ProviderStatus[]
): {
  connected: boolean;
  sync_health?: ProviderStatus["sync_health"];
  syncProvider: WearableProvider;
  disconnectProviders: WearableProvider[];
} {
  const ids = [row.provider, ...(row.aliasProviders ?? [])];
  const matches = statuses.filter((s) => ids.includes(s.provider));
  const connectedMatches = matches.filter((s) => s.connected);

  if (connectedMatches.length > 0) {
    const primary = connectedMatches[0]!;
    return {
      connected: true,
      sync_health: primary.sync_health,
      syncProvider: primary.provider,
      disconnectProviders: connectedMatches.map((s) => s.provider),
    };
  }

  return {
    connected: false,
    syncProvider: row.provider,
    disconnectProviders: [],
  };
}

export function WearablesSection() {
  const [statuses, setStatuses] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  async function fetchStatus() {
    try {
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
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStatus();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const handleConnect = async (provider: WearableProvider) => {
    try {
      setError(null);
      setSyncNotice(null);
      const response = await fetch("/api/wearables/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, action: "authorize" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to get authorization URL");
      }

      if (data.authUrl) {
        window.location.assign(data.authUrl);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to connect ${provider}`
      );
      console.error(err);
    }
  };

  const handleDisconnect = async (providers: WearableProvider[]) => {
    if (providers.length === 0) return;

    try {
      setDisconnecting(providers[0]!);
      setError(null);
      setSyncNotice(null);

      for (const provider of providers) {
        const response = await fetch("/api/wearables/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, action: "disconnect" }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to disconnect");
        }
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
      console.error(err);
    } finally {
      setDisconnecting(null);
    }
  };

  const handleSync = async (provider: WearableProvider) => {
    try {
      setSyncing(provider);
      setError(null);
      setSyncNotice(null);
      const response = await fetch("/api/wearables/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.details || "Sync failed");
      }

      if (data.status === "failed") {
        setError(data.error || "Sync failed");
        return;
      }

      if (data.status === "completed" || data.status === "partial") {
        if (data.records_processed === 0) {
          setError(
            data.error ||
              "Sync finished but no health data was found. Open the Google Fit app on your phone and confirm your steps/sleep appear there, then try Sync again. If you connected before today, tap Connect and sign in again."
          );
        } else {
          setSyncNotice(
            `Synced ${data.records_processed} day${data.records_processed === 1 ? "" : "s"} of data.`
          );
        }
        setTimeout(() => fetchStatus(), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to sync ${provider}`);
      console.error(err);
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return <WearablesLoading />;
  }

  return (
    <>
      {error && <ErrorBanner message={error} />}

      {syncNotice && !error && <SyncSuccessNotice message={syncNotice} />}

      <div className="space-y-3">
        {WEARABLE_UI_ROWS.map((row) => {
          const { connected, sync_health, syncProvider, disconnectProviders } =
            resolveRowStatus(row, statuses);
          const isSyncing = syncing === syncProvider;
          const isDisconnecting =
            disconnecting !== null &&
            disconnectProviders.includes(disconnecting as WearableProvider);
          const daysSince = sync_health?.daysSinceSync ?? null;
          const isStale = sync_health?.isStale || false;

          return (
            <div
              key={row.provider}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div className="flex-1 min-w-0 pr-2">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                {row.note && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {row.note}
                  </p>
                )}
                {connected && daysSince !== null && (
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

              <WearableRowActions
                connected={connected}
                isSyncing={isSyncing}
                isDisconnecting={isDisconnecting}
                onConnect={() => handleConnect(row.provider)}
                onSync={() => handleSync(syncProvider)}
                onDisconnect={() => handleDisconnect(disconnectProviders)}
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
      <AlertCircle size={16} className="text-destructive mt-0.5 shrink-0" />
      <span className="text-sm text-destructive">{message}</span>
    </div>
  );
}

function WearablesLoading() {
  return (
    <div className="py-4 text-center">
      <Loader2 className="animate-spin mx-auto mb-2" size={20} />
      <p className="text-sm text-muted-foreground">Loading wearables...</p>
    </div>
  );
}

function SyncSuccessNotice({ message }: { message: string }) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
      <span className="text-sm text-emerald-700 dark:text-emerald-400">{message}</span>
    </div>
  );
}

function WearableRowActions({
  connected,
  isSyncing,
  isDisconnecting,
  onConnect,
  onSync,
  onDisconnect,
}: {
  connected: boolean;
  isSyncing: boolean;
  isDisconnecting: boolean;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
}) {
  const busy = isSyncing || isDisconnecting;

  return (
    <div className="flex items-center gap-1 shrink-0">
      {connected ? (
        <>
          <StatusChip label="Connected" variant="success" />
          <Button
            size="sm"
            variant="ghost"
            onClick={onSync}
            disabled={busy}
            aria-label="Sync now"
          >
            {isSyncing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDisconnect}
            disabled={busy}
            aria-label="Disconnect"
            className="text-muted-foreground hover:text-destructive"
          >
            {isDisconnecting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Unlink size={16} />
            )}
          </Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={onConnect}>
          Connect
        </Button>
      )}
    </div>
  );
}
