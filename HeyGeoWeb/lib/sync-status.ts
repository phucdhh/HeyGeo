/**
 * Pure comparison between the server list and the browser copy, shared by the
 * Sync tab and its tests. Nothing here touches IndexedDB or fetch.
 */

export type SyncStatus =
  /** On the server, not saved in this browser yet. */
  | 'missing'
  /** Identical on both sides. */
  | 'synced'
  /** Saved here, but the server holds a newer version. */
  | 'stale'
  /** Only in this browser: the server no longer has it. */
  | 'localOnly';

export interface ServerRow {
  id: string;
  title: string;
  updatedAt: string;
}

export interface StoredRow {
  id: string;
  title: string;
  updatedAt: string;
  syncedAt: string;
}

export interface SyncRow {
  id: string;
  title: string;
  status: SyncStatus;
  /** Server timestamp, when the model exists there. */
  serverUpdatedAt: string | null;
  /** Timestamp of the copy in this browser, when it exists. */
  storedUpdatedAt: string | null;
  storedSyncedAt: string | null;
}

const time = (iso: string) => {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
};

/**
 * Merge both sides into one row per model, server order first, then models that
 * only survive in the browser. A model whose browser copy is newer than the
 * server copy is reported as `stale` too — both directions need a decision.
 */
export function computeSyncRows(server: ServerRow[], stored: StoredRow[]): SyncRow[] {
  const storedById = new Map(stored.map((row) => [row.id, row]));
  const seen = new Set<string>();
  const rows: SyncRow[] = [];

  for (const model of server) {
    seen.add(model.id);
    const copy = storedById.get(model.id);
    let status: SyncStatus;
    if (!copy) {
      status = 'missing';
    } else {
      status = time(copy.updatedAt) === time(model.updatedAt) ? 'synced' : 'stale';
    }
    rows.push({
      id: model.id,
      title: model.title,
      status,
      serverUpdatedAt: model.updatedAt,
      storedUpdatedAt: copy?.updatedAt ?? null,
      storedSyncedAt: copy?.syncedAt ?? null,
    });
  }

  for (const copy of stored) {
    if (seen.has(copy.id)) continue;
    rows.push({
      id: copy.id,
      title: copy.title,
      status: 'localOnly',
      serverUpdatedAt: null,
      storedUpdatedAt: copy.updatedAt,
      storedSyncedAt: copy.syncedAt,
    });
  }

  return rows;
}

export interface SyncSummary {
  total: number;
  missing: number;
  synced: number;
  stale: number;
  localOnly: number;
  /** Rows the user must decide on individually. */
  needsChoice: number;
}

export function summarize(rows: SyncRow[]): SyncSummary {
  const summary: SyncSummary = {
    total: rows.length,
    missing: 0,
    synced: 0,
    stale: 0,
    localOnly: 0,
    needsChoice: 0,
  };
  for (const row of rows) {
    summary[row.status] += 1;
    if (row.status !== 'synced') summary.needsChoice += 1;
  }
  return summary;
}
