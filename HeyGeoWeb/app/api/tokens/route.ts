import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';
import { randomBytes } from 'crypto';

// GET /api/tokens – list user's API tokens (values hidden)
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const tokens = await prisma.apiToken.findMany({
    where: { userId: auth.userId },
    select: { id: true, name: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ tokens });
}

// POST /api/tokens – create new API token
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  let body: { name?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Tên token là bắt buộc' }, { status: 400 });
  }

  const rawToken = randomBytes(32).toString('hex'); // 64-char hex string

  const apiToken = await prisma.apiToken.create({
    data: {
      name: body.name.trim(),
      token: rawToken,
      userId: auth.userId,
    },
  });

  return NextResponse.json({
    token: { id: apiToken.id, name: apiToken.name, createdAt: apiToken.createdAt },
    value: rawToken, // Shown ONCE – client must store it immediately
  }, { status: 201 });
}
