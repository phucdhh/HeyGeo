/**
 * Auth utilities for Node.js API routes (bcrypt + JWT).
 * Do NOT import this from middleware.ts – use lib/jwt.ts instead.
 */
import bcrypt from 'bcryptjs';

// Re-export Edge-compatible JWT helpers so callers need only one import
export { signToken, verifyToken, type JWTPayload } from './jwt';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  plaintext: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(plaintext, hashed);
}
