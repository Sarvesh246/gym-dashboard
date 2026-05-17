"use client";

import { useEffect, useState, useCallback } from "react";
import { getNetworkQuality, type NetworkQuality } from "@/lib/offline/syncManager";

export interface NetworkStatus {
  online: boolean;
  quality: NetworkQuality;
}

export function useNetworkStatus(): NetworkStatus {
  // Safe initial state: assume online. Both SSR and client hydration
  // use this value so they always match, preventing React error #418.
  // The real network state is read in useEffect (client-only, post-hydration).
  const [status, setStatus] = useState<NetworkStatus>({ online: true, quality: "online" });

  const update = useCallback(() => {
    setStatus({
      online: navigator.onLine,
      quality: getNetworkQuality(),
    });
  }, []);

  useEffect(() => {
    // Sync real state immediately after hydration
    update();

    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    // Also monitor Network Information API changes
    const conn = (navigator as Navigator & { connection?: EventTarget }).connection;
    conn?.addEventListener("change", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
      conn?.removeEventListener("change", update);
    };
  }, [update]);

  return status;
}
