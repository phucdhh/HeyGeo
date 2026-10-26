'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

interface Props {
  user: {
    name?: string | null;
    email: string;
    avatar?: string | null;
  };
}

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email[0].toUpperCase() : '?';
}

export default function UserAvatar({ user }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user.avatar ?? null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const triggerUpload = useCallback(() => {
    setUploadError(null);
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setUploadError(null);
      try {
        const form = new FormData();
        form.append('avatar', file);
        const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? t('settings.error_upload'));
        } else {
          // Cache-bust so the browser reloads the new image
          setAvatarUrl(`${data.avatar}?t=${Date.now()}`);
          router.refresh();
        }
      } catch {
        setUploadError(t('settings.error_connection'));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [router],
  );

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }, [router]);

  const initials = getInitials(user.name, user.email);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Nav avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('nav.account')}
        className="w-9 h-9 rounded-full overflow-hidden bg-indigo-400 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-white/30 hover:ring-white/70 transition-all focus:outline-none focus-visible:ring-white"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span aria-hidden>{initials}</span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 mt-2 w-68 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden" style={{ minWidth: '16rem' }}>

          {/* Header */}
          <div className="bg-gradient-to-br from-indigo-50 to-white px-4 py-4 border-b border-gray-100 flex items-center gap-3">
            {/* Large avatar — click to change */}
            <div className="relative flex-shrink-0">
              <button
                onClick={triggerUpload}
                title={t('settings.avatar_change')}
                className="w-14 h-14 rounded-full overflow-hidden bg-indigo-400 flex items-center justify-center text-white font-bold text-xl ring-2 ring-indigo-200 hover:brightness-90 transition-all focus:outline-none"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span aria-hidden>{initials}</span>
                )}
                {uploading && (
                  <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  </span>
                )}
              </button>
              {/* Camera badge */}
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 bg-indigo-500 rounded-full p-1 shadow"
              >
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate text-sm">
                {user.name || <span className="italic text-gray-400 font-normal">{t('nav.no_name')}</span>}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <button
                onClick={triggerUpload}
                className="text-xs text-indigo-600 hover:text-indigo-800 mt-1 transition-colors"
              >
                {t('settings.avatar_change')}
              </button>
            </div>
          </div>

          {/* Upload error */}
          {uploadError && (
            <p className="px-4 pt-2 text-xs text-red-500">{uploadError}</p>
          )}

          {/* Menu */}
          <div className="py-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {t('nav.profile_settings')}
            </Link>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
