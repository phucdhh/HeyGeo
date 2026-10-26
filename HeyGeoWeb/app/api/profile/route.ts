import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

// GET /api/profile
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

// PATCH /api/profile
export async function PATCH(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const { name, bio, phone, username } = body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
    return NextResponse.json({ error: 'Tên không hợp lệ (tối đa 100 ký tự)' }, { status: 400 });
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
    return NextResponse.json({ error: 'Giới thiệu không hợp lệ (tối đa 500 ký tự)' }, { status: 400 });
  }
  if (phone !== undefined && (typeof phone !== 'string' || phone.length > 20)) {
    return NextResponse.json({ error: 'Số điện thoại không hợp lệ' }, { status: 400 });
  }
  if (username !== undefined) {
    if (typeof username !== 'string' || !/^[a-z0-9_]{3,30}$/.test(username)) {
      return NextResponse.json(
        { error: 'Tên trang không hợp lệ (3–30 ký tự, chỉ dùng a–z, 0–9, _)' },
        { status: 400 },
      );
    }
    const taken = await prisma.user.findUnique({ where: { username } });
    if (taken && taken.id !== auth.userId) {
      return NextResponse.json({ error: 'Tên trang đã được sử dụng' }, { status: 409 });
    }
  }

  const updated = await prisma.user.update({
    where: { id: auth.userId },
    data: {
      ...(name     !== undefined && { name:     (name     as string).trim() || null }),
      ...(bio      !== undefined && { bio:      (bio      as string).trim() || null }),
      ...(phone    !== undefined && { phone:    (phone    as string).trim() || null }),
      ...(username !== undefined && { username: (username as string).trim() }),
    },
    select: { id: true, email: true, name: true, avatar: true, bio: true, phone: true, username: true },
  });

  return NextResponse.json({ user: updated });
}
