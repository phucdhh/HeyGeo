'use client';

import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';

interface Profile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  username: string | null;
}

export default function ProfileForm({ initial }: { initial: Profile }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState(initial.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        const res = await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: profile.name ?? '',
            bio: profile.bio ?? '',
            phone: profile.phone ?? '',
            username: usernameInput.trim(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error ?? t('settings.error_update'));
        } else {
          setProfile((prev) => ({ ...prev, ...data.user }));
          setSuccessMsg(t('settings.save_success'));
          setTimeout(() => setSuccessMsg(null), 3000);
        }
      } catch {
        setErrorMsg(t('settings.error_connection'));
      } finally {
        setSaving(false);
      }
    },
    [profile],
  );

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadError(null);
      setUploading(true);
      try {
        const form = new FormData();
        form.append('avatar', file);
        const res = await fetch('/api/profile/avatar', { method: 'POST', body: form });
        const data = await res.json();
        if (!res.ok) {
          setUploadError(data.error ?? t('settings.error_upload'));
        } else {
          setProfile((prev) => ({ ...prev, avatar: `${data.avatar}?t=${Date.now()}` }));
        }
      } catch {
        setUploadError(t('settings.error_connection'));
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [],
  );

  function getInitials(name?: string | null, email?: string) {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    return email ? email[0].toUpperCase() : '?';
  }

  return (
    <div className="space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-5">
        <div className="relative">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title={t('settings.avatar_change')}
            className="w-20 h-20 rounded-full overflow-hidden bg-indigo-400 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-indigo-100 hover:brightness-90 transition-all focus:outline-none focus-visible:ring-indigo-400"
          >
            {profile.avatar ? (
              <img key={profile.avatar} src={profile.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{getInitials(profile.name, profile.email)}</span>
            )}
            {uploading && (
              <span className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="w-6 h-6 text-white animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </span>
            )}
          </button>
          <span
            className="absolute -bottom-0.5 -right-0.5 bg-indigo-500 rounded-full p-1.5 shadow cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </span>
        </div>
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            {t('settings.avatar_change')}
          </button>
          <p className="text-xs text-gray-400 mt-0.5">{t('settings.avatar_hint')}</p>
          {uploadError && <p className="text-xs text-red-500 mt-1">{uploadError}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleAvatarUpload}
        />
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-4 pt-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.field_name')}</label>
          <input
            type="text"
            value={profile.name ?? ''}
            maxLength={100}
            onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            placeholder={t('settings.field_name_placeholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.field_email')}</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
          />
          <p className="text-xs text-gray-400 mt-1">{t('settings.field_email_readonly')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('settings.field_username')}
          </label>
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-400">
            <span className="px-3 py-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-300 select-none flex-shrink-0">
              heygeo.pedu.vn/
            </span>
            <input
              type="text"
              value={usernameInput}
              maxLength={30}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                setUsernameInput(val);
                setUsernameError(
                  val.length > 0 && val.length < 3
                    ? t('settings.field_username_short')
                    : null,
                );
              }}
              placeholder={t('settings.field_username_placeholder')}
              className="flex-1 px-3 py-2 text-sm outline-none bg-white"
            />
          </div>
          {usernameError ? (
            <p className="text-xs text-red-500 mt-1">{usernameError}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-1">{t('settings.field_username_hint')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.field_phone')}</label>
          <input
            type="tel"
            value={profile.phone ?? ''}
            maxLength={20}
            onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            placeholder={t('settings.field_phone_placeholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings.field_bio')}</label>
          <textarea
            value={profile.bio ?? ''}
            maxLength={500}
            rows={3}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
            placeholder={t('settings.field_bio_placeholder')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 transition resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{(profile.bio ?? '').length}/500</p>
        </div>

        {errorMsg && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
        )}
        {successMsg && (
          <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">{successMsg}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          {saving ? t('settings.saving') : t('settings.btn_save')}
        </button>
      </form>
    </div>
  );
}
