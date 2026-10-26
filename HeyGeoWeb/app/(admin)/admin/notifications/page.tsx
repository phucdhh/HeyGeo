import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Metadata } from 'next';
import AdminNotifDeleteButton from './AdminNotifDeleteButton';

export const metadata: Metadata = { title: 'Quản lý thông báo – HeyGeo Admin' };

const TYPE_LABELS: Record<string, string> = {
  ADMIN_MESSAGE:      'Tin nhắn Admin',
  INACTIVITY_WARNING: 'Cảnh báo không hoạt động',
  REPLY_ON_COMMENT:   'Phản hồi bình luận',
  COMMENT_VERIFIED:   'Bình luận được duyệt',
  COMMENT_REACTION:   'Cảm xúc bình luận',
};

interface PageProps {
  searchParams: Promise<{ page?: string; isRead?: string; type?: string }>;
}

export default async function AdminNotificationsPage({ searchParams }: PageProps) {
  const sp     = await searchParams;
  const page   = Math.max(1, parseInt(sp.page ?? '1', 10));
  const limit  = 25;
  const isRead = sp.isRead ?? '';   // 'true' | 'false' | ''
  const type   = sp.type ?? '';

  const where: Prisma.NotificationWhereInput = {};
  if (isRead === 'true') where.isRead = true;
  if (isRead === 'false') where.isRead = false;
  if (type) where.type = type as Prisma.EnumNotifTypeFilter;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id:        true,
        type:      true,
        message:   true,
        modelId:   true,
        isRead:    true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { isRead: false } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  function buildUrl(newParams: Record<string, string>) {
    const p = new URLSearchParams();
    if (isRead) p.set('isRead', isRead);
    if (type)   p.set('type', type);
    p.set('page', String(page));
    Object.entries(newParams).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k));
    return `/admin/notifications?${p.toString()}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản lý thông báo</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} thông báo · <span className="text-amber-600 font-medium">{unreadCount} chưa đọc</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* isRead filter */}
        <div className="flex items-center gap-1 text-sm">
          <span className="text-gray-500 mr-1">Trạng thái:</span>
          {[['', 'Tất cả'], ['false', 'Chưa đọc'], ['true', 'Đã đọc']].map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl({ isRead: val, page: '1' })}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                isRead === val
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <span className="text-gray-500 mr-1">Loại:</span>
          {[['', 'Tất cả'], ...Object.entries(TYPE_LABELS)].map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl({ type: val, page: '1' })}
              className={`px-3 py-1 rounded-full border text-xs font-medium transition-colors ${
                type === val
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Người nhận</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Loại</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Nội dung</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Trạng thái</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600">Thời gian</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {notifications.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  Không có thông báo nào
                </td>
              </tr>
            )}
            {notifications.map((n) => {
              const avatarUrl = n.user.avatar?.replace(/^\/avatars\//, '/api/avatars/') ?? null;
              const initial   = (n.user.name ?? n.user.email).charAt(0).toUpperCase();
              return (
                <tr key={n.id} className={`hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-amber-50/40' : ''}`}>
                  {/* Recipient */}
                  <td className="px-4 py-3">
                    <Link href={`/admin/users/${n.user.id}`} className="flex items-center gap-2 group">
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt={n.user.name ?? n.user.email} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700 flex-shrink-0">
                          {initial}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-brand-600 leading-tight">
                          {n.user.name ?? '—'}
                        </div>
                        <div className="text-xs text-gray-400">{n.user.email}</div>
                      </div>
                    </Link>
                  </td>

                  {/* Type */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </td>

                  {/* Message */}
                  <td className="px-4 py-3 text-gray-700 max-w-xs">
                    <p className="line-clamp-2" title={n.message}>{n.message}</p>
                    {n.modelId && (
                      <Link href={`/models/${n.modelId}`} className="text-xs text-brand-500 hover:underline mt-0.5 block">
                        Xem mô hình →
                      </Link>
                    )}
                  </td>

                  {/* isRead */}
                  <td className="px-4 py-3">
                    {n.isRead ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        ✓ Đã đọc
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        ● Chưa đọc
                      </span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3 text-right">
                    <AdminNotifDeleteButton notifId={n.id} />
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
            Trang {page}/{totalPages} · {total} thông báo
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
