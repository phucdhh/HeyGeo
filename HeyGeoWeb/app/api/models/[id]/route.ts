import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';
import { enrichGgbJsonData, mergeToolCategory } from '@/lib/ggb-detect';
import { rateLimit } from '@/lib/rate-limit';

interface Ctx { params: Promise<{ id: string }> }

// GET /api/models/:id
export async function GET(request: NextRequest, ctx: Ctx) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { id } = await ctx.params;
  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  return NextResponse.json({ model });
}

// PUT /api/models/:id – update metadata + JSON
export async function PUT(request: NextRequest, ctx: Ctx) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  // Rate limit: max 30 saves per user per minute.
  if (!rateLimit(`update:${auth.userId}`, 30, 60_000)) {
    return NextResponse.json({ error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' }, { status: 429 });
  }

  const { id } = await ctx.params;
  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  const allowed = ['title', 'description', 'guide', 'jsonData', 'isPublic', 'thumbnailSvg', 'categories'] as const;
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }
  // Re-derive is3d on the server if jsonData is present (client-side detection is unreliable)
  if ('jsonData' in data) data.jsonData = enrichGgbJsonData(data.jsonData) as object;

  // Auto-sync tool category from jsonData.__type (always authoritative)
  const finalJson = ('jsonData' in data ? data.jsonData : model.jsonData) as unknown;
  const currentCats = Array.isArray(data.categories)
    ? (data.categories as string[])
    : model.categories;
  data.categories = mergeToolCategory(currentCats, finalJson);

  // If model is being published for the first time or re-published, record the date
  if (data.isPublic === true && !model.isPublic) {
    data.publishedAt = new Date();
  }

  const updated = await prisma.model.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json({ model: updated });
}

// DELETE /api/models/:id
export async function DELETE(request: NextRequest, ctx: Ctx) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { id } = await ctx.params;
  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  await prisma.model.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ message: 'Đã xoá' });
}
