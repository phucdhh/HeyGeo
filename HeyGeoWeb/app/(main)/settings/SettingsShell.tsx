'use client';

import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import '@/lib/i18n';
import ProfileForm from './ProfileForm';
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

interface Props {
  user: UserProfile;
  tokens: TokenRow[];
  memberSince: string; // ISO date string from server
}

export default function SettingsShell({ user, tokens, memberSince }: Props) {
  const { t, i18n } = useTranslation();

  const dateStr = new Date(memberSince).toLocaleDateString(
    i18n.language === 'zh-TW' ? 'zh-TW' : i18n.language,
  );

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm">
          {t('settings.back_to_dashboard')}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
      </div>

      {/* Profile */}
      <section className="card p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.profile_title')}</h2>
        <p className="text-sm text-gray-500 mb-5">
          {t('settings.member_since')} {dateStr}
        </p>
        <ProfileForm initial={user} />
      </section>

      {/* API tokens */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('settings.api_tokens_title')}</h2>
        <p className="text-sm text-gray-500 mb-4">{t('settings.api_tokens_desc')}</p>
        <TokenManager initialTokens={tokens} />
      </section>
    </div>
  );
}
