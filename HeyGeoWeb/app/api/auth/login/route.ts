import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

/** The client address behind the tunnel's proxy headers, for the limiter. */
function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

// POST /api/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password) {
      return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    // Password guessing: a burst from one address, or against one account, is
    // refused before bcrypt runs. The message is the same as a wrong password,
    // so the limit says nothing about which emails exist.
    const tooMany = 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.';
    if (!rateLimit(`login-ip:${clientIp(request)}`, 20, 60_000)
        || !rateLimit(`login-email:${normalized}`, 8, 60_000)) {
      return NextResponse.json({ error: tooMany }, { status: 429 });
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
    }

    const token = await signToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token, // Returned for API clients (Qt desktop app)
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
  }
}
