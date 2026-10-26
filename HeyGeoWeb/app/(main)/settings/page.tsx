import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import SettingsShell from './SettingsShell';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, avatar: true, bio: true, phone: true, username: true, createdAt: true },
  });
  if (!user) redirect('/login');

  const tokens = await prisma.apiToken.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <SettingsShell
      user={{
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar?.replace(/^\/avatars\//, '/api/avatars/') ?? null,
        bio: user.bio,
        phone: user.phone,
        username: user.username,
      }}
      tokens={tokens.map((t) => ({
        id: t.id,
        name: t.name,
        lastUsed: t.lastUsed?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      }))}
      memberSince={user.createdAt.toISOString()}
    />
  );
}
