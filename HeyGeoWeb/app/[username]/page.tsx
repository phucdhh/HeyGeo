import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import PublicModelCard from '@/components/PublicModelCard';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}

const PAGE_SIZE = 12;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const user = await prisma.user.findUnique({
    where: { username },
    select: { name: true, username: true },
  });
  if (!user) return { title: 'Không tìm thấy' };
  return { title: `${user.name ?? user.username} – HeyGeo` };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default async function UserGalleryPage({ params, searchParams }: Props) {
  const { username } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? '1', 10));

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, name: true, email: true, avatar: true, bio: true, username: true, createdAt: true },
  });

  if (!user) notFound();

  const where = { userId: user.id, isPublic: true, shareToken: { not: null as null } };

  const [models, total] = await Promise.all([
    prisma.model.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, title: true, description: true, shareToken: true,
        viewCount: true, thumbnailSvg: true, createdAt: true, categories: true, jsonData: true,
      },
    }),
    prisma.model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const displayName = user.name ?? user.username ?? user.email;
  const avatarSrc = user.avatar
    ? (user.avatar.startsWith('/api/') || user.avatar.startsWith('http')
        ? user.avatar
        : `/api/avatars/${user.avatar.replace(/^\/avatars\//, '')}`)
    : null;

  // Pagination page numbers with ellipsis
  const pageNumbers: (number | '…')[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 2) {
      pageNumbers.push(i);
    } else if (pageNumbers[pageNumbers.length - 1] !== '…') {
      pageNumbers.push('…');
    }
  }

  function pageHref(p: number) {
    return `/${username}${p > 1 ? `?page=${p}` : ''}`;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="bg-brand-900 text-white">
        <div className="mx-auto max-w-7xl px-6 py-1 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold tracking-tight">
            <img src="/logo.svg" alt="HeyGeo logo" className="w-16 h-16 flex-shrink-0" />
            <span>Hey<span className="text-amber-300">Geo</span></span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login"    className="text-sm text-amber-200 hover:text-white transition-colors">Đăng nhập</Link>
            <Link href="/register" className="btn-primary text-sm !py-2 !px-4">Đăng ký</Link>
          </nav>
        </div>
      </header>

      {/* Author hero */}
      <div className="bg-gradient-to-r from-brand-900 to-brand-700 text-white py-10 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center gap-1.5 text-amber-300 text-sm mb-5 font-medium">
            <Link href="/"       className="hover:text-amber-100 transition-colors">Trang chủ</Link>
            <span className="text-amber-500">/</span>
            <Link href="/gallery" className="hover:text-amber-100 transition-colors">Phòng trưng bày</Link>
            <span className="text-amber-500">/</span>
            <span>{displayName}</span>
          </div>
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-indigo-400 flex items-center justify-center text-white font-bold text-2xl ring-4 ring-white/20 flex-shrink-0">
              {avatarSrc ? (
                <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span>{getInitials(displayName)}</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {user.username && (
                <p className="text-amber-300 text-sm mt-0.5">@{user.username}</p>
              )}
              {user.bio && (
                <p className="text-amber-100 text-sm mt-2 max-w-xl">{user.bio}</p>
              )}
              <p className="text-amber-300/70 text-xs mt-2">
                Tham gia từ {new Date(user.createdAt).toLocaleDateString('vi-VN')} ·{' '}
                {total.toLocaleString('vi-VN')} mô hình công khai
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Models grid */}
      <main className="flex-1 bg-gray-50 py-10 px-6">
        <div className="mx-auto max-w-6xl">
          {models.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-5xl mb-4">📐</p>
              <p className="text-lg font-medium text-gray-500">Chưa có mô hình công khai nào</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {models.map((m) => (
                <PublicModelCard
                  key={m.id}
                  title={m.title}
                  description={m.description}
                  shareToken={m.shareToken!}
                  viewCount={m.viewCount}
                  createdAt={m.createdAt}
                  thumbnailSvg={m.thumbnailSvg}
                  authorName={displayName}
                  authorAvatar={user.avatar}
                  authorSlug={user.username}
                  modelType={(m.jsonData as Record<string, unknown> | null)?.__type as string | undefined}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-10 flex flex-wrap justify-center items-center gap-2">
              <Link
                href={pageHref(page - 1)}
                aria-disabled={page <= 1}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${page <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-100'}`}
              >
                ← Trước
              </Link>
              {pageNumbers.map((item, idx) =>
                item === '…' ? (
                  <span key={`dots-${idx}`} className="px-2 text-gray-400 select-none">…</span>
                ) : (
                  <Link
                    key={item}
                    href={pageHref(item as number)}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium flex items-center justify-center transition-colors ${
                      page === item ? 'bg-amber-500 text-white border-amber-500' : 'hover:bg-gray-100'
                    }`}
                  >
                    {item}
                  </Link>
                )
              )}
              <Link
                href={pageHref(page + 1)}
                aria-disabled={page >= totalPages}
                className={`px-4 py-2 rounded-lg border text-sm transition-colors ${page >= totalPages ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-100'}`}
              >
                Tiếp →
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-brand-900 text-amber-200 py-8 px-6 text-center text-sm">
        <p>
          © {new Date().getFullYear()} HeyGeo ·{' '}
          <Link href="/" className="underline hover:text-white transition-colors">Trang chủ</Link>
        </p>
      </footer>
    </div>
  );
}
