import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  Moon,
  User,
  Settings,
  Activity,
} from "lucide-react";

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Workouts", href: "/workouts", icon: Dumbbell },
  { label: "Nutrition", href: "/nutrition", icon: Apple },
  { label: "Recovery", href: "/recovery", icon: Moon },
  { label: "Body Map", href: "/body-map", icon: Activity },
  { label: "Profile", href: "/profile", icon: User },
] as const;

export const SETTINGS_NAV = {
  label: "Settings",
  href: "/settings",
  icon: Settings,
} as const;

export const APP_NAME = "Myostat";
export const APP_VERSION = "1.0.0";
