"use client";

import { useEffect, useState, useCallback } from "react";
import {
  captureInstallPrompt,
  isInstallPromptDismissed,
  dismissInstallPrompt,
  triggerInstallPrompt,
  isRunningStandalone,
} from "@/lib/pwa/installPrompt";

export interface InstallPromptState {
  canInstall: boolean;
  isStandalone: boolean;
  install: () => Promise<void>;
  dismiss: () => Promise<void>;
}

export function useInstallPrompt(): InstallPromptState {
  const [canInstall, setCanInstall] = useState(false);
  const isStandalone = isRunningStandalone();

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (isStandalone) return;

    isInstallPromptDismissed().then((dismissed) => {
      if (dismissed) return;
    });

    const cleanup = captureInstallPrompt();

    const handleInstallable = async () => {
      const dismissed = await isInstallPromptDismissed();
      if (!dismissed) setCanInstall(true);
    };

    window.addEventListener("pwa:installable", handleInstallable);

    return () => {
      cleanup();
      window.removeEventListener("pwa:installable", handleInstallable);
    };
  }, [isStandalone]);

  const install = useCallback(async () => {
    const outcome = await triggerInstallPrompt();
    if (outcome !== "unavailable") setCanInstall(false);
  }, []);

  const dismiss = useCallback(async () => {
    await dismissInstallPrompt();
    setCanInstall(false);
  }, []);

  return { canInstall, isStandalone, install, dismiss };
}
