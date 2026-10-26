'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

interface TokenInfo {
  id: string;
  name: string;
  lastUsed: string | null;
  createdAt: string;
}

export default function TokenManager({ initialTokens }: { initialTokens: TokenInfo[] }) {
  const { t } = useTranslation();
  const [tokens, setTokens]      = useState(initialTokens);
  const [name, setName]          = useState('');
  const [newValue, setNewValue]  = useState<string | null>(null);
  const [loading, setLoading]    = useState(false);
  const [error, setError]        = useState('');

  const create = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    const res = await fetch('/api/tokens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? t('settings.error_update')); return; }
    setTokens((t) => [{ id: data.token.id, name: data.token.name, lastUsed: null, createdAt: data.token.createdAt }, ...t]);
    setNewValue(data.value);
    setName('');
  };

  const remove = async (id: string) => {
    if (!confirm(t('settings.token_delete_confirm'))) return;
    await fetch(`/api/tokens/${id}`, { method: 'DELETE' });
    setTokens((t) => t.filter((tok) => tok.id !== id));
  };

  return (
    <div>
      {newValue && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 rounded-lg text-sm">
          <p className="font-semibold text-green-800 mb-1">{t('settings.token_new_created')}</p>
          <code className="block break-all bg-green-100 rounded px-3 py-2 text-green-900 font-mono text-xs">
            {newValue}
          </code>
          <button
            onClick={() => { navigator.clipboard.writeText(newValue); }}
            className="mt-2 text-xs text-green-700 underline"
          >
            {t('settings.token_copy')}
          </button>
        </div>
      )}

      {error && (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      )}

      {/* Create new token */}
      <div className="flex gap-2 mb-5">
        <input
          className="input-field flex-1 text-sm"
          placeholder={t('settings.token_name_placeholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && create()}
        />
        <button onClick={create} disabled={loading || !name.trim()} className="btn-primary whitespace-nowrap">
          {loading ? '…' : t('settings.token_create_btn')}
        </button>
      </div>

      {/* Token list */}
      {tokens.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t('settings.token_empty')}</p>
      ) : (
        <ul className="space-y-2">
          {tokens.map((tok) => (
            <li key={tok.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div>
                <p className="font-medium text-gray-800">{tok.name}</p>
                <p className="text-xs text-gray-400">
                  {t('settings.token_created_at')} {new Date(tok.createdAt).toLocaleDateString()}
                  {tok.lastUsed ? ` · ${t('settings.token_last_used')} ${new Date(tok.lastUsed).toLocaleDateString()}` : ''}
                </p>
              </div>
              <button
                onClick={() => remove(tok.id)}
                className="text-xs text-red-500 hover:text-red-700 ml-4"
              >
                {t('settings.token_delete')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
