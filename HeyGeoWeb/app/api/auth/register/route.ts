import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/** The client address behind the tunnel's proxy headers, for the limiter. */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

// POST /api/auth/register
export async function POST(request: NextRequest) {
  try {
    // Account creation is cheap to attempt and expensive to hold: a handful per
    // address per hour is plenty for a class, and stops scripted sign-ups.
    if (!rateLimit(`register:${clientIp(request)}`, 5, 60 * 60_000)) {
      return NextResponse.json(
        { error: 'Quá nhiều lần đăng ký. Vui lòng thử lại sau.' },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { email, password, name } = body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 8 ký tự' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'Email đã được sử dụng' }, { status: 409 });
    }

    const hashed = await hashPassword(password);

    // Auto-generate a unique username from the email local-part
    const baseSlug = normalizedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '').toLowerCase() || 'user';
    let username = baseSlug;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseSlug}${counter}`;
      counter++;
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name: name?.trim() || null,
        username,
      },
    });

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      message: 'Đăng ký thành công',
    }, { status: 201 });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[POST /api/auth/register]', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
