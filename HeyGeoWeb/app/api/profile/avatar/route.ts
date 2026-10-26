import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// POST /api/profile/avatar
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Không thể đọc dữ liệu upload' }, { status: 400 });
  }

  const file = formData.get('avatar');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Không có file ảnh' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF' }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Ảnh không được lớn hơn 2 MB' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Sanitize extension
  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  const ext = extMap[file.type] ?? 'jpg';
  // Filename is purely userId-based — no user-controlled input used in path
  const filename = `${auth.userId}.${ext}`;

  // UPLOAD_DIR is set in production (start-app.sh) to a persistent directory
  // outside .next/standalone which is wiped on every rebuild.
  const avatarDir = process.env.UPLOAD_DIR
    ? path.join(process.env.UPLOAD_DIR, 'avatars')
    : path.join(process.cwd(), 'public', 'avatars');
  await mkdir(avatarDir, { recursive: true });
  await writeFile(path.join(avatarDir, filename), buffer);

  const avatarPath = `/api/avatars/${filename}`;
  await prisma.user.update({ where: { id: auth.userId }, data: { avatar: avatarPath } });

  return NextResponse.json({ avatar: avatarPath });
}
