import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/admin/stats
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const [totalUsers, totalAdmins, totalModels, totalPublicModels, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.model.count(),
    prisma.model.count({ where: { isPublic: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, email: true, name: true, avatar: true, role: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    totalUsers,
    totalAdmins,
    totalModels,
    totalPublicModels,
    recentUsers,
  });
}
