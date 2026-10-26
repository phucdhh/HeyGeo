import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import UserSearchForm from './UserSearchForm';

export const metadata: Metadata = { title: 'Quản lý người dùng – HeyGeo Admin' };

interface PageProps {
  searchParams: Promise<{ page?: string; search?: string; role?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const page   = Math.max(1, parseInt(sp.page ?? '1', 10));
  const limit  = 20;
  const search = sp.search?.trim() ?? '';
  const role   = sp.role ?? '';

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name:  { contains: search, mode: 'insensitive' } },
    ];
  }
  if (role === 'ADMIN' || role === 'USER') {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id:        true,
        email:     true,
        name:      true,
        avatar:    true,
        role:      true,
        createdAt: true,
        _count: { select: { models: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(newParams: Record<string, string>) {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (role)   p.set('role', role);
    p.set('page', String(page));
    Object.entries(newParams).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/users?${p.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý người dùng</h1>
          <p className="text-sm text-gray-500 mt-1">Tổng cộng {total} người dùng</p>
        </div>
      </div>

      <UserSearchForm defaultSearch={search} defaultRole={role} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 w-10"></th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Người dùng</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Vai trò</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Mô hình</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Ngày đăng ký</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            )}
            {users.map((u) => {
              const avatarUrl = u.avatar?.replace(/^\/avatars\//, '/api/avatars/') ?? null;
              const initial = (u.name ?? u.email).charAt(0).toUpperCase();
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    {avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarUrl} alt={u.name ?? u.email} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
                        {initial}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name ?? '—'}</div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u._count.models}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-brand-600 hover:text-brand-700 font-medium"
                    >
                      Chi tiết →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Trang {page}/{totalPages} · {total} người dùng
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Trước
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Tiếp →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
        ★ Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      User
    </span>
  );
}
