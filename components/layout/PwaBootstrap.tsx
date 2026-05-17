"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/pwa/serviceWorker";

// Mounts once in the root layout — registers the SW and wires up background sync.
export function PwaBootstrap() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}
