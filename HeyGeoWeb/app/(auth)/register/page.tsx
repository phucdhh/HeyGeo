'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

export default function RegisterPage() {
  const router  = useRouter();
  const { t } = useTranslation();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirm) {
      setError(t('register.error_mismatch'));
      return;
    }
    if (form.password.length < 8) {
      setError(t('register.error_short'));
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? t('register.error_default'));
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="w-full max-w-md">
      <div className="card p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{t('register.title')}</h1>
        <p className="text-sm text-gray-500 mb-6">{t('register.subtitle')}</p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.name')}</label>
            <input
              type="text"
              autoComplete="name"
              className="input-field"
              placeholder={t('register.name_placeholder')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.email')}</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.password')}</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-field"
              placeholder={t('register.password_placeholder')}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('register.confirm')}</label>
            <input
              type="password"
              required
              autoComplete="new-password"
              className="input-field"
              placeholder={t('register.confirm_placeholder')}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? t('register.btn_loading') : t('register.btn')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          {t('register.has_account')}{' '}
          <Link href="/login" className="text-brand-600 font-semibold hover:underline">
            {t('register.login_link')}
          </Link>
        </p>
      </div>
    </div>
  );
}
