'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import '@/lib/i18n';
import ProfileForm from './ProfileForm';
import PasswordForm from './PasswordForm';
import SyncTab from './SyncTab';
import BackupTab from './BackupTab';
import TokenManager from './TokenManager';

interface TokenRow {
  id: string;
  name: string;
  lastUsed: string | null;
  createdAt: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  username: string | null;
}

type TabId = 'profile' | 'sync' | 'backup' | 'tokens';

const TABS: TabId[] = ['profile', 'sync', 'backup', 'tokens'];

export default function SettingsShell({
  user,
  tokens,
  memberSince,
}: {
  user: UserProfile;
  tokens: TokenRow[];
  memberSince: string; // ISO date string from server
}) {
  const { t, i18n } = useTranslation();
  const [tab, setTab] = useState<TabId>('profile');

  const dateStr = new Date(memberSince).toLocaleDateString(
    i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language,
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          {t('settings.back_to_dashboard')}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
      </div>

      <div role="tablist" className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto">
        {TABS.map((id) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`-mb-px px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              tab === id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t(`settings.tabs.${id}`)}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.profile_title')}</h2>
            <p className="text-sm text-gray-500 mb-5">
              {t('settings.member_since')} {dateStr}
            </p>
            <ProfileForm initial={user} />
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.password.title')}</h2>
            <p className="text-sm text-gray-500 mb-5">{t('settings.password.desc')}</p>
            <PasswordForm />
          </section>
        </div>
      )}

      {tab === 'sync' && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.sync.title')}</h2>
          <p className="text-sm text-gray-500 mb-5">{t('settings.sync.desc')}</p>
          <SyncTab userId={user.id} />
        </section>
      )}

      {tab === 'backup' && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.backup.title')}</h2>
          <p className="text-sm text-gray-500 mb-5">{t('settings.backup.desc')}</p>
          <BackupTab username={user.username} email={user.email} />
        </section>
      )}

      {tab === 'tokens' && (
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.api_tokens_title')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('settings.api_tokens_desc')}</p>
          <TokenManager initialTokens={tokens} />
        </section>
      )}
    </div>
  );
}
