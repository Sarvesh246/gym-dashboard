"use client";

import { useEffect, useState, useCallback } from "react";
import { getNetworkQuality, type NetworkQuality } from "@/lib/offline/syncManager";

export interface NetworkStatus {
  online: boolean;
  quality: NetworkQuality;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() => ({
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    quality: typeof navigator !== "undefined" ? getNetworkQuality() : "online",
  }));

  const update = useCallback(() => {
    setStatus({
      online: navigator.onLine,
      quality: getNetworkQuality(),
    });
  }, []);

  useEffect(() => {
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
