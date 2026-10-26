import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

// GET /api/auth/me
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { id: true, email: true, name: true, avatar: true, bio: true, phone: true, createdAt: true },
  });

  if (!user) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });

  return NextResponse.json({ user });
}
