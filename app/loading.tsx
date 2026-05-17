import { DashboardSkeleton } from "@/components/loading/DashboardSkeleton";

// Root loading.tsx — shown while the dashboard page suspends
export default function Loading() {
  return <DashboardSkeleton />;
}
