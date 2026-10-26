'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import UserAvatar from './UserAvatar';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import '@/lib/i18n';

interface Props {
  user?: { email: string; name?: string | null; avatar?: string | null; role?: string | null };
}

export default function Navigation({ user }: Props) {
  const { t } = useTranslation();
  return (
    <nav className="bg-brand-900 text-white shadow-md">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
        <Link href="/" prefetch={false} className="flex items-center gap-2.5 text-xl font-bold tracking-tight">
          <img src="/logo.svg" alt="HeyGeo logo" className="w-8 h-8 flex-shrink-0" />
          <span>Hey<span className="text-amber-300">Geo</span></span>
        </Link>

        <div className="flex items-center gap-5">
          <SearchBar />
          <LanguageSwitcher />
          {user ? (
            <>
              {user.role === 'ADMIN' && (
                <Link href="/admin/users" className="text-xs font-semibold text-amber-400 hover:text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded transition-colors">
                  {t('nav.admin')}
                </Link>
              )}
              <Link href="/dashboard" prefetch={false} className="text-sm text-amber-200 hover:text-white transition-colors">
                {t('nav.dashboard')}
              </Link>
              <Link href="/settings" prefetch={false} className="text-sm text-amber-200 hover:text-white transition-colors">
                {t('nav.settings')}
              </Link>
              <UserAvatar user={user} />
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-amber-200 hover:text-white transition-colors">
                {t('nav.login')}
              </Link>
              <Link href="/register" className="text-sm bg-white text-brand-700 font-semibold px-4 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
