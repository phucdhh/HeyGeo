'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import { sanitizeSvg } from '@/lib/sanitizeSvg';

interface SearchResult {
  id: string;
  title: string;
  description?: string | null;
  shareToken: string | null;
  viewCount: number;
  thumbnailSvg?: string | null;
  createdAt: string;
  user: { name?: string | null; email: string };
}

export default function SearchBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const { t } = useTranslation();

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
      setSearched(false);
      setActiveIndex(-1);
    }
  }, [open]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      setResults(data.results ?? []);
      setSearched(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && results[activeIndex]?.shareToken) {
        window.location.href = `/share/${results[activeIndex].shareToken}`;
        setOpen(false);
      } else {
        doSearch(query);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t('search.hint')}
        title={`${t('search.hint')} (⌘K)`}
        className="flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 transition-colors px-3 py-1.5 rounded-full border border-white/20 text-sm"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span>{t('search.hint')}</span>
        <kbd className="text-[10px] bg-white/10 border border-white/20 rounded px-1 py-0.5 font-mono text-white/50">⌘K</kbd>
      </button>

      {/* Overlay / Spotlight panel */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl bg-white"
            style={{ border: '1px solid #e5e7eb' }}
          >
            {/* Search input row */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-amber-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={t('search.placeholder')}
                className="flex-1 bg-transparent text-gray-800 placeholder-gray-400 text-base outline-none"
              />
              {loading && (
                <span className="w-4 h-4 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin flex-shrink-0" />
              )}
              {!loading && query && (
                <button
                  onClick={() => { setQuery(''); setResults([]); setSearched(false); inputRef.current?.focus(); }}
                  className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                  aria-label="Xoá"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded px-1.5 py-0.5 font-mono flex-shrink-0"
              >
                esc
              </button>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <ul className="max-h-[60vh] overflow-y-auto py-2 divide-y divide-gray-100">
                {results.map((r, idx) => (
                  <li key={r.id}>
                    <Link
                      href={`/share/${r.shareToken}`}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        idx === activeIndex ? 'bg-amber-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded-md overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-200 flex items-center justify-center">
                        {r.thumbnailSvg ? (
                          r.thumbnailSvg.startsWith('data:') ? (
                            <img
                              src={r.thumbnailSvg}
                              alt={r.title}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div
                              className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full overflow-hidden"
                              // eslint-disable-next-line react/no-danger
                              dangerouslySetInnerHTML={{ __html: sanitizeSvg(r.thumbnailSvg) }}
                            />
                          )
                        ) : (
                          <span className="text-lg">📐</span>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-amber-700 truncate">{r.title}</p>
                        <p className="text-xs text-gray-400 truncate">
                          {r.user.name || r.user.email}
                          {r.description ? ` · ${r.description.slice(0, 60)}${r.description.length > 60 ? '…' : ''}` : ''}
                        </p>
                      </div>

                      {/* Chevron */}
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {/* Empty state */}
            {searched && results.length === 0 && !loading && (
              <div className="py-10 text-center text-gray-400 text-sm select-none">
                {t('search.no_results')} &ldquo;<span className="text-amber-500">{query}</span>&rdquo;
              </div>
            )}

            {/* Idle hint */}
            {!searched && !loading && (
              <div className="py-6 px-4 flex items-center justify-center gap-6 text-gray-300 text-xs select-none">
                <span>↑↓ di chuyển</span>
                <span>↵ mở</span>
                <span>esc đóng</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
