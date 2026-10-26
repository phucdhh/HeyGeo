import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/api-auth';

// GET /api/admin/notifications — list all notifications (admin view)
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const sp = request.nextUrl.searchParams;
  const page   = Math.max(1, parseInt(sp.get('page') ?? '1', 10));
  const limit  = 20;
  const isRead = sp.get('isRead'); // 'true' | 'false' | null
  const type   = sp.get('type');   // NotifType string | null
  const userId = sp.get('userId'); // filter by recipient | null

  const where: Record<string, unknown> = {};
  if (isRead === 'true') where.isRead = true;
  if (isRead === 'false') where.isRead = false;
  if (type) where.type = type;
  if (userId) where.userId = userId;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id:        true,
        type:      true,
        message:   true,
        modelId:   true,
        isRead:    true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return NextResponse.json({ notifications, total, page, limit });
}

// POST /api/admin/notifications  — send a notification to a user
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  let body: { userId?: string; type?: string; message?: string; modelId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { userId, type, message, modelId } = body;

  if (!userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'userId là bắt buộc' }, { status: 400 });
  }
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return NextResponse.json({ error: 'message là bắt buộc' }, { status: 400 });
  }

  const notifType = type === 'INACTIVITY_WARNING' ? 'INACTIVITY_WARNING' : 'ADMIN_MESSAGE';

  // Verify user exists
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
  }

  const notification = await prisma.notification.create({
    data: {
      userId,
      type: notifType,
      message: message.trim(),
      modelId: modelId ?? null,
    },
  });

  return NextResponse.json({ notification }, { status: 201 });
}

// DELETE /api/admin/notifications?id=...  — delete a notification
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'id là bắt buộc' }, { status: 400 });
  }

  await prisma.notification.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
