import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';
import { hashPassword } from '@/lib/auth';

// GET /api/admin/users/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:        true,
      email:     true,
      name:      true,
      avatar:    true,
      bio:       true,
      phone:     true,
      role:      true,
      createdAt: true,
      updatedAt: true,
      models: {
        orderBy: { createdAt: 'desc' },
        select: {
          id:           true,
          title:        true,
          isPublic:     true,
          viewCount:    true,
          createdAt:    true,
        },
      },
      apiTokens: {
        orderBy: { createdAt: 'desc' },
        select: {
          id:        true,
          name:      true,
          lastUsed:  true,
          createdAt: true,
        },
      },
      _count: { select: { models: true, apiTokens: true } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

// PATCH /api/admin/users/[id]  — update role, name, email, bio, phone, password
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { role, name, email, bio, phone, password } = body as {
    role?: string;
    name?: string;
    email?: string;
    bio?: string;
    phone?: string;
    password?: string;
  };

  if (role !== undefined && role !== 'ADMIN' && role !== 'USER') {
    return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 });
  }

  // Prevent stripping the only admin
  if (role === 'USER') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === 'ADMIN' && adminCount <= 1) {
      return NextResponse.json({ error: 'Không thể xóa vai trò admin của người dùng admin duy nhất' }, { status: 400 });
    }
  }

  // Validate email uniqueness if being changed
  if (email !== undefined) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }
    const existing = await prisma.user.findFirst({ where: { email: trimmedEmail, NOT: { id } } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được dùng bởi tài khoản khác' }, { status: 409 });
    }
  }

  // Validate password length
  if (password !== undefined) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (role !== undefined) data.role = role;
  if (name !== undefined) data.name = name.trim() || null;
  if (email !== undefined) data.email = email.trim().toLowerCase();
  if (bio !== undefined) data.bio = bio.trim() || null;
  if (phone !== undefined) data.phone = phone.trim() || null;
  if (password !== undefined) data.password = await hashPassword(password);

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user: updated });
}

// DELETE /api/admin/users/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Prevent self-deletion
  if (id === auth.user.userId) {
    return NextResponse.json({ error: 'Không thể xóa tài khoản của chính mình' }, { status: 400 });
  }

  // Prevent deleting last admin
  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }
  if (target.role === 'ADMIN') {
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Không thể xóa admin duy nhất' }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
