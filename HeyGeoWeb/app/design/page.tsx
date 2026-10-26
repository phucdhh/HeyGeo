import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import DesignStudio from '@/components/designer/DesignStudio';
import type { HeyGeoData } from '@/components/designer/designTypes';

export const metadata = { title: 'Design – HeyGeo' };

interface Props {
  searchParams: Promise<{ id?: string }>;
}

export default async function DesignPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const params = await searchParams;

  // Optionally load an existing model for editing
  let initialData: HeyGeoData | null = null;
  let modelId: string | undefined;
  let initialDescription = '';
  let initialIsPublic = false;

  if (params.id) {
    // Admin can open any user's model
    const whereClause = payload.role === 'ADMIN'
      ? { id: params.id }
      : { id: params.id, userId: payload.userId };
    const model = await prisma.model.findUnique({
      where: whereClause,
      select: { id: true, jsonData: true, description: true, isPublic: true },
    });
    if (model) {
      initialData = model.jsonData as unknown as HeyGeoData;
      modelId = model.id;
      initialDescription = model.description ?? '';
      initialIsPublic = model.isPublic;
    }
  }

  return <DesignStudio initialData={initialData} modelId={modelId} initialDescription={initialDescription} initialIsPublic={initialIsPublic} />;
}
