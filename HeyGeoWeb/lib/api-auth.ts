/**
 * Resolves the authenticated user from an incoming API request.
 *
 * Priority:
 *  1. `auth-token` httpOnly cookie  (web browser sessions)
 *  2. `Authorization: Bearer <jwt>` header  (JWT token, e.g. short-lived)
 *  3. `Authorization: Bearer <apiToken>` header  (long-lived API token for Qt desktop app)
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from './jwt';
import { prisma } from './prisma';

export async function getAuthUser(request: NextRequest): Promise<JWTPayload | null> {
  // 1. Cookie (web)
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    const payload = await verifyToken(cookieToken);
    if (payload) return payload;
  }

  // 2. Authorization header (JWT or API token)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const raw = authHeader.slice(7).trim();

    // Try JWT first
    const jwtPayload = await verifyToken(raw);
    if (jwtPayload) return jwtPayload;

    // Fall back to ApiToken lookup (for Qt desktop app)
    const apiToken = await prisma.apiToken.findUnique({
      where: { token: raw },
      include: { user: { select: { id: true, email: true, role: true } } },
    });
    if (apiToken) {
      // Non-blocking last-used update
      prisma.apiToken
        .update({ where: { id: apiToken.id }, data: { lastUsed: new Date() } })
        .catch(() => {});
      return { userId: apiToken.user.id, email: apiToken.user.email, role: apiToken.user.role };
    }
  }

  return null;
}

/** Returns 401/403 JSON response if the caller is not an ADMIN, otherwise null. */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: JWTPayload } | NextResponse> {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
  }
  return { user };
}
