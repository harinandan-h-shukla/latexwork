/**
 * Per-browser cache of "what a file's content last looked like", used
 * purely to paint something on screen instantly when reopening a file whose
 * real content hasn't been loaded into this session's `fileContents` map
 * yet — e.g. after a page reload, or coming back to a project in a fresh
 * tab. It is NEVER authoritative: store/workspace-store.ts's `openFile`
 * always still fires the real `getFileContent()` network call in parallel
 * and replaces whatever this cache produced with the server's answer as
 * soon as it resolves, unless the user has already started typing over the
 * placeholder by then (see the race handled in `openFile`).
 *
 * IndexedDB over localStorage, deliberately:
 *  - Files can run to tens of KB each and a project can have many of them.
 *    localStorage's ~5-10MB-per-origin quota is shared with everything else
 *    the app ever stores there (e.g. local-compiler-client's saved agent
 *    port), so a handful of large/image-heavy projects cached this way
 *    could plausibly exhaust the whole quota and start throwing on
 *    unrelated, more important localStorage writes elsewhere in the app.
 *  - localStorage's get/set are synchronous and block the main thread on
 *    every call. `openFile` is already async end-to-end, so IndexedDB's
 *    async API costs nothing extra here and scales better as the cache
 *    grows across many files/projects.
 *
 * Known limitation (not solved here, out of scope for this feature): this
 * cache is keyed by projectId+fileId only, with no per-account namespacing
 * and nothing that clears it on logout. On a shared device where a second
 * person signs into a different account in the same browser, a file they
 * open could very briefly flash the *previous* account's last-cached copy
 * of that same fileId before the real, access-controlled `getFileContent()`
 * call resolves and either confirms or replaces it. Fixing that properly
 * belongs with this codebase's auth/authorization work, not in a small
 * perceived-speed cache — flagging it here rather than papering over it.
 */

const DB_NAME = "inkwell-file-cache";
const DB_VERSION = 1;
const STORE = "fileContents";
/** Soft cap on total cached files across all projects; oldest-by-last-write
 * entries are pruned past this so the cache can't grow without bound over
 * a long-lived browser profile. Not a correctness concern either way — it
 * only affects how often the instant-preview path gets a hit. */
const MAX_ENTRIES = 500;

interface CacheRecord {
  key: string; // `${projectId}:${fileId}`
  projectId: string;
  fileId: string;
  content: string;
  updatedAt: number;
}

function isAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.indexedDB !== "undefined";
}

function keyFor(projectId: string, fileId: string): string {
  return `${projectId}:${fileId}`;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: "key" });
          store.createIndex("updatedAt", "updatedAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/**
 * Returns the last-cached content for this file, or null if there's no
 * entry or the cache isn't available (SSR, private-browsing lockdown,
 * etc). Best-effort only — every failure resolves to null rather than
 * throwing, since a missed cache hit just means no instant preview this
 * time, not a broken file open.
 */
export async function getCachedFileContent(projectId: string, fileId: string): Promise<string | null> {
  if (!isAvailable()) return null;
  try {
    const db = await openDb();
    return await new Promise<string | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(keyFor(projectId, fileId));
      req.onsuccess = () => resolve((req.result as CacheRecord | undefined)?.content ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Records the (real, server-confirmed) content for this file for next
 * time. Fire-and-forget from callers — failures (quota, private browsing
 * blocking IndexedDB entirely, etc.) are swallowed since this is purely a
 * speed optimization, never a source of truth.
 */
export async function setCachedFileContent(projectId: string, fileId: string, content: string): Promise<void> {
  if (!isAvailable()) return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const record: CacheRecord = {
        key: keyFor(projectId, fileId),
        projectId,
        fileId,
        content,
        updatedAt: Date.now(),
      };
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    void pruneIfNeeded(db);
  } catch {
    // Best-effort cache; see doc comment above.
  }
}

async function pruneIfNeeded(db: IDBDatabase): Promise<void> {
  try {
    const count = await new Promise<number>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const toDelete = count - MAX_ENTRIES;
    if (toDelete <= 0) return;
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const cursorReq = tx.objectStore(STORE).index("updatedAt").openCursor();
      let deleted = 0;
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (!cursor || deleted >= toDelete) return;
        cursor.delete();
        deleted++;
        cursor.continue();
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Housekeeping only; skip silently on failure.
  }
}
