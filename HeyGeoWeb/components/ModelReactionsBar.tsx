'use client';

import { useState, useEffect, useCallback } from 'react';

type ReactionType = 'LIKE' | 'LOVE' | 'AMAZING' | 'NOT_UNDERSTAND';

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'LIKE',          emoji: '👍', label: 'Hay' },
  { type: 'LOVE',          emoji: '❤️', label: 'Thích' },
  { type: 'AMAZING',       emoji: '😲', label: 'Tuyệt vời' },
  { type: 'NOT_UNDERSTAND',emoji: '🤔', label: 'Khó hiểu' },
];

interface Props {
  modelId: string;
  isLoggedIn: boolean;
}

export default function ModelReactionsBar({ modelId, isLoggedIn }: Props) {
  const [counts, setCounts] = useState<Record<ReactionType, number>>({
    LIKE: 0, LOVE: 0, AMAZING: 0, NOT_UNDERSTAND: 0,
  });
  const [myReaction, setMyReaction] = useState<ReactionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/models/${modelId}/reactions`);
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
        setMyReaction(data.myReaction ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => { fetchReactions(); }, [fetchReactions]);

  const handleClick = async (type: ReactionType) => {
    if (!isLoggedIn) {
      window.location.href = '/login';
      return;
    }
    if (pending) return;

    // Optimistic update
    const prev = myReaction;
    const prevCounts = { ...counts };

    const isToggleOff = myReaction === type;
    const newCounts = { ...counts };

    if (prev !== null) newCounts[prev] = Math.max(0, newCounts[prev] - 1);
    if (!isToggleOff) newCounts[type] = newCounts[type] + 1;

    setCounts(newCounts);
    setMyReaction(isToggleOff ? null : type);
    setPending(true);

    try {
      const res = await fetch(`/api/models/${modelId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (res.ok) {
        const data = await res.json();
        setCounts(data.counts);
        setMyReaction(data.myReaction ?? null);
      } else {
        // Revert
        setCounts(prevCounts);
        setMyReaction(prev);
      }
    } catch {
      setCounts(prevCounts);
      setMyReaction(prev);
    } finally {
      setPending(false);
    }
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-5 pt-4 border-t border-gray-100">
      <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-2.5">
        Cảm nhận của bạn
      </h2>

      {loading ? (
        <div className="flex gap-2">
          {REACTIONS.map((r) => (
            <div key={r.type} className="h-10 w-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {REACTIONS.map(({ type, emoji, label }) => {
            const isActive = myReaction === type;
            const count = counts[type];
            return (
              <button
                key={type}
                onClick={() => handleClick(type)}
                disabled={pending}
                title={isLoggedIn ? (isActive ? `Bỏ "${label}"` : label) : 'Đăng nhập để reaction'}
                className={[
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-medium transition-all select-none',
                  'disabled:opacity-70 cursor-pointer',
                  isActive
                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700 shadow-sm scale-105'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700',
                ].join(' ')}
              >
                <span className="text-base leading-none">{emoji}</span>
                {count > 0 && (
                  <span className={`text-xs font-semibold tabular-nums ${isActive ? 'text-indigo-600' : 'text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!isLoggedIn && total > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          <a href="/login" className="underline hover:text-indigo-600">Đăng nhập</a> để để lại cảm nhận của bạn.
        </p>
      )}
      {!isLoggedIn && total === 0 && (
        <p className="mt-2 text-xs text-gray-400">
          <a href="/login" className="underline hover:text-indigo-600">Đăng nhập</a> để reaction đầu tiên!
        </p>
      )}
    </div>
  );
}
