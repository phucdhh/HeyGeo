import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import CindyStudio from '@/components/coder/CindyStudio';
import type { CindyData } from '@/components/designer/designTypes';

export const metadata = { title: 'CindyJS – HeyGeo' };

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function CindyPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const params = await searchParams;

  let modelId: string | undefined;
  let initialTitle: string | undefined;
  let initialDescription = '';
  let initialIsPublic = false;
  let initialCode: string | undefined;

  if (params.id) {
    const whereClause = payload.role === 'ADMIN'
      ? { id: params.id }
      : { id: params.id, userId: payload.userId };
    const model = await prisma.model.findUnique({
      where: whereClause,
      select: { id: true, title: true, jsonData: true, description: true, isPublic: true },
    });
    if (model) {
      const data = model.jsonData as unknown as CindyData;
      modelId = model.id;
      initialTitle = model.title;
      initialDescription = model.description ?? '';
      initialIsPublic = model.isPublic;
      initialCode = data?.code;
    }
  }

  return (
    <CindyStudio
      modelId={modelId}
      initialTitle={initialTitle}
      initialDescription={initialDescription}
      initialIsPublic={initialIsPublic}
      initialCode={initialCode}
    />
  );
}
