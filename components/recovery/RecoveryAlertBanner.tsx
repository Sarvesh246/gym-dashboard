"use client";

import { useState } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { RecoveryAlert } from "@/services/alerts";

interface RecoveryAlertBannerProps {
  alerts: RecoveryAlert[];
  onDismiss: (alertId: number) => Promise<void>;
}

export function RecoveryAlertBanner({ alerts, onDismiss }: RecoveryAlertBannerProps) {
  const [dismissing, setDismissing] = useState<number | null>(null);

  if (alerts.length === 0) {
    return null;
  }

  // Show top 2 alerts
  const visibleAlerts = alerts.slice(0, 2);

  async function handleDismiss(alertId: number) {
    setDismissing(alertId);
    try {
      await onDismiss(alertId);
    } finally {
      setDismissing(null);
    }
  }

  return (
    <div className="space-y-3">
      {visibleAlerts.map((alert) => {
        const icon =
          alert.severity === "warning" ? (
            <AlertTriangle className="h-4 w-4" />
          ) : alert.severity === "caution" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          );

        const bgColor =
          alert.severity === "warning"
            ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
            : alert.severity === "caution"
              ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
              : "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800";

        const textColor =
          alert.severity === "warning"
            ? "text-red-900 dark:text-red-100"
            : alert.severity === "caution"
              ? "text-yellow-900 dark:text-yellow-100"
              : "text-blue-900 dark:text-blue-100";

        const iconColor =
          alert.severity === "warning"
            ? "text-red-600 dark:text-red-400"
            : alert.severity === "caution"
              ? "text-yellow-600 dark:text-yellow-400"
              : "text-blue-600 dark:text-blue-400";

        return (
          <Card key={alert.id} className={`border ${bgColor} p-3`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <div className={`mt-0.5 ${iconColor}`}>{icon}</div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${textColor}`}>{alert.message}</p>
                  {alert.muscle_specific && alert.muscle_specific.length > 0 && (
                    <p className={`text-xs mt-1 ${textColor} opacity-80`}>
                      Affected: {alert.muscle_specific.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(alert.id)}
                disabled={dismissing === alert.id}
                className="h-6 w-6 p-0 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
