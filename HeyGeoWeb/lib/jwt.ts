/**
 * JWT utilities using `jose` – Edge Runtime compatible.
 * Importable from middleware and API routes alike.
 */
import { SignJWT, jwtVerify } from 'jose';

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string; // 'USER' | 'ADMIN' — optional for backward compat with existing tokens
}

function getSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload['userId'];
    const email  = payload['email'];
    const role   = payload['role'];
    if (typeof userId !== 'string' || typeof email !== 'string') return null;
    return { userId, email, role: typeof role === 'string' ? role : undefined };
  } catch {
    return null;
  }
}
