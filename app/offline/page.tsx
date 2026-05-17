"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";

// In-app offline page — served by Next.js when JS is available
// The static /offline.html is used by the service worker as a no-JS fallback
export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <WifiOff size={28} className="text-primary" />
      </div>
      <h1 className="text-xl font-semibold text-foreground mb-2">You&apos;re offline</h1>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        Your cached data is still available. Reconnect to sync new activity and see the latest updates.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to dashboard
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
