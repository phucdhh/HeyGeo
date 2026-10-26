'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [form, setForm]     = useState({ email: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t('login.error_default'));
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('login.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('login.subtitle')}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.email')}</label>
            <input
              type="email"
              required
              autoComplete="email"
              className="input-field"
              placeholder="ban@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('login.password')}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="input-field"
              placeholder="\u••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? t('login.btn_loading') : t('login.btn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('login.no_account')}{' '}
          <Link href="/register" className="text-brand-600 font-semibold hover:underline">
            {t('login.register_free')}
          </Link>
        </p>
      </div>
    </div>
  );
}
