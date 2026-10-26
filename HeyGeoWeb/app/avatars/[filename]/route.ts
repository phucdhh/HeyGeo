import { NextRequest, NextResponse } from 'next/server';

/**
 * Permanent redirect: /avatars/<filename> → /api/avatars/<filename>
 *
 * Avatar serving moved to /api/avatars/ so Cloudflare CDN does not
 * edge-cache the responses as static assets (which caused stale 404s).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const dest = new URL(`/api/avatars/${encodeURIComponent(filename)}`, request.url);
  return NextResponse.redirect(dest, {
    status: 308,
    headers: { 'Cache-Control': 'no-store' },
  });
}
