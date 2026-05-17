"use client";

import { cacheGet, cacheSet } from "./indexedDB";

// TTLs
export const TTL = {
  dashboard: 10 * 60 * 1000,       // 10 min
  workouts: 15 * 60 * 1000,        // 15 min
  nutrition: 10 * 60 * 1000,       // 10 min
  recovery: 10 * 60 * 1000,        // 10 min
  analytics: 24 * 60 * 60 * 1000,  // 24h
  wearables: 15 * 60 * 1000,       // 15 min
} as const;

export type CacheKey =
  | `dashboard:${string}`
  | `workouts:${string}`
  | `nutrition:${string}`
  | `recovery:${string}`
  | `analytics:${string}`
  | `wearables:${string}`;

function ttlForKey(key: string): number {
  const prefix = key.split(":")[0] as keyof typeof TTL;
  return TTL[prefix] ?? TTL.dashboard;
}

// ── Fetch-through helper ──────────────────────────────────────────────────────
// Returns cached data immediately if fresh, then fetches in background.
// Passes stale: true when returning cached data so callers can show a staleness indicator.

export type CachedResult<T> = { data: T; stale: boolean };

export async function fetchThrough<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<CachedResult<T>> {
  const ttl = ttlMs ?? ttlForKey(key);
  const cached = await cacheGet<T>(key);

  if (cached !== null) {
    // Refresh in background — fire and forget
    fetcher()
      .then((fresh) => cacheSet(key, fresh, ttl))
      .catch(() => {/* network unavailable — keep stale */});
    return { data: cached, stale: true };
  }

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttl);
  return { data: fresh, stale: false };
}

// ── Simple get-or-fetch (blocking) ────────────────────────────────────────────

export async function getOrFetch<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttlMs?: number
): Promise<T> {
  const ttl = ttlMs ?? ttlForKey(key);
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttl);
  return fresh;
}

// ── Invalidate ────────────────────────────────────────────────────────────────

export async function invalidate(key: CacheKey): Promise<void> {
  const { cacheDelete } = await import("./indexedDB");
  await cacheDelete(key);
}
