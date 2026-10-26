import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';
  const now = new Date();

  // Các trang tĩnh công khai
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl,                    lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${baseUrl}/gallery`,       lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${baseUrl}/release`,       lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${baseUrl}/design`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${baseUrl}/coding`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Các mô hình công khai – Google index qua trang share
  const models = await prisma.model.findMany({
    where: { isPublic: true, shareToken: { not: null } },
    select: { shareToken: true, updatedAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const modelRoutes: MetadataRoute.Sitemap = models.map((m) => ({
    url: `${baseUrl}/share/${m.shareToken}`,
    lastModified: m.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...modelRoutes];
}
