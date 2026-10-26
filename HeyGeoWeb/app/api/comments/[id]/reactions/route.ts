import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

const VALID_TYPES = ['like', 'question', 'insight'] as const;
type ReactionType = (typeof VALID_TYPES)[number];

// POST /api/comments/:id/reactions  — toggle a reaction (add if absent, remove if present)
export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  let body: { type?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { type } = body;
  if (!VALID_TYPES.includes(type as ReactionType)) {
    return NextResponse.json({ error: 'Loại reaction không hợp lệ' }, { status: 400 });
  }

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { id: true, isDeleted: true, userId: true, modelId: true },
  });
  if (!comment || comment.isDeleted) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  const existing = await prisma.commentReaction.findUnique({
    where: {
      commentId_userId_type: { commentId: id, userId: auth.userId, type: type! },
    },
  });

  if (existing) {
    await prisma.commentReaction.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: 'removed', type });
  } else {
    await prisma.commentReaction.create({
      data: { commentId: id, userId: auth.userId, type: type! },
    });

    // Notify comment owner about the reaction (fire-and-forget, skip self-notify)
    if (comment.userId && comment.userId !== auth.userId) {
      const reactorName = auth.email;
      const emojiMap: Record<string, string> = { like: '👍', question: '❓', insight: '💡' };
      prisma.notification.create({
        data: {
          userId: comment.userId,
          type: 'COMMENT_REACTION',
          message: `${reactorName} đã react ${emojiMap[type!] ?? ''} vào bình luận của bạn.`,
          modelId: comment.modelId,
        },
      }).catch(() => {});
    }

    return NextResponse.json({ action: 'added', type });
  }
}
