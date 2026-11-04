import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { BACKUP_FORMAT, BACKUP_VERSION } from '@/lib/backup';

// GET /api/backup/export — the payload the browser packs into a zip.
// The Sync tab reuses it to pull every model in one request.
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  if (!rateLimit(`backup-export:${auth.userId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: 'Quá nhiều lần xuất. Vui lòng thử lại sau ít phút.' },
      { status: 429 },
    );
  }

  const [user, models] = await Promise.all([
    prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true, email: true, name: true },
    }),
    prisma.model.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: {
      username: user?.username ?? null,
      email: user?.email ?? auth.email,
      name: user?.name ?? null,
    },
    modelCount: models.length,
    models,
  });
}
