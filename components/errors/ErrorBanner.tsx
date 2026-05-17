"use client";

import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  dismissible?: boolean;
  className?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  dismissible = true,
  className,
}: ErrorBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/8 px-4 py-3",
        className
      )}
    >
      <AlertCircle size={15} className="text-destructive shrink-0 mt-0.5" />
      <p className="flex-1 text-sm text-foreground/80">{message}</p>
      <div className="flex items-center gap-2 shrink-0">
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs font-medium text-primary hover:underline"
          >
            Retry
          </button>
        )}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
