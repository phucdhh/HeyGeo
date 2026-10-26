import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/admin/users?page=1&limit=20&search=&role=
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = request.nextUrl;
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit  = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));
  const search = searchParams.get('search')?.trim() ?? '';
  const role   = searchParams.get('role') ?? '';

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name:  { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role === 'ADMIN' || role === 'USER') {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id:        true,
        email:     true,
        name:      true,
        avatar:    true,
        role:      true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { models: true, apiTokens: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
