import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

function getUploadDir(): string {
  return process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, 'avatars')
    : path.join(process.cwd(), 'public', 'avatars');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  // Only allow simple safe filenames — no slashes, no NUL, no path traversal
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(filename)) {
    return new NextResponse(null, { status: 400 });
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.has(ext)) {
    return new NextResponse(null, { status: 400 });
  }

  const uploadDir = path.resolve(getUploadDir());
  const filePath = path.resolve(uploadDir, filename);

  // Double-check: resolved path must stay inside uploadDir
  if (!filePath.startsWith(uploadDir + path.sep) && filePath !== uploadDir) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const data = await readFile(filePath);
    return new NextResponse(data, {
      headers: {
        'Content-Type': MIME[ext] ?? 'application/octet-stream',
        // Long cache on success — URL changes when avatar changes (userId-based name
        // stays the same, but the ?t= cache-buster is added client-side after upload).
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
