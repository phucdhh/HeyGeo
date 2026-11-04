'use client';

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import JSZip from 'jszip';
import '@/lib/i18n';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  MAX_MODELS_PER_BACKUP,
  backupFilename,
  isHeyGeoManifest,
} from '@/lib/backup';

interface Manifest {
  format: string;
  version: number;
  exportedAt: string;
  modelCount: number;
  user?: { username?: string | null; email?: string | null; name?: string | null };
}

interface PendingBackup {
  filename: string;
  manifest: Manifest | null;
  models: unknown[];
}

interface ImportResult {
  created: number;
  skipped: { index: number; title: string | null; reason: string }[];
}

export default function BackupTab({
  username,
  email,
}: {
  username: string | null;
  email: string;
}) {
  const { t } = useTranslation();
  const [exporting, setExporting] = useState(false);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, setPending] = useState<PendingBackup | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/backup/export');
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as {
        format: string;
        version: number;
        exportedAt: string;
        modelCount: number;
        user: Manifest['user'];
        models: { id: string }[];
      };

      const zip = new JSZip();
      const manifest: Manifest = {
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        exportedAt: data.exportedAt,
        modelCount: data.modelCount,
        user: data.user,
      };
      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      const folder = zip.folder('models');
      data.models.forEach((model) => {
        folder?.file(`${model.id}.json`, JSON.stringify(model, null, 2));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const name = backupFilename(username, email, new Date());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg(t('settings.backup.error_export'));
    } finally {
      setExporting(false);
    }
  };

  const handlePick = async (file: File) => {
    setReading(true);
    setErrorMsg(null);
    setResult(null);
    setPending(null);
    try {
      const zip = await JSZip.loadAsync(file);
      const manifestFile = zip.file('manifest.json');
      if (!manifestFile) {
        setErrorMsg(t('settings.backup.error_not_heygeo'));
        return;
      }
      const manifest = JSON.parse(await manifestFile.async('string')) as Manifest;
      if (!isHeyGeoManifest(manifest)) {
        setErrorMsg(t('settings.backup.error_not_heygeo'));
        return;
      }

      const files = Object.values(zip.files).filter(
        (entry) => !entry.dir && entry.name.startsWith('models/') && entry.name.endsWith('.json'),
      );
      const models: unknown[] = [];
      for (const entry of files) {
        try {
          models.push(JSON.parse(await entry.async('string')));
        } catch {
          /* a broken entry is dropped; the server reports what it could not read */
        }
      }
      if (models.length === 0) {
        setErrorMsg(t('settings.backup.error_empty'));
        return;
      }
      if (models.length > MAX_MODELS_PER_BACKUP) {
        setErrorMsg(t('settings.backup.error_too_many', { max: MAX_MODELS_PER_BACKUP }));
        return;
      }
      setPending({ filename: file.name, manifest, models });
    } catch {
      setErrorMsg(t('settings.backup.error_read'));
    } finally {
      setReading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!pending) return;
    setImporting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/backup/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: pending.models }),
      });
      const data = (await res.json()) as ImportResult & { error?: string };
      if (!res.ok) {
        setErrorMsg(data.error ?? t('settings.backup.error_import'));
      } else {
        setResult(data);
        setPending(null);
      }
    } catch {
      setErrorMsg(t('settings.backup.error_import'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 space-y-2">
        <p>{t('settings.backup.explain')}</p>
        <p>{t('settings.backup.explain_restore')}</p>
      </div>

      {/* Download */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-900">{t('settings.backup.export_title')}</h3>
        <p className="text-sm text-gray-500">{t('settings.backup.export_desc')}</p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? t('settings.backup.exporting') : t('settings.backup.export_btn')}
        </button>
      </section>

      {/* Upload */}
      <section className="space-y-3 pt-2 border-t border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('settings.backup.import_title')}</h3>
        <p className="text-sm text-gray-500">{t('settings.backup.import_desc')}</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handlePick(file);
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={reading || importing}
          className="btn-secondary"
        >
          {reading ? t('settings.backup.reading') : t('settings.backup.import_btn')}
        </button>

        {pending && (
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm space-y-2">
            <p className="font-medium text-gray-800">{pending.filename}</p>
            <p className="text-gray-600">
              {t('settings.backup.pending_info', {
                models: pending.models.length,
                date: pending.manifest?.exportedAt
                  ? new Date(pending.manifest.exportedAt).toLocaleString()
                  : '—',
              })}
            </p>
            <p className="text-gray-600">{t('settings.backup.pending_warning')}</p>
            <div className="flex gap-2 pt-1">
              <button onClick={handleImport} disabled={importing} className="btn-primary">
                {importing ? t('settings.backup.importing') : t('settings.backup.confirm_import')}
              </button>
              <button
                onClick={() => setPending(null)}
                disabled={importing}
                className="btn-secondary"
              >
                {t('settings.backup.cancel')}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm space-y-2">
            <p className="text-green-800">
              {t('settings.backup.import_done', { models: result.created })}
            </p>
            {result.skipped.length > 0 && (
              <div className="text-amber-800 space-y-1">
                <p className="font-medium">
                  {t('settings.backup.skipped_title', { skipped: result.skipped.length })}
                </p>
                <ul className="list-disc pl-5 text-xs space-y-0.5">
                  {result.skipped.map((s) => (
                    <li key={s.index}>
                      {(s.title ?? `#${s.index + 1}`) + ' — ' + s.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
      )}
    </div>
  );
}
