'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import '@/lib/i18n';
import PublicModelCard from '@/components/PublicModelCard';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import UserAvatar from '@/components/UserAvatar';

const MATH_CATEGORIES = [
  { key: 'Số học',              labelKey: 'gallery.cat_arithmetic'     },
  { key: 'Đại số',              labelKey: 'gallery.cat_algebra'        },
  { key: 'Hình học phẳng',      labelKey: 'gallery.cat_plane_geometry' },
  { key: 'Hình học không gian', labelKey: 'gallery.cat_solid_geometry' },
  { key: 'Giải tích',           labelKey: 'gallery.cat_calculus'       },
  { key: 'Lượng giác',          labelKey: 'gallery.cat_trigonometry'   },
  { key: 'Thống kê',            labelKey: 'gallery.cat_statistics'     },
  { key: 'Xác suất',            labelKey: 'gallery.cat_probability'    },
  { key: 'Trò chơi',            labelKey: 'gallery.cat_games'          },
];

const TOOL_CATEGORIES = [
  'HeyGeo',
  'JSXGraph',
  'CindyJS',
  'GeoGebra',
  'Sketchpad',
  'Web Sketchpad',
  'Geometry Expressions',
];

interface GalleryModel {
  id: string;
  title: string;
  description?: string | null;
  shareToken: string | null;
  viewCount: number;
  thumbnailSvg?: string | null;
  createdAt: string;          // ISO string (serialised from server)
  categories: string[];
  modelType?: string | null;
  user: { name?: string | null; email: string; avatar?: string | null; username?: string | null };
}

interface Props {
  models:          GalleryModel[];
  total:           number;
  pageSize:        number;
  currentPage:     number;
  currentCategory: string;
  currentQuery:    string;
  user:            { email: string; name: string | null; avatar: string | null } | null;
}

export default function GalleryClient({
  models,
  total,
  pageSize,
  currentPage,
  currentCategory,
  currentQuery,
  user,
}: Props) {
  const { t } = useTranslation();
  const router        = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(currentQuery);
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.ceil(total / pageSize);

  const navigate = useCallback(
    (opts: { page?: number; category?: string; q?: string }) => {
      const p    = opts.page     !== undefined ? opts.page     : currentPage;
      const cat  = opts.category !== undefined ? opts.category : currentCategory;
      const q    = opts.q        !== undefined ? opts.q        : currentQuery;
      const sp   = new URLSearchParams();
      if (p > 1)  sp.set('page',     String(p));
      if (cat)    sp.set('category', cat);
      if (q)      sp.set('q',        q);
      const qs = sp.toString();
      router.push(`/gallery${qs ? '?' + qs : ''}`);
    },
    [router, currentPage, currentCategory, currentQuery],
  );

  const handleSearch = (val: string) => {
    setSearchInput(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: val, page: 1 }), 400);
  };

  const handleCategory = (cat: string) => {
    navigate({ category: cat === currentCategory ? '' : cat, page: 1 });
  };

  // Build pagination page numbers with ellipsis
  const pageNumbers: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 2) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== '…') {
      pageNumbers.push('…');
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Nav ────────────────────────────────────────────────── */}
      <header className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <img src="/logo.svg" alt="HeyGeo logo" className="w-16 h-16 flex-shrink-0" />
            <span>Hey<span className="text-amber-300">Geo</span></span>
          </Link>
          <nav className="flex items-center gap-4">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link href="/dashboard" className="text-sm text-amber-200 hover:text-white transition-colors">
                  {t('nav.dashboard')}
                </Link>
                <UserAvatar user={user} />
              </>
            ) : (
              <>
                <Link href="/login"    className="text-sm text-amber-200 hover:text-white transition-colors">{t('gallery.login')}</Link>
                <Link href="/register" className="btn-primary text-sm !py-2 !px-4">{t('gallery.register')}</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ── Gallery header + search ──────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 text-white py-10 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-1.5 text-amber-300 text-sm mb-3 font-medium">
            <Link href="/" className="hover:text-amber-100 transition-colors">{t('gallery.breadcrumb_home')}</Link>
            <span className="text-amber-500">/</span>
            <span>{t('gallery.breadcrumb_current')}</span>
          </div>
          <h1 className="text-3xl font-bold mb-6">{t('gallery.heading')}</h1>

          {/* Wide search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-4 flex items-center text-gray-400 text-lg pointer-events-none">🔍</span>
            <input
              type="search"
              className="w-full pl-12 pr-5 py-3.5 rounded-xl bg-white text-gray-900 text-base placeholder-gray-400 outline-none focus:ring-2 focus:ring-amber-400 shadow-md"
              placeholder={t('gallery.search_placeholder')}
              value={searchInput}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ── Body (sidebar + content) ─────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-56' : 'w-0'
          } flex-shrink-0 transition-[width] duration-200 overflow-hidden bg-white border-r border-gray-200`}
        >
          <div className="p-4 w-56">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{t('gallery.sidebar_categories')}</h2>
            <ul className="space-y-0.5">
              <li>
                <button
                  onClick={() => handleCategory('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !currentCategory
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {t('gallery.all')}
                </button>
              </li>
            </ul>

            {/* Math topics */}
            <p className="mt-4 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('gallery.math_section')}</p>
            <ul className="space-y-0.5">
              {MATH_CATEGORIES.map((cat) => (
                <li key={cat.key}>
                  <button
                    onClick={() => handleCategory(cat.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentCategory === cat.key
                        ? 'bg-amber-100 text-amber-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(cat.labelKey)}
                  </button>
                </li>
              ))}
            </ul>

            {/* Tool types */}
            <p className="mt-4 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{t('gallery.tool_section')}</p>
            <ul className="space-y-0.5">
              {TOOL_CATEGORIES.map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => handleCategory(cat)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentCategory === cat
                        ? 'bg-violet-100 text-violet-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {cat}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 bg-gray-50">

          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-5 py-2.5 flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              title={sidebarOpen ? t('gallery.sidebar_close') : t('gallery.sidebar_open')}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span className="text-base leading-none select-none">☰</span>
              <span className="hidden sm:inline text-xs">{sidebarOpen ? t('gallery.sidebar_close') : t('gallery.sidebar_categories')}</span>
            </button>

            {currentCategory && (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full">
                {MATH_CATEGORIES.find((c) => c.key === currentCategory)
                  ? t(MATH_CATEGORIES.find((c) => c.key === currentCategory)!.labelKey)
                  : currentCategory}
                <button
                  onClick={() => handleCategory('')}
                  className="hover:text-amber-900 font-bold"
                  aria-label="Xoá bộ lọc"
                >×</button>
              </span>
            )}

            <span className="ml-auto text-xs text-gray-400">
              {t('gallery.model_count', { count: total.toLocaleString() })}
            </span>
          </div>

          {/* Grid */}
          <div className="flex-1 p-6">
            {models.length === 0 ? (
              <div className="text-center py-24 text-gray-400">
                <p className="text-5xl mb-4">🔍</p>
                <p className="text-lg font-medium text-gray-500">{t('gallery.empty_title')}</p>
                <p className="text-sm mt-2">{t('gallery.empty_desc')}</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {models.map((m) => (
                  <PublicModelCard
                    key={m.id}
                    title={m.title}
                    description={m.description}
                    shareToken={m.shareToken!}
                    viewCount={m.viewCount}
                    createdAt={new Date(m.createdAt)}
                    thumbnailSvg={m.thumbnailSvg}
                    authorName={m.user.name ?? m.user.email}
                    authorAvatar={m.user.avatar}
                    authorSlug={m.user.username}
                    modelType={m.modelType}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-wrap justify-center items-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => navigate({ page: currentPage - 1 })}
                  className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  {t('gallery.prev')}
                </button>

                {pageNumbers.map((item, idx) =>
                  item === '…' ? (
                    <span key={`dots-${idx}`} className="px-2 text-gray-400 select-none">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => navigate({ page: item as number })}
                      className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                        currentPage === item
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}

                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => navigate({ page: currentPage + 1 })}
                  className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40 hover:bg-gray-100 transition-colors"
                >
                  {t('gallery.next')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-brand-900 text-amber-200 py-8 px-6 text-center text-sm">
        <p>
          © {new Date().getFullYear()} HeyGeo ·{' '}
          <Link href="/" className="underline hover:text-white transition-colors">{t('gallery.footer_home')}</Link>
        </p>
      </footer>
    </div>
  );
}
