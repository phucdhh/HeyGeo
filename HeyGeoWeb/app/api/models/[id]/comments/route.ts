import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

const userSelect = { id: true, name: true, email: true, avatar: true };
const reactionSelect = { userId: true, type: true };

type RawReaction = { userId: string; type: string };

function summariseReactions(raws: RawReaction[], authUserId?: string) {
  const counts: Record<string, number> = { like: 0, question: 0, insight: 0 };
  const mine: string[] = [];
  for (const r of raws) {
    counts[r.type] = (counts[r.type] ?? 0) + 1;
    if (authUserId && r.userId === authUserId) mine.push(r.type);
  }
  return { like: counts.like, question: counts.question, insight: counts.insight, mine };
}

// GET /api/models/:id/comments?cursor=<id>&limit=20
export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 50);

  const model = await prisma.model.findUnique({
    where: { id },
    select: { isPublic: true },
  });
  if (!model?.isPublic) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const auth = await getAuthUser(request);
  const visibilityFilter = auth ? undefined : ({ visibility: 'PUBLIC' } as const);

  const rawComments = await prisma.comment.findMany({
    where: { modelId: id, parentId: null, ...visibilityFilter },
    orderBy: { createdAt: 'asc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      user: { select: userSelect },
      reactions: { select: reactionSelect },
      replies: {
        where: auth ? undefined : { visibility: 'PUBLIC' },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: userSelect },
          reactions: { select: reactionSelect },
        },
      },
    },
  });

  const hasMore = rawComments.length > limit;
  const slice = hasMore ? rawComments.slice(0, limit) : rawComments;

  const comments = slice.map((c) => ({
    ...c,
    reactions: summariseReactions(c.reactions, auth?.userId),
    replies: c.replies.map((r) => ({
      ...r,
      reactions: summariseReactions(r.reactions, auth?.userId),
    })),
  }));

  const nextCursor = hasMore ? slice[slice.length - 1].id : null;

  // Count top-level comments hidden from the current viewer because they are
  // REGISTERED_ONLY (only relevant when the viewer is not authenticated), so the
  // client can tell "no comments at all" apart from "comments exist but are
  // restricted to logged-in members".
  const hiddenCount = auth
    ? 0
    : await prisma.comment.count({
        where: { modelId: id, parentId: null, visibility: 'REGISTERED_ONLY' },
      });

  return NextResponse.json({ comments, nextCursor, hiddenCount });
}

// POST /api/models/:id/comments
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

  // Rate limiting: max 5 comments per minute per user
  const recentCount = await prisma.comment.count({
    where: {
      userId: auth.userId,
      createdAt: { gte: new Date(Date.now() - 60_000) },
    },
  });
  if (recentCount >= 5) {
    return NextResponse.json(
      { error: 'Bạn đăng quá nhanh. Vui lòng đợi 1 phút.' },
      { status: 429 },
    );
  }

  let body: { content?: string; visibility?: string; parentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { content, visibility = 'REGISTERED_ONLY', parentId } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung không được trống' }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: 'Nội dung quá dài (tối đa 2000 ký tự)' }, { status: 400 });
  }
  if (!['PUBLIC', 'REGISTERED_ONLY'].includes(visibility)) {
    return NextResponse.json({ error: 'Visibility không hợp lệ' }, { status: 400 });
  }

  // Validate parent: must exist, belong to same model, and be a top-level comment (no nesting beyond 1 level)
  let parentOwnerId: string | null = null;
  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { modelId: true, parentId: true, userId: true },
    });
    if (!parent || parent.modelId !== id || parent.parentId !== null) {
      return NextResponse.json({ error: 'Bình luận gốc không hợp lệ' }, { status: 400 });
    }
    parentOwnerId = parent.userId;
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      visibility: visibility as 'PUBLIC' | 'REGISTERED_ONLY',
      modelId: id,
      userId: auth.userId,
      parentId: parentId ?? null,
    },
    include: { user: { select: userSelect } },
  });

  // Notify parent comment owner about the reply (fire-and-forget, skip self-notify)
  if (parentOwnerId && parentOwnerId !== auth.userId) {
    const replierName = auth.email;
    prisma.notification.create({
      data: {
        userId: parentOwnerId,
        type: 'REPLY_ON_COMMENT',
        message: `${replierName} đã phản hồi bình luận của bạn.`,
        modelId: id,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ comment }, { status: 201 });
}
