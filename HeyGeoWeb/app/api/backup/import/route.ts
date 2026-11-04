import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { enrichGgbJsonData, mergeToolCategory } from '@/lib/ggb-detect';
import { MAX_MODELS_PER_BACKUP, sanitizeBackupModel, type BackupModel } from '@/lib/backup';

// POST /api/backup/import — restore models unpacked by the browser.
// Every entry becomes a new model: ids and share tokens in the file are ignored,
// so restoring never touches what is already on the server.
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  if (!rateLimit(`backup-import:${auth.userId}`, 3, 60_000)) {
    return NextResponse.json(
      { error: 'Quá nhiều lần phục hồi. Vui lòng thử lại sau ít phút.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const models = (body as { models?: unknown })?.models;
  if (!Array.isArray(models)) {
    return NextResponse.json({ error: 'File backup không có danh sách mô hình' }, { status: 400 });
  }
  if (models.length === 0) {
    return NextResponse.json({ error: 'File backup không chứa mô hình nào' }, { status: 400 });
  }
  if (models.length > MAX_MODELS_PER_BACKUP) {
    return NextResponse.json(
      { error: `Một lần phục hồi tối đa ${MAX_MODELS_PER_BACKUP} mô hình` },
      { status: 400 },
    );
  }

  const accepted: BackupModel[] = [];
  const skipped: { index: number; title: string | null; reason: string }[] = [];

  models.forEach((raw, index) => {
    const result = sanitizeBackupModel(raw);
    if (result.ok) {
      accepted.push(result.value);
    } else {
      const title =
        typeof raw === 'object' && raw !== null && typeof (raw as { title?: unknown }).title === 'string'
          ? (raw as { title: string }).title.slice(0, 80)
          : null;
      skipped.push({ index, title, reason: result.reason });
    }
  });

  const created: { id: string; title: string }[] = [];
  for (const model of accepted) {
    const jsonData = enrichGgbJsonData(model.jsonData) as object;
    const record = await prisma.model.create({
      data: {
        title: model.title,
        description: model.description,
        guide: model.guide,
        jsonData,
        thumbnailSvg: model.thumbnailSvg,
        categories: mergeToolCategory(model.categories, jsonData),
        isPublic: model.isPublic,
        publishedAt: model.isPublic ? (model.publishedAt ? new Date(model.publishedAt) : new Date()) : null,
        viewCount: model.viewCount,
        createdAt: model.createdAt ? new Date(model.createdAt) : undefined,
        userId: auth.userId,
      },
      select: { id: true, title: true },
    });
    created.push(record);
  }

  return NextResponse.json({ created: created.length, skipped }, { status: 201 });
}
