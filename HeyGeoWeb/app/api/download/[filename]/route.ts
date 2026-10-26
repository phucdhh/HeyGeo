import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

// Only allow filenames matching this pattern — prevents path traversal
const SAFE_FILENAME = /^HeyGeo_[A-Za-z0-9_.\-]+\.(zip|dmg|exe|msi|pkg)$/;

// Release directory: configurable via env var, falls back relative to cwd
function releaseDir(): string {
  if (process.env.RELEASE_DIR) return process.env.RELEASE_DIR;
  // In standalone build cwd is .next/standalone/; release/ is at project root
  // Walk up until we find the release directory (max 4 levels)
  let dir = process.cwd();
  for (let i = 0; i < 4; i++) {
    const candidate = path.join(dir, 'release');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.join(process.cwd(), 'release');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // ── Security: validate filename ──────────────────────────────────────────
  if (!SAFE_FILENAME.test(filename)) {
    return new NextResponse('Not found', { status: 404 });
  }

  const filePath = path.join(releaseDir(), filename);

  // ── Security: ensure resolved path stays inside release directory ────────
  const resolved = path.resolve(filePath);
  const base = path.resolve(releaseDir());
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return new NextResponse('Not found', { status: 404 });
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new NextResponse('File not found', { status: 404 });
  }

  const stat = fs.statSync(resolved);

  // Stream the file using a Web ReadableStream (compatible with all Node 16+)
  const nodeStream = fs.createReadStream(resolved);
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk));
      nodeStream.on('end', () => controller.close());
      nodeStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      nodeStream.destroy();
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'no-store',
    },
  });
}
