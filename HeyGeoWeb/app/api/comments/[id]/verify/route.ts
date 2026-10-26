import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

// POST /api/comments/:id/verify  — toggle isVerified (model owner or ADMIN only)
export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { modelId: true, isVerified: true, isDeleted: true, userId: true },
  });
  if (!comment || comment.isDeleted) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }

  // Only the model owner or ADMIN can verify
  const model = await prisma.model.findUnique({
    where: { id: comment.modelId },
    select: { userId: true, title: true },
  });
  if (!model) {
    return NextResponse.json({ error: 'Không tìm thấy mô hình' }, { status: 404 });
  }
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  const newVerified = !comment.isVerified;
  const updated = await prisma.comment.update({
    where: { id },
    data: { isVerified: newVerified },
    select: { isVerified: true },
  });

  // Notify comment author when marked as verified (fire-and-forget, skip self-notify)
  if (newVerified && comment.userId && comment.userId !== auth.userId) {
    prisma.notification.create({
      data: {
        userId: comment.userId,
        type: 'COMMENT_VERIFIED',
        message: `Bình luận của bạn đã được xác nhận là câu trả lời đúng trong mô hình "${model.title}".`,
        modelId: comment.modelId,
      },
    }).catch(() => {});
  }

  return NextResponse.json({ isVerified: updated.isVerified });
}
