import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
  async headers() {
    // Prevent Cloudflare (and any proxy) from ever caching authenticated or
    // model-viewer pages that contain user-specific or frequently-updated data.
    const noStore = 'private, no-cache, no-store, must-revalidate';
    return [
      // Homepage is dynamic (shows latest DB models) – must not be CDN-cached.
      // Stale HTML + fresh RSC payload causes React hydration error #418.
      { source: '/',                  headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/models/:id*',       headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/share/:token*',      headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/dashboard',          headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/settings',           headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/geogebra/:path*',    headers: [{ key: 'Cache-Control', value: noStore }] },
      { source: '/geogebra',           headers: [{ key: 'Cache-Control', value: noStore }] },
    ];
  },
};

export default nextConfig;
