import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

interface Ctx { params: Promise<{ id: string }> }

// DELETE /api/tokens/:id
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { id } = await ctx.params;
  const token = await prisma.apiToken.findFirst({ where: { id, userId: auth.userId } });
  if (!token) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  await prisma.apiToken.delete({ where: { id } });
  return NextResponse.json({ message: 'Đã xoá token' });
}
