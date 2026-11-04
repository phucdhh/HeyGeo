'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

const MIN_LENGTH = 8;

export default function PasswordForm() {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (next.length < MIN_LENGTH) {
      setErrorMsg(t('settings.password.too_short'));
      return;
    }
    if (next !== confirm) {
      setErrorMsg(t('settings.password.mismatch'));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? t('settings.password.error'));
      } else {
        setCurrent('');
        setNext('');
        setConfirm('');
        setSuccessMsg(t('settings.password.success'));
      }
    } catch {
      setErrorMsg(t('settings.error_connection'));
    } finally {
      setSaving(false);
    }
  };

  const field =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('settings.password.field_current')}
        </label>
        <input
          type="password"
          value={current}
          autoComplete="current-password"
          onChange={(e) => setCurrent(e.target.value)}
          className={field}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('settings.password.field_new')}
        </label>
        <input
          type="password"
          value={next}
          autoComplete="new-password"
          onChange={(e) => setNext(e.target.value)}
          placeholder={t('settings.password.field_new_placeholder')}
          className={field}
        />
        <p className="text-xs text-gray-400 mt-1">{t('settings.password.hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('settings.password.field_confirm')}
        </label>
        <input
          type="password"
          value={confirm}
          autoComplete="new-password"
          onChange={(e) => setConfirm(e.target.value)}
          className={field}
        />
        {confirm.length > 0 && confirm !== next && (
          <p className="text-xs text-red-500 mt-1">{t('settings.password.mismatch')}</p>
        )}
      </div>

      {errorMsg && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
      )}
      {successMsg && (
        <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{successMsg}</p>
      )}

      <button
        type="submit"
        disabled={saving || !current || !next || !confirm}
        className="btn-secondary w-full disabled:opacity-60"
      >
        {saving ? t('settings.password.saving') : t('settings.password.btn')}
      </button>
    </form>
  );
}
