"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  label?: string;
  className?: string;
}

export function RetryButton({ onRetry, label = "Try again", className }: RetryButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      await onRetry();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-60",
        className
      )}
    >
      <RefreshCw size={14} className={cn("shrink-0", loading && "animate-spin")} />
      {label}
    </button>
  );
}
