"use client";

// Lightweight in-memory query cache with deduplication.
// Used by client components to avoid redundant fetches within a session.

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  ttlMs: number;
  promise?: Promise<T>;
}

const store = new Map<string, CacheEntry<unknown>>();

export function queryCacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > entry.ttlMs) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

export function queryCacheSet<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, fetchedAt: Date.now(), ttlMs });
}

export function queryCacheInvalidate(prefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Deduplicates in-flight requests for the same key.
export async function queryCacheFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = queryCacheGet<T>(key);
  if (cached !== null) return cached;

  const existing = store.get(key);
  if (existing?.promise) return existing.promise as Promise<T>;

  const promise = fetcher().then((data) => {
    queryCacheSet(key, data, ttlMs);
    return data;
  });

  // Store promise for deduplication
  store.set(key, { data: null as unknown as T, fetchedAt: 0, ttlMs, promise });

  return promise;
}

export function queryCacheClear(): void {
  store.clear();
}
