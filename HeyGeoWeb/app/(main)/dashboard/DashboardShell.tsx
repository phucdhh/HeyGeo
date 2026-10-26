'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import ModelCard from '@/components/ModelCard';
import '@/lib/i18n';

const NOTIF_SEEN_KEY  = 'notif_last_seen_ts';
const NOTIF_KEYS_KEY  = 'notif_seen_keys';

// ─── Types ─────────────────────────────────────────────────────────────────

export type DbNotif = {
  type: 'db';
  key: string;
  icon: string;
  message: string;
  createdAt: string;
  href?: string;
  isNew: boolean;
};

export type CommentNotif = {
  type: 'comment';
  key: string;
  icon: string;
  who: string;
  modelTitle: string;
  createdAt: string;
  href?: string;
  isNew: boolean;
};

export type InactivityNotif = {
  type: 'inactivity';
  key: string;
  icon: string;
  daysSince: number;
  isNew: boolean;
};

export type NotifItem = DbNotif | CommentNotif | InactivityNotif;

export interface SerializedModel {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  viewCount: number;
  shareToken: string | null;
  updatedAt: string; // ISO string
  jsonData: object;
  thumbnailSvg: string | null;
  codeMode: boolean;
}

interface Props {
  userName: string | null;
  userEmail: string;
  models: SerializedModel[];
  notifications: NotifItem[];
}

// ─── Relative time helper ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function relativeTime(isoString: string, t: (key: string, opts?: any) => string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return t('dashboard.just_now');
  if (minutes < 60) return t('dashboard.minutes_ago', { count: minutes });
  if (hours < 24) return t('dashboard.hours_ago', { count: hours });
  return t('dashboard.days_ago', { count: days });
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function DashboardShell({ userName, userEmail, models, notifications }: Props) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  // Timestamp (ms) of when the user last clicked "Xem tất cả"; 0 = never
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);
  // Set of individual notification keys the user has already clicked/seen
  const [seenKeys, setSeenKeys] = useState<Set<string>>(new Set());

  // Read localStorage after hydration (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(NOTIF_SEEN_KEY);
    if (stored) setLastSeenTs(new Date(stored).getTime());

    const storedKeys = localStorage.getItem(NOTIF_KEYS_KEY);
    if (storedKeys) {
      try { setSeenKeys(new Set(JSON.parse(storedKeys) as string[])); } catch { /* ignore */ }
    }
  }, []);

  // Persist a set of keys as seen (both in state and localStorage)
  const markKeysSeen = (keys: string[]) => {
    setSeenKeys((prev) => {
      const next = new Set([...prev, ...keys]);
      localStorage.setItem(NOTIF_KEYS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  // For comment notifications, override isNew based on lastSeenTs;
  // for any notification, override isNew if its key was individually clicked.
  const effectiveNotifs = notifications.map((n) => {
    if (seenKeys.has(n.key)) return { ...n, isNew: false };
    if (n.type === 'comment' && lastSeenTs > 0) {
      return { ...n, isNew: new Date(n.createdAt).getTime() > lastSeenTs };
    }
    return n;
  });

  const unreadCount = effectiveNotifs.filter((n) => n.isNew).length;
  const displayed   = showAll ? effectiveNotifs : effectiveNotifs.filter((n) => n.isNew);

  // Clicking "Xem tất cả": mark all as seen via localStorage, then show all
  const handleViewAll = () => {
    const now = new Date().toISOString();
    localStorage.setItem(NOTIF_SEEN_KEY, now);
    setLastSeenTs(new Date(now).getTime());
    markKeysSeen(effectiveNotifs.filter((n) => n.isNew).map((n) => n.key));
    setShowAll(true);
  };

  // Clicking a single notification link: mark just that key as seen
  const handleNotifClick = (key: string) => markKeysSeen([key]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-500 mt-1">
            {t('dashboard.models_count_one', { count: models.length })} · {t('dashboard.greeting')}, {userName ?? userEmail}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/settings" className="btn-secondary text-sm flex items-center gap-1.5">
            {t('dashboard.api_token')}
          </Link>
          <Link href="/design" className="btn-secondary text-sm flex items-center gap-1.5">
            {t('dashboard.new_design')}
          </Link>
          <Link href="/coding" className="btn-secondary text-sm flex items-center gap-1.5">
            {t('dashboard.jsxgraph')}
          </Link>
          <Link href="/cindy" className="btn-secondary text-sm flex items-center gap-1.5">
            {t('dashboard.cindyjs')}
          </Link>
          <Link href="/models/new" className="btn-primary">
            {t('dashboard.upload')}
          </Link>
        </div>
      </div>

      {/* Notifications */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🔔</span>
          <span className="text-sm font-semibold text-amber-900">{t('dashboard.notifications')}</span>
          {unreadCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold">
              {unreadCount}
            </span>
          )}
          {/* Xem tất cả / Thu gọn — always show when there are any notifications */}
          {notifications.length > 0 && (
            <button
              onClick={showAll ? () => setShowAll(false) : handleViewAll}
              className="ml-auto text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              {showAll ? t('dashboard.collapse_notifications') : t('dashboard.view_all_notifications')}
            </button>
          )}
        </div>
        {displayed.length === 0 ? (
          <p className="text-sm text-gray-400">{t('dashboard.no_new_notifications')}</p>
        ) : (
          <ul className="space-y-1">
            {displayed.map((item) => {
              const message =
                item.type === 'db'
                  ? item.message
                  : item.type === 'comment'
                    ? t('dashboard.comment_notif', { who: item.who, title: item.modelTitle })
                    : t('dashboard.inactivity_msg', { days: item.daysSince });

              const timeStr =
                item.type === 'inactivity' ? '' : relativeTime(item.createdAt, t);

              const href = item.type !== 'inactivity' ? item.href : undefined;

              return (
                <li
                  key={item.key}
                  className={`flex items-center gap-2 text-sm ${item.isNew ? 'text-gray-800 font-medium' : 'text-gray-400'}`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {item.isNew && (
                    <span className="shrink-0 inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  )}
                  <span className="flex-1">
                    {href ? (
                      <Link href={href} prefetch={false} onClick={() => handleNotifClick(item.key)} className={item.isNew ? 'hover:text-amber-700 hover:underline' : 'hover:underline'}>
                        {message}
                      </Link>
                    ) : (
                      message
                    )}
                  </span>
                  {timeStr && (
                    <span className="shrink-0 text-xs text-gray-400">{timeStr}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {models.length === 0 ? (
        <div className="text-center py-24 card">
          <div className="text-5xl mb-4">📐</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">{t('dashboard.no_models_title')}</h2>
          <p className="text-gray-500 mb-6">{t('dashboard.no_models_desc')}</p>
          <Link href="/models/new" prefetch={false} className="btn-primary">
            {t('dashboard.upload_first')}
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {models.map((model) => (
            <ModelCard
              key={model.id}
              id={model.id}
              title={model.title}
              description={model.description ?? undefined}
              isPublic={model.isPublic}
              viewCount={model.viewCount}
              shareToken={model.shareToken ?? undefined}
              updatedAt={new Date(model.updatedAt)}
              jsonData={model.jsonData}
              thumbnailSvg={model.thumbnailSvg ?? undefined}
              codeMode={model.codeMode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
