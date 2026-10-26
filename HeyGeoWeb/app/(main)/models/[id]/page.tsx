import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import ModelDetailClient from './ModelDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const model = await prisma.model.findUnique({ where: { id }, select: { title: true } });
  return { title: model?.title ?? 'Mô hình' };
}

export default async function ModelDetailPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const model = await prisma.model.findFirst({
    where: payload.role === 'ADMIN' ? { id } : { id, userId: payload.userId },
  });

  if (!model) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';
  const shareUrl = model.isPublic && model.shareToken
    ? `${baseUrl}/share/${model.shareToken}`
    : null;

  return (
    <ModelDetailClient
      model={{
        id: model.id,
        title: model.title,
        description: model.description ?? '',
        guide: model.guide ?? '',
        jsonData: model.jsonData as object,
        isPublic: model.isPublic,
        shareToken: model.shareToken ?? undefined,
        viewCount: model.viewCount,
        updatedAt: model.updatedAt,
        categories: model.categories ?? [],
        thumbnailSvg: model.thumbnailSvg,
      }}
      shareUrl={shareUrl}
    />
  );
}
