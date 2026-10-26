import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './lib/jwt';

const PROTECTED = ['/dashboard', '/models', '/settings', '/design'];
const ADMIN_ONLY = ['/admin'];
const AUTH_ONLY  = ['/login', '/register'];

/** Build an absolute URL using the public-facing host from Cloudflare headers,
 *  falling back to NEXT_PUBLIC_BASE_URL, then request.nextUrl as last resort. */
function redirect(request: NextRequest, path: string) {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ??
    (() => {
      const host = request.headers.get('x-forwarded-host') ?? request.nextUrl.host;
      const proto = request.headers.get('x-forwarded-proto') ?? 'https';
      return `${proto}://${host}`;
    })();
  return NextResponse.redirect(`${base}${path}`);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value ?? null;

  const isProtected = PROTECTED.some((p) => pathname.startsWith(p));
  const isAdminOnly  = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAuthOnly  = AUTH_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isAdminOnly) {
    if (!token) return redirect(request, '/login');
    const payload = await verifyToken(token);
    if (!payload) {
      const res = redirect(request, '/login');
      res.cookies.delete('auth-token');
      return res;
    }
    if (payload.role !== 'ADMIN') {
      return redirect(request, '/dashboard');
    }
  }

  if (isProtected) {
    if (!token) {
      return redirect(request, '/login');
    }
    const payload = await verifyToken(token);
    if (!payload) {
      const res = redirect(request, '/login');
      res.cookies.delete('auth-token');
      return res;
    }
  }

  if (isAuthOnly && token) {
    const payload = await verifyToken(token);
    if (payload) {
      return redirect(request, '/dashboard');
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/admin',
    '/dashboard/:path*',
    '/models/:path*',
    '/settings/:path*',
    '/design/:path*',
    '/design',
    '/login',
    '/register',
  ],
};
