"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setPending(true);
    try {
      await fetch(`/api/workouts/session/${sessionId}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setPending(false);
      setConfirming(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      onBlur={() => setConfirming(false)}
      disabled={pending}
      className={`shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
        confirming
          ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
          : "bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground"
      }`}
      title="Delete session"
    >
      <Trash2 size={12} />
      {confirming ? "Confirm?" : pending ? "Deleting…" : "Delete"}
    </button>
  );
}
