/**
 * The browser copy of a user's models, kept in IndexedDB.
 *
 * One database per account (`heygeo-sync-<userId>`) so a shared browser never
 * mixes two teachers' models. Records mirror the server fields and add
 * `syncedAt` — the moment this copy entered the browser — which is what lets
 * the Sync tab tell "already in sync" from "the server moved on".
 */
const DB_PREFIX = 'heygeo-sync';
const STORE = 'models';
const VERSION = 1;

export interface StoredModel {
  id: string;
  title: string;
  description: string | null;
  guide: string | null;
  jsonData: object;
  thumbnailSvg: string | null;
  categories: string[];
  isPublic: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  syncedAt: string;
}

/** A model as the API returns it, before it becomes a browser copy. */
export interface ServerModel {
  id: string;
  title: string;
  description?: string | null;
  guide?: string | null;
  jsonData: object;
  thumbnailSvg?: string | null;
  categories?: string[];
  isPublic?: boolean;
  viewCount?: number;
  createdAt?: string;
  updatedAt: string;
}

/** Stamp a server model as a browser copy taken at `syncedAt`. */
export function toStoredModel(model: ServerModel, syncedAt: string): StoredModel {
  return {
    id: model.id,
    title: model.title,
    description: model.description ?? null,
    guide: model.guide ?? null,
    jsonData: model.jsonData,
    thumbnailSvg: model.thumbnailSvg ?? null,
    categories: model.categories ?? [],
    isPublic: model.isPublic ?? false,
    viewCount: model.viewCount ?? 0,
    createdAt: model.createdAt ?? syncedAt,
    updatedAt: model.updatedAt,
    syncedAt,
  };
}

function open(userId: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(`${DB_PREFIX}-${userId}`, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Run `work` against the models store; the promise settles with the last
 * request's result once the transaction completes.
 */
async function withStore<T>(
  userId: string,
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T> {
  const db = await open(userId);
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve((request?.result ?? undefined) as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export function listStoredModels(userId: string): Promise<StoredModel[]> {
  return withStore<StoredModel[]>(userId, 'readonly', (store) => store.getAll());
}

export function getStoredModel(userId: string, id: string): Promise<StoredModel | undefined> {
  return withStore<StoredModel | undefined>(userId, 'readonly', (store) => store.get(id));
}

export function saveStoredModels(userId: string, models: StoredModel[]): Promise<undefined> {
  return withStore<undefined>(userId, 'readwrite', (store) => {
    for (const model of models) store.put(model);
  });
}

export function saveStoredModel(userId: string, model: StoredModel): Promise<undefined> {
  return saveStoredModels(userId, [model]);
}

export function deleteStoredModel(userId: string, id: string): Promise<undefined> {
  return withStore<undefined>(userId, 'readwrite', (store) => store.delete(id));
}

export function clearStoredModels(userId: string): Promise<undefined> {
  return withStore<undefined>(userId, 'readwrite', (store) => store.clear());
}
