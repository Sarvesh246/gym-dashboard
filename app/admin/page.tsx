"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Flag,
  Activity,
  HeartPulse,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  Shield,
  ToggleLeft,
  ToggleRight,
  Clock,
  Zap,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SystemHealth {
  timestamp: string;
  db: { ok: boolean };
  features: { total: number; enabled: number };
  usage_last_24h: number;
  rate_limited_last_24h: number;
  wearable_syncs_last_24h: number;
  admin_actions_last_7d: number;
}

interface Feature {
  feature_key: string;
  enabled_by_default: boolean;
  description: string;
}

interface UsageEvent {
  id: string;
  user_id: string;
  event_type: string;
  metadata_json: Record<string, unknown>;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
}

type Tab = "health" | "features" | "usage" | "users";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  ok,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  ok?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
      <div
        className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
          ok === false
            ? "bg-destructive/10 text-destructive"
            : ok === true
            ? "bg-green-500/10 text-green-500"
            : "bg-muted text-muted-foreground"
        }`}
      >
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

// ── Health Tab ───────────────────────────────────────────────────────────────

function HealthTab() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/health");
      if (res.status === 403) { setError("Access denied — admin only."); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setHealth(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load health data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading system health..." />;
  if (error) return <ErrorBanner message={error} />;
  if (!health) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">System Health</h2>
          <p className="text-xs text-muted-foreground">
            Last checked: {relativeTime(health.timestamp)}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Database"
          value={health.db.ok ? "Connected" : "Error"}
          icon={health.db.ok ? CheckCircle2 : XCircle}
          ok={health.db.ok}
        />
        <StatCard
          label="Features enabled"
          value={`${health.features.enabled} / ${health.features.total}`}
          icon={Flag}
        />
        <StatCard
          label="API calls (24h)"
          value={health.usage_last_24h}
          icon={Activity}
        />
        <StatCard
          label="Rate limited (24h)"
          value={health.rate_limited_last_24h}
          icon={AlertCircle}
          ok={health.rate_limited_last_24h === 0}
        />
        <StatCard
          label="Wearable syncs (24h)"
          value={health.wearable_syncs_last_24h}
          icon={HeartPulse}
        />
        <StatCard
          label="Admin actions (7d)"
          value={health.admin_actions_last_7d}
          icon={Shield}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground mb-2">Architecture Mode</p>
        <div className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${
              process.env.NEXT_PUBLIC_SAAS_MODE === "true"
                ? "bg-blue-500"
                : "bg-green-500"
            }`}
          />
          <span className="text-sm text-foreground">
            {process.env.NEXT_PUBLIC_SAAS_MODE === "true"
              ? "SaaS mode (multi-tenant)"
              : "Single-user mode (default)"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Features Tab ─────────────────────────────────────────────────────────────

function FeaturesTab() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/features");
      if (res.status === 403) { setError("Access denied — admin only."); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setFeatures(data.features ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (feature: Feature) => {
    setToggling(feature.feature_key);
    try {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "set_default",
          feature_key: feature.feature_key,
          enabled: !feature.enabled_by_default,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setFeatures((prev) =>
        prev.map((f) =>
          f.feature_key === feature.feature_key
            ? { ...f, enabled_by_default: !f.enabled_by_default }
            : f
        )
      );
      setSuccessMsg(`'${feature.feature_key}' updated`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setToggling(null);
    }
  };

  if (loading) return <LoadingSpinner label="Loading features..." />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Feature Flags</h2>
          <p className="text-xs text-muted-foreground">
            Global defaults — no pricing logic, no billing.
          </p>
        </div>
        {successMsg && (
          <span className="text-xs text-green-500 flex items-center gap-1">
            <CheckCircle2 size={12} /> {successMsg}
          </span>
        )}
      </div>

      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {features.map((f) => (
          <div
            key={f.feature_key}
            className="flex items-center justify-between px-4 py-3 bg-card"
          >
            <div className="min-w-0 flex-1 mr-4">
              <p className="text-sm font-medium text-foreground font-mono">
                {f.feature_key}
              </p>
              <p className="text-xs text-muted-foreground truncate">{f.description}</p>
            </div>
            <button
              onClick={() => toggle(f)}
              disabled={toggling === f.feature_key}
              className="shrink-0 transition-colors disabled:opacity-50"
              aria-label={`Toggle ${f.feature_key}`}
            >
              {f.enabled_by_default ? (
                <ToggleRight size={24} className="text-primary" />
              ) : (
                <ToggleLeft size={24} className="text-muted-foreground" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Usage Tab ─────────────────────────────────────────────────────────────────

function UsageTab() {
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState("7d");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/usage?limit=50&since=${since}`);
      if (res.status === 403) { setError("Access denied — admin only."); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEvents(data.events ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load usage events");
    } finally {
      setLoading(false);
    }
  }, [since]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <LoadingSpinner label="Loading usage events..." />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Usage Events</h2>
          <p className="text-xs text-muted-foreground">{total} events total (showing 50)</p>
        </div>
        <div className="flex gap-2">
          {["24h", "7d", "30d"].map((s) => (
            <button
              key={s}
              onClick={() => setSince(s === "24h" ? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() : s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                since === s || (s === "24h" && since !== "7d" && since !== "30d")
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {events.length === 0 ? (
        <EmptyState message="No usage events recorded yet." />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {events.map((e) => (
            <div key={e.id} className="px-4 py-3 bg-card flex items-start gap-3">
              <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={14} className="text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground font-mono">
                  {e.event_type}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  user: {e.user_id.slice(0, 8)}…
                </p>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                <Clock size={10} />
                {relativeTime(e.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Users Tab ──────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/users?limit=50");
        if (res.status === 403) { setError("Access denied — admin only."); return; }
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setUsers(data.users ?? []);
        setTotal(data.total ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load users");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner label="Loading users..." />;
  if (error) return <ErrorBanner message={error} />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        <p className="text-xs text-muted-foreground">{total} total users</p>
      </div>

      {users.length === 0 ? (
        <EmptyState message="No users found." />
      ) : (
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="px-4 py-3 bg-card flex items-center gap-3">
              <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">
                  {(u.email?.[0] ?? "?").toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                <p className="text-xs text-muted-foreground">
                  Joined {relativeTime(u.created_at)}
                  {u.last_sign_in_at ? ` · Last seen ${relativeTime(u.last_sign_in_at)}` : ""}
                </p>
              </div>
              {u.confirmed ? (
                <CheckCircle2 size={14} className="text-green-500 shrink-0" />
              ) : (
                <AlertCircle size={14} className="text-amber-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Shared UI primitives ──────────────────────────────────────────────────────

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
      <RefreshCw size={16} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex gap-3">
      <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "features", label: "Features", icon: Flag },
  { id: "usage", label: "Usage", icon: Activity },
  { id: "users", label: "Users", icon: Users },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("health");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">
              System control · No billing · No subscriptions
            </p>
          </div>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 bg-muted rounded-xl p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div>
          {activeTab === "health" && <HealthTab />}
          {activeTab === "features" && <FeaturesTab />}
          {activeTab === "usage" && <UsageTab />}
          {activeTab === "users" && <UsersTab />}
        </div>

        {/* Wearable sync link */}
        <a
          href="/admin/sync"
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <HeartPulse size={16} className="text-muted-foreground" />
            <span className="text-sm text-foreground">WGER Exercise Sync</span>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </a>
      </div>
    </div>
  );
}
