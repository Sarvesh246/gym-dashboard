"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncWgerExercises } from "@/app/actions/workouts";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function SyncPage() {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);

  const handleSync = async () => {
    setIsSyncing(true);
    setStatus("idle");
    setMessage("");
    try {
      const result = await syncWgerExercises();
      if (result.success) {
        setStatus("success");
        setCount(result.count ?? 0);
        setMessage(
          `✓ Synced ${result.count} exercises from WGER. They're now available in the exercise library.`
        );
      } else {
        setStatus("error");
        setMessage(`✗ Sync failed: ${result.error}`);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Unexpected error during sync");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">WGER Exercise Sync</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Import ~1400 exercises from the free WGER exercise database
            </p>
          </div>

          <div className="rounded-xl bg-muted/50 p-4 space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong>What this does:</strong> Fetches all exercises from wger.de API and caches them in Supabase. Takes
              ~10–30 seconds depending on connection.
            </p>
            <p className="text-muted-foreground">
              <strong>After sync:</strong> All 1400+ exercises will be searchable in{" "}
              <code className="bg-background px-2 py-1 rounded text-xs">/workouts/exercises</code>
            </p>
          </div>

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Syncing... (this may take a minute)
              </>
            ) : (
              "Start WGER Sync"
            )}
          </button>

          {status === "success" && (
            <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex gap-3">
              <CheckCircle2 size={20} className="text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-600 dark:text-green-400">{message}</p>
                <button
                  onClick={() => router.push("/workouts/exercises")}
                  className="text-xs text-green-600 dark:text-green-400 hover:underline mt-2"
                >
                  Go to exercise library →
                </button>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex gap-3">
              <AlertCircle size={20} className="text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{message}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
