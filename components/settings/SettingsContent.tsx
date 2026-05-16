"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { ThemeToggle } from "@/components/utility/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import { logout } from "@/app/actions/auth";
import { useUnitSystem } from "@/lib/unit-system-context";
import {
  Palette,
  Bell,
  Smartphone,
  Watch,
  ChevronRight,
  Globe,
  Info,
  LogOut,
  Zap,
  Heart,
  Utensils,
  Download,
  AlertCircle,
} from "lucide-react";

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsContent({ email }: { email: string }) {
  const [preferences, setPreferences] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { system, setSystem } = useUnitSystem();

  // Load preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch("/api/settings/preferences");
        if (!response.ok) throw new Error("Failed to load preferences");
        const data = await response.json();
        setPreferences(data);
        setError(null);
      } catch (err) {
        setError("Failed to load preferences");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/settings/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save preferences");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/settings/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "json",
          data_types: ["workouts", "nutrition", "recovery", "body_metrics", "analytics"],
        }),
      });

      if (!response.ok) throw new Error("Export failed");
      const data = await response.json();

      if (data.file_url) {
        const link = document.createElement("a");
        link.href = data.file_url;
        link.download = `fitness-data-${new Date().toISOString().split("T")[0]}.json`;
        link.click();
      }
    } catch (err) {
      setError("Export failed");
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading preferences...</p>
        </div>
      </PageContainer>
    );
  }

  if (!preferences) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Failed to load preferences</p>
        </div>
      </PageContainer>
    );
  }

  const updatePreference = (path: string[], value: any) => {
    setPreferences((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your fitness experience</p>
      </SectionContainer>

      {/* Status Messages */}
      {error && (
        <SectionContainer className="mb-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertCircle size={18} className="text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        </SectionContainer>
      )}

      {success && (
        <SectionContainer className="mb-4">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <span className="text-sm text-green-700 dark:text-green-400">Settings saved successfully</span>
          </div>
        </SectionContainer>
      )}

      {/* Appearance */}
      <SectionContainer>
        <SectionCard title="Appearance" action={<Palette size={16} className="text-muted-foreground" />}>
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div className="flex items-center gap-2">
              <Label htmlFor="theme-toggle" className="text-xs text-muted-foreground">Toggle</Label>
              <ThemeToggle />
            </div>
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* App Preferences */}
      <SectionContainer>
        <SectionCard title="App Preferences" action={<Smartphone size={16} className="text-muted-foreground" />}>
          <SettingRow label="Measurement Units" description={system === "metric" ? "Metric (kg, cm)" : "Imperial (lbs, ft/in)"}>
            <Switch checked={system === "metric"} onCheckedChange={(checked) => setSystem(checked ? "metric" : "imperial")} />
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Training Personalization */}
      <SectionContainer>
        <SectionCard title="Training Personalization" action={<Zap size={16} className="text-muted-foreground" />}>
          <SettingRow label="Progression Aggressiveness" description="How fast you progress in workouts">
            <Select
              value={preferences.training_preferences?.progression_aggressiveness || "balanced"}
              onValueChange={(value) => updatePreference(["training_preferences", "progression_aggressiveness"], value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservative</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="aggressive">Aggressive</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Training Focus" description="Customize training emphasis">
            <Select
              value={preferences.training_preferences?.training_bias || "balanced"}
              onValueChange={(value) => updatePreference(["training_preferences", "training_bias"], value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aesthetics">Aesthetics</SelectItem>
                <SelectItem value="strength">Strength</SelectItem>
                <SelectItem value="endurance">Endurance</SelectItem>
                <SelectItem value="recovery">Recovery</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Workout Split" description="Preferred training structure">
            <Select
              value={preferences.training_preferences?.workout_split || "push_pull_legs"}
              onValueChange={(value) => updatePreference(["training_preferences", "workout_split"], value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="push_pull_legs">Push / Pull / Legs</SelectItem>
                <SelectItem value="upper_lower">Upper / Lower</SelectItem>
                <SelectItem value="full_body">Full Body</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Session Duration" description={`${preferences.training_preferences?.session_duration_preference || 60} minutes`}>
            <div className="flex items-center gap-3">
              <Slider
                value={preferences.training_preferences?.session_duration_preference || 60}
                onValueChange={(value) => updatePreference(["training_preferences", "session_duration_preference"], value)}
                min={30}
                max={120}
                step={5}
                className="w-32"
              />
            </div>
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Recovery Settings */}
      <SectionContainer>
        <SectionCard title="Recovery Settings" action={<Heart size={16} className="text-muted-foreground" />}>
          <SettingRow label="Recovery Sensitivity" description="How cautious the app is about your readiness">
            <Select
              value={preferences.recovery_preferences?.recovery_sensitivity || "balanced"}
              onValueChange={(value) => updatePreference(["recovery_preferences", "recovery_sensitivity"], value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Athlete Mode" description="Advanced recovery metrics and controls">
            <Switch
              checked={preferences.recovery_preferences?.athlete_mode || false}
              onCheckedChange={(checked) => updatePreference(["recovery_preferences", "athlete_mode"], checked)}
            />
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Nutrition Settings */}
      <SectionContainer>
        <SectionCard title="Nutrition Settings" action={<Utensils size={16} className="text-muted-foreground" />}>
          <SettingRow label="Calorie Strategy" description="Your nutrition approach">
            <Select
              value={preferences.nutrition_preferences?.calorie_strategy || "maintenance"}
              onValueChange={(value) => updatePreference(["nutrition_preferences", "calorie_strategy"], value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deficit">Deficit (Fat Loss)</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="surplus">Surplus (Muscle Gain)</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow label="Macro Strategy" description="Macronutrient distribution approach">
            <Select
              value={preferences.nutrition_preferences?.macro_strategy || "balanced"}
              onValueChange={(value) => updatePreference(["nutrition_preferences", "macro_strategy"], value)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high_protein">High Protein</SelectItem>
                <SelectItem value="low_carb">Low Carb</SelectItem>
                <SelectItem value="balanced">Balanced</SelectItem>
                <SelectItem value="keto">Ketogenic</SelectItem>
              </SelectContent>
            </Select>
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Notifications */}
      <SectionContainer>
        <SectionCard title="Notifications" action={<Bell size={16} className="text-muted-foreground" />}>
          <SettingRow label="Workout Reminders" description="Daily training prompts">
            <Switch
              checked={preferences.notification_preferences?.workout_reminders ?? true}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "workout_reminders"], checked)}
            />
          </SettingRow>

          <SettingRow label="Nutrition Alerts" description="Meal logging reminders">
            <Switch
              checked={preferences.notification_preferences?.nutrition_alerts ?? false}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "nutrition_alerts"], checked)}
            />
          </SettingRow>

          <SettingRow label="Recovery Warnings" description="Low readiness alerts">
            <Switch
              checked={preferences.notification_preferences?.recovery_warnings ?? true}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "recovery_warnings"], checked)}
            />
          </SettingRow>

          <SettingRow label="Hydration Reminders" description="Daily hydration prompts">
            <Switch
              checked={preferences.notification_preferences?.hydration_reminders ?? false}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "hydration_reminders"], checked)}
            />
          </SettingRow>

          <SettingRow label="Weekly Reports" description="Summary notifications">
            <Switch
              checked={preferences.notification_preferences?.weekly_report_notifications ?? true}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "weekly_report_notifications"], checked)}
            />
          </SettingRow>

          <SettingRow label="Quiet Hours" description="No notifications between set times">
            <Switch
              checked={preferences.notification_preferences?.quiet_hours_enabled ?? false}
              onCheckedChange={(checked) => updatePreference(["notification_preferences", "quiet_hours_enabled"], checked)}
            />
          </SettingRow>

          {preferences.notification_preferences?.quiet_hours_enabled && (
            <>
              <SettingRow label="Start Time" description="When quiet hours begin">
                <input
                  type="time"
                  value={preferences.notification_preferences?.quiet_hours_start || "22:00"}
                  onChange={(e) => updatePreference(["notification_preferences", "quiet_hours_start"], e.target.value)}
                  className="px-2 py-1 text-sm border border-border rounded"
                />
              </SettingRow>

              <SettingRow label="End Time" description="When quiet hours end">
                <input
                  type="time"
                  value={preferences.notification_preferences?.quiet_hours_end || "08:00"}
                  onChange={(e) => updatePreference(["notification_preferences", "quiet_hours_end"], e.target.value)}
                  className="px-2 py-1 text-sm border border-border rounded"
                />
              </SettingRow>
            </>
          )}
        </SectionCard>
      </SectionContainer>

      {/* Wearable Integrations */}
      <SectionContainer>
        <SectionCard title="Wearable Integrations" subtitle="Connect your devices for automatic data sync" action={<Watch size={16} className="text-muted-foreground" />}>
          {["Apple Health", "Garmin Connect", "Fitbit", "Polar", "Wahoo"].map((integration) => (
            <SettingRow key={integration} label={integration}>
              <StatusChip label="Coming soon" variant="neutral" />
            </SettingRow>
          ))}
        </SectionCard>
      </SectionContainer>

      {/* Data & Privacy */}
      <SectionContainer>
        <SectionCard title="Data & Privacy" action={<Download size={16} className="text-muted-foreground" />}>
          <SettingRow label="Export Your Data" description="Download all your fitness data">
            <Button size="sm" variant="outline" onClick={handleExport}>
              Export JSON
            </Button>
          </SettingRow>

          <SettingRow label="Data Privacy" description="Your data is encrypted and secure">
            <StatusChip label="Protected" variant="success" />
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* About */}
      <SectionContainer>
        <SectionCard title="About" action={<Info size={16} className="text-muted-foreground" />}>
          <SettingRow label="Version" description="Myostat Stage 12">
            <span className="text-xs text-muted-foreground">12.0.0</span>
          </SettingRow>

          <SettingRow label="Account" description={email}>
            <span className="text-xs text-muted-foreground"></span>
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Save Button */}
      <SectionContainer>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl h-12"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </SectionContainer>

      {/* Sign Out */}
      <SectionContainer>
        <form action={logout}>
          <Button
            type="submit"
            variant="outline"
            className="w-full rounded-2xl h-12 text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive/50"
          >
            <LogOut size={16} className="mr-2" />
            Sign Out
          </Button>
        </form>
      </SectionContainer>
    </PageContainer>
  );
}
