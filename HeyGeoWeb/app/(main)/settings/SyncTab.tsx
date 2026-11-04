'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { computeSyncRows, summarize, type SyncRow, type SyncStatus } from '@/lib/sync-status';
import {
  clearStoredModels,
  deleteStoredModel,
  getStoredModel,
  listStoredModels,
  saveStoredModel,
  toStoredModel,
  type ServerModel,
  type StoredModel,
} from '@/lib/browserModels';

const statusStyle: Record<SyncStatus, string> = {
  missing: 'bg-gray-100 text-gray-600',
  synced: 'bg-green-100 text-green-700',
  stale: 'bg-amber-100 text-amber-800',
  localOnly: 'bg-indigo-100 text-indigo-700',
};

export default function SyncTab({ userId }: { userId: string }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SyncRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);

  const reload = useCallback(async () => {
    const res = await fetch('/api/models');
    if (!res.ok) throw new Error(String(res.status));
    const { models } = (await res.json()) as { models: ServerModel[] };
    const stored = await listStoredModels(userId);
    setRows(
      computeSyncRows(
        models.map((m) => ({ id: m.id, title: m.title, updatedAt: m.updatedAt })),
        stored,
      ),
    );
  }, [userId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch {
        if (alive) setErrorMsg(t('settings.sync.error_load'));
      } finally {
        if (alive) setLoading(false);
      }
      const estimate = await navigator.storage?.estimate?.().catch(() => null);
      if (alive && estimate?.usage) setBytes(estimate.usage);
    })();
    return () => {
      alive = false;
    };
  }, [reload, t]);

  /** Server → browser */
  const pull = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/models/${id}`);
      if (!res.ok) throw new Error('load');
      const { model } = (await res.json()) as { model: ServerModel };
      await saveStoredModel(userId, toStoredModel(model, new Date().toISOString()));
    },
    [userId],
  );

  /** Browser → server: update in place, or create a new model when the server lost it */
  const push = useCallback(
    async (copy: StoredModel, existsOnServer: boolean) => {
      const body = JSON.stringify({
        title: copy.title,
        description: copy.description,
        guide: copy.guide,
        jsonData: copy.jsonData,
        thumbnailSvg: copy.thumbnailSvg,
        isPublic: copy.isPublic,
      });
      const res = await fetch(existsOnServer ? `/api/models/${copy.id}` : '/api/models', {
        method: existsOnServer ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      if (!res.ok) throw new Error('save');
      if (existsOnServer) {
        const { model } = (await res.json()) as { model: ServerModel };
        await saveStoredModel(userId, toStoredModel(model, copy.syncedAt));
        return;
      }
      // The server assigned a fresh id, so the browser copy adopts it.
      const { model } = (await res.json()) as { model: ServerModel };
      await deleteStoredModel(userId, copy.id);
      await saveStoredModel(userId, toStoredModel(model, new Date().toISOString()));
    },
    [userId],
  );

  const runOne = useCallback(
    async (row: SyncRow, action: 'pull' | 'push' | 'delete') => {
      setBusy(row.id);
      setErrorMsg(null);
      setMessage(null);
      try {
        if (action === 'pull') {
          await pull(row.id);
        } else if (action === 'push') {
          const copy = await getStoredModel(userId, row.id);
          if (!copy) throw new Error('missing copy');
          await push(copy, row.serverUpdatedAt !== null);
        } else {
          await deleteStoredModel(userId, row.id);
        }
        await reload();
      } catch {
        setErrorMsg(t('settings.sync.error_action'));
      } finally {
        setBusy(null);
      }
    },
    [pull, push, reload, t, userId],
  );

  const syncEverything = useCallback(async () => {
    setBusy('all');
    setErrorMsg(null);
    setMessage(null);
    let moved = 0;
    let heldBack = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        if (row.status === 'missing') {
          await pull(row.id);
          moved += 1;
        } else if (row.status === 'localOnly') {
          const copy = await getStoredModel(userId, row.id);
          if (copy) {
            await push(copy, false);
            moved += 1;
          }
        } else if (row.status === 'stale') {
          // Differing copies: only the owner can say which one wins.
          heldBack += 1;
        }
      } catch {
        failed += 1;
      }
    }
    try {
      await reload();
    } catch {
      /* the list stays as it was */
    }
    setBusy(null);
    if (failed > 0) setErrorMsg(t('settings.sync.error_action'));
    setMessage(t('settings.sync.sync_all_done', { moved, held: heldBack }));
  }, [pull, push, reload, rows, t, userId]);

  const wipeBrowserCopies = useCallback(async () => {
    if (!confirm(t('settings.sync.delete_all_confirm'))) return;
    setBusy('all');
    try {
      await clearStoredModels(userId);
      await reload();
      setMessage(t('settings.sync.cleared'));
    } catch {
      setErrorMsg(t('settings.sync.error_action'));
    } finally {
      setBusy(null);
    }
  }, [reload, t, userId]);

  const summary = summarize(rows);
  const dateFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—');

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
        <p>{t('settings.sync.explain')}</p>
        <p>{t('settings.sync.explain_scope')}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={syncEverything} disabled={busy !== null} className="btn-primary">
          {busy === 'all' ? t('settings.sync.working') : t('settings.sync.sync_all')}
        </button>
        <button
          onClick={wipeBrowserCopies}
          disabled={busy !== null || rows.length === 0}
          className="btn-secondary text-red-600 hover:bg-red-50"
        >
          {t('settings.sync.delete_all')}
        </button>
        <button onClick={() => reload().catch(() => setErrorMsg(t('settings.sync.error_load')))} className="btn-secondary">
          {t('settings.sync.refresh')}
        </button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>{t('settings.sync.count_total', { total: summary.total })}</span>
        <span>{t('settings.sync.count_synced', { n: summary.synced })}</span>
        <span>{t('settings.sync.count_missing', { n: summary.missing })}</span>
        <span>{t('settings.sync.count_stale', { n: summary.stale })}</span>
        <span>{t('settings.sync.count_local', { n: summary.localOnly })}</span>
        {bytes !== null && (
          <span>
            {t('settings.sync.storage_used', { size: (bytes / 1024 / 1024).toFixed(1) })}
          </span>
        )}
      </div>

      {message && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{message}</p>
      )}
      {errorMsg && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>}

      {loading ? (
        <p className="text-sm text-gray-400 text-center py-8">{t('settings.sync.loading')}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">{t('settings.sync.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {rows.map((row) => (
            <li key={row.id} className="py-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{row.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className={`inline-block mr-2 px-2 py-0.5 rounded-full ${statusStyle[row.status]}`}>
                    {t(`settings.sync.status.${row.status}`)}
                  </span>
                  {t('settings.sync.server_date', { date: dateFmt(row.serverUpdatedAt) })}
                  {row.storedUpdatedAt && (
                    <> · {t('settings.sync.browser_date', { date: dateFmt(row.storedUpdatedAt) })}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs shrink-0">
                {busy === row.id ? (
                  <span className="text-gray-400">{t('settings.sync.working')}</span>
                ) : (
                  <>
                    {row.status !== 'localOnly' && (
                      <button
                        onClick={() => runOne(row, 'pull')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {t('settings.sync.action_pull')}
                      </button>
                    )}
                    {row.storedUpdatedAt && (
                      <button
                        onClick={() => runOne(row, 'push')}
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        {t('settings.sync.action_push')}
                      </button>
                    )}
                    {row.storedUpdatedAt && (
                      <button
                        onClick={() => runOne(row, 'delete')}
                        className="text-red-500 hover:text-red-700"
                      >
                        {t('settings.sync.action_delete')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
