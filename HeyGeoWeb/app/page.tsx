import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import LandingContent from './LandingContent';
export const dynamic = 'force-dynamic';

const PUBLIC_FIELDS = {
  id: true,
  title: true,
  description: true,
  shareToken: true,
  viewCount: true,
  thumbnailSvg: true,
  createdAt: true,
  jsonData: true,
  user: { select: { name: true, email: true, avatar: true, username: true } },
} as const;

export default async function LandingPage() {
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
  } catch { /* unauthenticated – ok */ }

  const [newestModels, popularModels] = await Promise.all([
    prisma.model.findMany({
      where: { isPublic: true, shareToken: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: PUBLIC_FIELDS,
    }),
    prisma.model.findMany({
      where: { isPublic: true, shareToken: { not: null } },
      orderBy: { viewCount: 'desc' },
      take: 6,
      select: PUBLIC_FIELDS,
    }),
  ]);

  return <LandingContent newestModels={newestModels} popularModels={popularModels} user={user} />;
}
      {/* Nav */}
