"use client";

import { metaGet, metaSet } from "@/lib/cache/indexedDB";

const DISMISSED_KEY = "pwa-install-dismissed";

// Holds the deferred BeforeInstallPromptEvent so we can trigger it later
let deferredPrompt: Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> } | null = null;

export function captureInstallPrompt(): () => void {
  const handler = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as typeof deferredPrompt;
    window.dispatchEvent(new CustomEvent("pwa:installable"));
  };

  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}

export async function isInstallPromptDismissed(): Promise<boolean> {
  const val = await metaGet<boolean>(DISMISSED_KEY);
  return val === true;
}

export async function dismissInstallPrompt(): Promise<void> {
  await metaSet(DISMISSED_KEY, true);
  deferredPrompt = null;
}

export async function triggerInstallPrompt(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";

  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (outcome === "accepted") return "accepted";
  return "dismissed";
}

export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
