import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

// POST /api/models/:id/publish – toggle public/private
export async function POST(request: NextRequest, ctx: Ctx) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { id } = await ctx.params;
  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  const willBePublic = !model.isPublic;
  const updated = await prisma.model.update({
    where: { id },
    data: {
      isPublic: willBePublic,
      // Update publishedAt each time the model is made public
      ...(willBePublic ? { publishedAt: new Date() } : {}),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';
  const shareUrl = updated.isPublic && updated.shareToken
    ? `${baseUrl}/share/${updated.shareToken}`
    : null;

  revalidatePath('/');
  return NextResponse.json({ model: updated, shareUrl });
}
