import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { ReactNode } from 'react';

export const metadata = { title: 'Quản trị – HeyGeo' };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value ?? null;

  if (!token) redirect('/login');
  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  // Fetch fresh role from DB (in case JWT is stale)
  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true, name: true, email: true },
  });
  if (!dbUser || dbUser.role !== 'ADMIN') redirect('/dashboard');

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-brand-900 text-white shadow-md">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Hey<span className="text-amber-300">Geo</span>
            </Link>
            <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest border border-amber-400/40 px-2 py-0.5 rounded">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/admin/users" className="text-sm text-amber-200 hover:text-white transition-colors">
              Người dùng
            </Link>
            <Link href="/admin/notifications" className="text-sm text-amber-200 hover:text-white transition-colors">
              Thông báo
            </Link>
            <Link href="/dashboard" className="text-sm text-amber-200 hover:text-white transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-400 text-sm">{dbUser.name ?? dbUser.email}</span>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-7xl w-full px-6 py-8">{children}</main>
    </div>
  );
}
