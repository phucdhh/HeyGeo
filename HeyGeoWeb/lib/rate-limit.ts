/**
 * Simple in-memory rate limiter for Next.js API routes.
 *
 * Uses a sliding-window counter per key (typically userId).
 * State is process-local — resets on server restart — which is fine
 * for preventing abuse bursts rather than enforcing hard quotas.
 */

interface Entry {
  count: number;
  windowStart: number;
}

const store = new Map<string, Entry>();

// Evict stale entries every 10 minutes to avoid unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > 10 * 60 * 1000) store.delete(key);
  }
}, 10 * 60 * 1000);

/**
 * Check whether `key` has exceeded `limit` requests in the last `windowMs`.
 *
 * @returns `true` if the request is allowed, `false` if rate-limited.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}
