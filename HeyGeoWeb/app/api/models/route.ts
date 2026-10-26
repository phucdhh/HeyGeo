import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';
import { enrichGgbJsonData, mergeToolCategory } from '@/lib/ggb-detect';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/models – list current user's models
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const models = await prisma.model.findMany({
    where: { userId: auth.userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      description: true,
      isPublic: true,
      shareToken: true,
      viewCount: true,
      thumbnailSvg: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ models });
}

// POST /api/models – create new model
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  // Rate limit: max 30 saves per user per minute to prevent abuse / server overload.
  if (!rateLimit(`create:${auth.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }, { status: 429 });
  }

  let body: { title?: string; description?: string; guide?: string; jsonData?: unknown; isPublic?: boolean; thumbnailSvg?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const { title, description, guide, jsonData, isPublic, thumbnailSvg } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: 'Tiêu đề là bắt buộc' }, { status: 400 });
  }
  if (!jsonData || typeof jsonData !== 'object') {
    return NextResponse.json({ error: 'Dữ liệu JSON là bắt buộc' }, { status: 400 });
  }

  const enriched = enrichGgbJsonData(jsonData) as object;
  const model = await prisma.model.create({
    data: {
      title: title.trim(),
      description: description?.trim() ?? null,
      guide: guide?.trim() ?? null,
      jsonData: enriched,
      thumbnailSvg: thumbnailSvg?.trim() ?? null,
      isPublic: isPublic === true,
      publishedAt: isPublic === true ? new Date() : null,
      userId: auth.userId,
      categories: mergeToolCategory([], enriched),
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';
  const shareUrl = model.isPublic && model.shareToken
    ? `${baseUrl}/share/${model.shareToken}`
    : null;

  revalidatePath('/');
  return NextResponse.json({ model, shareUrl }, { status: 201 });
}
