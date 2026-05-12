"use client";

import { PageContainer } from "@/components/layout/PageContainer";
import { SectionContainer } from "@/components/layout/SectionContainer";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusChip } from "@/components/ui/StatusChip";
import { ThemeToggle } from "@/components/utility/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  const [pushNotifs, setPushNotifs] = useState(false);
  const [workoutReminders, setWorkoutReminders] = useState(true);
  const [nutritionReminders, setNutritionReminders] = useState(false);
  const [sleepReminders, setSleepReminders] = useState(true);
  const { system, setSystem } = useUnitSystem();
  const metricUnits = system === "metric";

  return (
    <PageContainer>
      {/* Header */}
      <SectionContainer className="mb-6">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your experience</p>
      </SectionContainer>

      {/* Appearance */}
      <SectionContainer>
        <SectionCard
          title="Appearance"
          action={<Palette size={16} className="text-muted-foreground" />}
        >
          <SettingRow label="Theme" description="Choose your preferred color scheme">
            <div className="flex items-center gap-2">
              <Label htmlFor="theme-toggle" className="text-xs text-muted-foreground">
                Toggle
              </Label>
              <ThemeToggle />
            </div>
          </SettingRow>
          <SettingRow label="Accent Color" description="Coming in a future update">
            <StatusChip label="Soon" variant="neutral" />
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* App Preferences */}
      <SectionContainer>
        <SectionCard
          title="App Preferences"
          action={<Smartphone size={16} className="text-muted-foreground" />}
        >
          <SettingRow
            label="Measurement Units"
            description={metricUnits ? "Metric (kg, cm)" : "Imperial (lbs, ft/in)"}
          >
            <div className="flex items-center gap-2">
              <Label htmlFor="units-toggle" className="text-xs text-muted-foreground">
                {metricUnits ? "Metric" : "Imperial"}
              </Label>
              <Switch
                id="units-toggle"
                checked={metricUnits}
                onCheckedChange={(checked) => setSystem(checked ? "metric" : "imperial")}
              />
            </div>
          </SettingRow>
          <SettingRow label="Language" description="English (US)">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Globe size={14} />
              <ChevronRight size={14} />
            </div>
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Notifications */}
      <SectionContainer>
        <SectionCard
          title="Notifications"
          action={<Bell size={16} className="text-muted-foreground" />}
        >
          <SettingRow label="Push Notifications" description="Enable all app notifications">
            <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
          </SettingRow>
          <SettingRow label="Workout Reminders" description="Daily training reminders">
            <Switch
              checked={workoutReminders}
              onCheckedChange={setWorkoutReminders}
              disabled={!pushNotifs}
            />
          </SettingRow>
          <SettingRow label="Nutrition Reminders" description="Meal logging prompts">
            <Switch
              checked={nutritionReminders}
              onCheckedChange={setNutritionReminders}
              disabled={!pushNotifs}
            />
          </SettingRow>
          <SettingRow label="Sleep Reminders" description="Bedtime wind-down alerts">
            <Switch
              checked={sleepReminders}
              onCheckedChange={setSleepReminders}
              disabled={!pushNotifs}
            />
          </SettingRow>
        </SectionCard>
      </SectionContainer>

      {/* Wearable Integrations */}
      <SectionContainer>
        <SectionCard
          title="Wearable Integrations"
          subtitle="Connect your devices for automatic data sync"
          action={<Watch size={16} className="text-muted-foreground" />}
        >
          {[
            { name: "Apple Health", icon: "🍎" },
            { name: "Garmin Connect", icon: "⌚" },
            { name: "Fitbit", icon: "📊" },
            { name: "Polar", icon: "❤️" },
            { name: "Wahoo", icon: "🚴" },
          ].map((integration) => (
            <SettingRow key={integration.name} label={integration.name}>
              <StatusChip label="Coming soon" variant="neutral" />
            </SettingRow>
          ))}
        </SectionCard>
      </SectionContainer>

      {/* About */}
      <SectionContainer>
        <SectionCard
          title="About"
          action={<Info size={16} className="text-muted-foreground" />}
        >
          <SettingRow label="Version" description="Myostat Stage 2">
            <span className="text-xs text-muted-foreground">2.0.0</span>
          </SettingRow>
          <SettingRow label="Account" description={email}>
            <span className="text-xs text-muted-foreground"></span>
          </SettingRow>
        </SectionCard>
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
