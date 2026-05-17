"use client";

import {
  queueAdd,
  queueGetPending,
  queueUpdate,
  queueRemove,
  queueGetAll,
  type QueueItem,
} from "@/lib/cache/indexedDB";

export type { QueueItem };

export type QueueAction =
  | { type: "log_workout"; payload: Record<string, unknown> }
  | { type: "log_nutrition"; payload: Record<string, unknown> }
  | { type: "update_profile"; payload: Record<string, unknown> }
  | { type: "update_workout"; payload: Record<string, unknown> };

// Route each action type to its API endpoint
const ACTION_ENDPOINTS: Record<string, string> = {
  log_workout: "/api/workouts/sessions",
  log_nutrition: "/api/nutrition/log",
  update_profile: "/api/profile",
  update_workout: "/api/workouts/sessions",
};

function makeIdempotencyKey(type: string, payload: Record<string, unknown>): string {
  const stable = JSON.stringify(payload, Object.keys(payload).sort());
  return `${type}:${btoa(stable).slice(0, 32)}`;
}

// ── Enqueue ───────────────────────────────────────────────────────────────────

export async function enqueue(action: QueueAction): Promise<number> {
  const idempotencyKey = makeIdempotencyKey(
    action.type,
    action.payload as Record<string, unknown>
  );

  // Deduplicate: don't re-add if identical pending item exists
  const existing = await queueGetAll();
  const duplicate = existing.find(
    (item) =>
      item.idempotencyKey === idempotencyKey && item.status === "pending"
  );
  if (duplicate?.id != null) return duplicate.id;

  return queueAdd({
    type: action.type,
    payload: action.payload,
    idempotencyKey,
  });
}

// ── Sync ──────────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;

function backoffMs(attempts: number): number {
  // Exponential: 2s, 4s, 8s, 16s, 32s
  return Math.min(2000 * Math.pow(2, attempts), 32000);
}

export type SyncResult = {
  succeeded: number;
  failed: number;
  skipped: number;
};

export async function flushQueue(): Promise<SyncResult> {
  const pending = await queueGetPending();
  const result: SyncResult = { succeeded: 0, failed: 0, skipped: 0 };

  for (const item of pending) {
    if (item.id == null) continue;

    // Respect backoff window
    if (item.lastAttempt) {
      const wait = backoffMs(item.attempts);
      if (Date.now() - item.lastAttempt < wait) {
        result.skipped++;
        continue;
      }
    }

    if (item.attempts >= MAX_ATTEMPTS) {
      await queueUpdate(item.id, { status: "failed" });
      result.failed++;
      continue;
    }

    const endpoint = ACTION_ENDPOINTS[item.type];
    if (!endpoint) {
      await queueRemove(item.id);
      continue;
    }

    await queueUpdate(item.id, {
      status: "syncing",
      lastAttempt: Date.now(),
      attempts: item.attempts + 1,
    });

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": item.idempotencyKey,
        },
        body: JSON.stringify(item.payload),
      });

      if (res.ok || res.status === 409) {
        // 409 = already applied on server (idempotent duplicate)
        await queueRemove(item.id);
        result.succeeded++;
      } else {
        await queueUpdate(item.id, { status: "pending" });
        result.failed++;
      }
    } catch {
      await queueUpdate(item.id, { status: "pending" });
      result.failed++;
    }
  }

  return result;
}

export async function getPendingCount(): Promise<number> {
  const items = await queueGetPending();
  return items.length;
}

export async function clearFailedItems(): Promise<void> {
  const all = await queueGetAll();
  await Promise.all(
    all
      .filter((i) => i.status === "failed" && i.id != null)
      .map((i) => queueRemove(i.id!))
  );
}
