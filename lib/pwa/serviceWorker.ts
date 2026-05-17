"use client";

// Service worker registration — called once from the root layout client component

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    const reg = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });

    // Check for updates every time app gains focus
    reg.addEventListener("updatefound", () => {
      const incoming = reg.installing;
      if (!incoming) return;
      incoming.addEventListener("statechange", () => {
        if (
          incoming.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          // New SW ready — could show update banner here
          window.dispatchEvent(new CustomEvent("sw:updateready"));
        }
      });
    });

    // Register background sync when supported
    if ("sync" in reg) {
      try {
        // @ts-expect-error — Background Sync API not yet in TS lib
        await reg.sync.register("offline-queue-sync");
      } catch {
        // Not critical
      }
    }

    return reg;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[SW] Registration failed:", err);
    }
    return null;
  }
}
