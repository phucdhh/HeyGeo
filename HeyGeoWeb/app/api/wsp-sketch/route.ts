import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/api-auth';

/**
 * GET /api/wsp-sketch?id=MODEL_ID
 * Returns the raw WSP/Sketchpad sketch JSON for use as a WSP `data-url`.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  const rec = model.jsonData as Record<string, unknown> | null;
  const type = rec?.__type as string | undefined;

  if (type !== 'wsp' && type !== 'sketchpad') {
    return NextResponse.json({ error: 'Không phải mô hình WSP/Sketchpad' }, { status: 400 });
  }

  const sketchData = rec?.data;
  if (!sketchData) {
    return NextResponse.json({ error: 'Không có dữ liệu sketch' }, { status: 400 });
  }

  return NextResponse.json(sketchData);
}

/**
 * PUT /api/wsp-sketch?id=MODEL_ID
 * Body: { data: <WSP spec object> }
 * Saves the updated WSP sketch back to the model, preserving the original __type.
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

  const model = await prisma.model.findFirst({ where: { id } });
  if (!model) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  if (model.userId !== auth.userId && auth.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  }

  const existing = model.jsonData as Record<string, unknown> | null;
  const type = existing?.__type as string | undefined;
  if (type !== 'wsp' && type !== 'sketchpad') {
    return NextResponse.json({ error: 'Không phải mô hình WSP/Sketchpad' }, { status: 400 });
  }

  let body: { data: unknown; thumbnail?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'Body không hợp lệ' }, { status: 400 });
  }

  if (!body.data) return NextResponse.json({ error: 'Thiếu data' }, { status: 400 });

  const newJsonData = { __type: type, data: body.data };
  const updateData: Record<string, unknown> = { jsonData: newJsonData };
  if (body.thumbnail && typeof body.thumbnail === 'string' && body.thumbnail.startsWith('data:')) {
    updateData.thumbnailSvg = body.thumbnail;
  }
  await prisma.model.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true });
}
