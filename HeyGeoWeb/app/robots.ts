import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://heygeo.pedu.vn';
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/(auth)/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
