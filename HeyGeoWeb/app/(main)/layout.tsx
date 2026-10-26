import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import Navigation from '@/components/Navigation';

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value ?? null;

  let user: { email: string; name?: string | null; avatar?: string | null; role?: string | null } | null = null;
  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      const dbUser = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { email: true, name: true, avatar: true, role: true },
      });
      if (dbUser) {
        // Normalise legacy avatar URLs stored as /avatars/... → /api/avatars/...
        const avatar = dbUser.avatar?.replace(/^\/avatars\//, '/api/avatars/') ?? null;
        user = { ...dbUser, avatar };
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation user={user ?? undefined} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
