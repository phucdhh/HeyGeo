import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

// PATCH /api/comments/:id  — edit content (owner only, within 15 min)
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true, isDeleted: true, createdAt: true },
  });

  if (!comment) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (comment.isDeleted) return NextResponse.json({ error: 'Bình luận đã bị xóa' }, { status: 400 });
  if (comment.userId !== auth.userId) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

  // Only allow editing within 15 minutes of posting
  if (Date.now() - comment.createdAt.getTime() > 15 * 60_000) {
    return NextResponse.json(
      { error: 'Chỉ có thể chỉnh sửa trong vòng 15 phút sau khi đăng' },
      { status: 403 },
    );
  }

  let body: { content?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { content } = body;
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Nội dung không được trống' }, { status: 400 });
  }
  if (content.trim().length > 2000) {
    return NextResponse.json({ error: 'Nội dung quá dài (tối đa 2000 ký tự)' }, { status: 400 });
  }

  const updated = await prisma.comment.update({
    where: { id },
    data: { content: content.trim(), editedAt: new Date() },
    select: { id: true, content: true, editedAt: true },
  });

  return NextResponse.json({ comment: updated });
}

// DELETE /api/comments/:id  — soft-delete (sets isDeleted: true)
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;

  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true, isDeleted: true },
  });

  if (!comment) {
    return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  }
  if (comment.isDeleted) {
    return NextResponse.json({ error: 'Bình luận đã bị xóa' }, { status: 400 });
  }
  if (comment.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  await prisma.comment.update({
    where: { id },
    data: { isDeleted: true },
  });

  return NextResponse.json({ ok: true });
}
