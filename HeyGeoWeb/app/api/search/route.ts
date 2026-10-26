import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/search?q=...  – search public models
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const results = await prisma.model.findMany({
    where: {
      isPublic: true,
      shareToken: { not: null },
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: [{ viewCount: 'desc' }, { publishedAt: { sort: 'desc', nulls: 'last' } }],
    take: 20,
    select: {
      id: true,
      title: true,
      description: true,
      shareToken: true,
      viewCount: true,
      thumbnailSvg: true,
      publishedAt: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ results });
}
