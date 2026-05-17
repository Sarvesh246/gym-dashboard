"use client";

import { Download, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallPromptBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-80 z-40 rounded-2xl border border-border bg-card shadow-lg p-4 flex items-start gap-3"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Download size={17} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Add to Home Screen</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Install Myostat for faster access and offline use.
        </p>
        <button
          onClick={install}
          className="mt-2 text-xs font-medium text-primary hover:underline"
        >
          Install app
        </button>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        <X size={15} />
      </button>
    </div>
  );
}
