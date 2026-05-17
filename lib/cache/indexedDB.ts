"use client";

const DB_NAME = "myostat-cache";
const DB_VERSION = 1;

const STORES = {
  snapshots: "snapshots",
  queue: "offline-queue",
  meta: "meta",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.snapshots)) {
        const s = db.createObjectStore(STORES.snapshots, { keyPath: "key" });
        s.createIndex("expires", "expires");
      }
      if (!db.objectStoreNames.contains(STORES.queue)) {
        const q = db.createObjectStore(STORES.queue, {
          keyPath: "id",
          autoIncrement: true,
        });
        q.createIndex("createdAt", "createdAt");
        q.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
    };

    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };

    req.onerror = () => reject(req.error);
  });
}

function tx(
  store: StoreName,
  mode: IDBTransactionMode,
  db: IDBDatabase
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

// ── Snapshots (cached data) ───────────────────────────────────────────────────

export interface CacheEntry<T = unknown> {
  key: string;
  data: T;
  cachedAt: number;
  expires: number;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = tx(STORES.snapshots, "readonly", db).get(key);
      req.onsuccess = () => {
        const entry = req.result as CacheEntry<T> | undefined;
        if (!entry) return resolve(null);
        if (Date.now() > entry.expires) {
          // Expired — delete async, return null
          openDB().then((d) => tx(STORES.snapshots, "readwrite", d).delete(key));
          return resolve(null);
        }
        resolve(entry.data);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  key: string,
  data: T,
  ttlMs: number
): Promise<void> {
  try {
    const db = await openDB();
    const entry: CacheEntry<T> = {
      key,
      data,
      cachedAt: Date.now(),
      expires: Date.now() + ttlMs,
    };
    await new Promise<void>((resolve, reject) => {
      const req = tx(STORES.snapshots, "readwrite", db).put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const req = tx(STORES.snapshots, "readwrite", db).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    //
  }
}

// ── Offline queue ─────────────────────────────────────────────────────────────

export type QueueStatus = "pending" | "syncing" | "failed";

export interface QueueItem {
  id?: number;
  type: string;
  payload: unknown;
  idempotencyKey: string;
  createdAt: number;
  attempts: number;
  status: QueueStatus;
  lastAttempt?: number;
}

export async function queueAdd(
  item: Omit<QueueItem, "id" | "createdAt" | "attempts" | "status">
): Promise<number> {
  const db = await openDB();
  const record: QueueItem = {
    ...item,
    createdAt: Date.now(),
    attempts: 0,
    status: "pending",
  };
  return new Promise((resolve, reject) => {
    const req = tx(STORES.queue, "readwrite", db).add(record);
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

export async function queueGetPending(): Promise<QueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const items: QueueItem[] = [];
      const req = tx(STORES.queue, "readonly", db)
        .index("status")
        .openCursor(IDBKeyRange.only("pending"));
      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          items.push(cursor.value);
          cursor.continue();
        } else {
          resolve(items);
        }
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function queueUpdate(
  id: number,
  patch: Partial<QueueItem>
): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const store = tx(STORES.queue, "readwrite", db);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        if (!getReq.result) return resolve();
        store.put({ ...getReq.result, ...patch });
        resolve();
      };
      getReq.onerror = () => resolve();
    });
  } catch {
    //
  }
}

export async function queueRemove(id: number): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const req = tx(STORES.queue, "readwrite", db).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    //
  }
}

export async function queueGetAll(): Promise<QueueItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = tx(STORES.queue, "readonly", db).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// ── Meta ─────────────────────────────────────────────────────────────────────

export async function metaSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const req = tx(STORES.meta, "readwrite", db).put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    //
  }
}

export async function metaGet<T>(key: string): Promise<T | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const req = tx(STORES.meta, "readonly", db).get(key);
      req.onsuccess = () => resolve(req.result?.value ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
