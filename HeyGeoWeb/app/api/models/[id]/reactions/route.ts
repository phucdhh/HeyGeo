import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

const VALID_TYPES = ['LIKE', 'LOVE', 'AMAZING', 'NOT_UNDERSTAND'] as const;
type ReactionType = (typeof VALID_TYPES)[number];

interface Ctx { params: Promise<{ id: string }> }

// GET /api/models/:id/reactions
// Returns: { counts: { LIKE: n, LOVE: n, AMAZING: n, NOT_UNDERSTAND: n }, myReaction: string | null }
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const model = await prisma.model.findUnique({
    where: { id },
    select: { isPublic: true },
  });
  if (!model?.isPublic) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const auth = await getAuthUser(request);

  const [rows, myRow] = await Promise.all([
    prisma.modelReaction.groupBy({
      by: ['type'],
      where: { modelId: id },
      _count: { id: true },
    }),
    auth
      ? prisma.modelReaction.findUnique({
          where: { modelId_userId: { modelId: id, userId: auth.userId } },
          select: { type: true },
        })
      : Promise.resolve(null),
  ]);

  const counts: Record<ReactionType, number> = {
    LIKE: 0, LOVE: 0, AMAZING: 0, NOT_UNDERSTAND: 0,
  };
  for (const row of rows) {
    if (VALID_TYPES.includes(row.type as ReactionType)) {
      counts[row.type as ReactionType] = row._count.id;
    }
  }

  return NextResponse.json({ counts, myReaction: myRow?.type ?? null });
}

// POST /api/models/:id/reactions
// Body: { type: 'LIKE' | 'LOVE' | 'AMAZING' | 'NOT_UNDERSTAND' }
// Toggle: if user already reacted with same type → removes it; otherwise upserts.
export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const model = await prisma.model.findUnique({
    where: { id },
    select: { isPublic: true },
  });
  if (!model?.isPublic) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  let body: { type?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { type } = body;
  if (!type || !VALID_TYPES.includes(type as ReactionType)) {
    return NextResponse.json({ error: 'Reaction type không hợp lệ' }, { status: 400 });
  }

  const existing = await prisma.modelReaction.findUnique({
    where: { modelId_userId: { modelId: id, userId: auth.userId } },
  });

  let myReaction: string | null;
  if (existing?.type === type) {
    // Same type clicked → toggle off
    await prisma.modelReaction.delete({ where: { id: existing.id } });
    myReaction = null;
  } else {
    // New or changed reaction → upsert
    await prisma.modelReaction.upsert({
      where: { modelId_userId: { modelId: id, userId: auth.userId } },
      create: { modelId: id, userId: auth.userId, type: type as ReactionType },
      update: { type: type as ReactionType },
    });
    myReaction = type;
  }

  // Return fresh counts
  const rows = await prisma.modelReaction.groupBy({
    by: ['type'],
    where: { modelId: id },
    _count: { id: true },
  });

  const counts: Record<ReactionType, number> = {
    LIKE: 0, LOVE: 0, AMAZING: 0, NOT_UNDERSTAND: 0,
  };
  for (const row of rows) {
    if (VALID_TYPES.includes(row.type as ReactionType)) {
      counts[row.type as ReactionType] = row._count.id;
    }
  }

  return NextResponse.json({ counts, myReaction });
}
