import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import GalleryClient from './GalleryClient';

export const metadata: Metadata = { title: 'Phòng trưng bày mô hình' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 12;

const SELECT = {
  id: true,
  title: true,
  description: true,
  shareToken: true,
  viewCount: true,
  thumbnailSvg: true,
  publishedAt: true,
  createdAt: true,
  categories: true,
  jsonData: true,
  user: { select: { name: true, email: true, avatar: true, username: true } },
} as const;

interface SearchParams {
  page?: string;
  category?: string;
  q?: string;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page     = Math.max(1, parseInt(params.page ?? '1', 10));
  const category = params.category?.trim() ?? '';
  const q        = params.q?.trim() ?? '';

  // --- Resolve logged-in user (optional) ---
  let user: { email: string; name: string | null; avatar: string | null } | null = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (token) {
      const payload = await verifyToken(token);
      if (payload) {
        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { email: true, name: true, avatar: true },
        });
        if (dbUser) user = dbUser;
      }
    }
  } catch {
    // unauthenticated – ok
  }

  const where = {
    isPublic:    true,
    shareToken:  { not: null as null },
    ...(category ? { categories: { has: category } } : {}),
    ...(q
      ? {
          OR: [
            { title:       { contains: q, mode: 'insensitive' as const } },
            { description: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const [models, total] = await Promise.all([
    prisma.model.findMany({
      where,
      orderBy: { publishedAt: { sort: 'desc', nulls: 'last' } },
      skip:    (page - 1) * PAGE_SIZE,
      take:    PAGE_SIZE,
      select:  SELECT,
    }),
    prisma.model.count({ where }),
  ]);

  return (
    <GalleryClient
      models={models.map((m) => ({
        ...m,
        createdAt: (m.publishedAt ?? m.createdAt).toISOString(),
        modelType: (m.jsonData as Record<string, unknown> | null)?.__type as string | undefined,
        jsonData: undefined,
      }))}
      total={total}
      pageSize={PAGE_SIZE}
      currentPage={page}
      currentCategory={category}
      currentQuery={q}
      user={user}
    />
  );
}
