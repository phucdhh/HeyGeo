import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Metadata } from 'next';
import UserRoleForm from './UserRoleForm';
import UserDeleteButton from './UserDeleteButton';
import AdminNotifyForm from './AdminNotifyForm';
import AdminEditProfileForm from './AdminEditProfileForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true, email: true } });
  return { title: `${user?.name ?? user?.email ?? 'Người dùng'} – HeyGeo Admin` };
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id:        true,
      email:     true,
      name:      true,
      avatar:    true,
      bio:       true,
      phone:     true,
      role:      true,
      createdAt: true,
      updatedAt: true,
      models: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, isPublic: true, viewCount: true, createdAt: true, jsonData: true, shareToken: true },
      },
      apiTokens: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, lastUsed: true, createdAt: true },
      },
      notifications: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, type: true, message: true, modelId: true, isRead: true, createdAt: true },
      },
    },
  });

  if (!user) notFound();

  function getEditorUrl(m: { id: string; jsonData: unknown }): string {
    const rec = m.jsonData as Record<string, unknown> | null;
    const type = rec?.__type as string | undefined;
    const codeMode = rec?.codeMode as boolean | undefined;
    if (codeMode) return `/coding?id=${m.id}`;
    if (type === 'cindy') return `/cindy?id=${m.id}`;
    if (type === 'wsp' || type === 'sketchpad') return `/wsp?id=${m.id}`;
    if (type === 'geogebra') return `/geogebra?id=${m.id}`;
    return `/design?id=${m.id}`;
  }

  function getEditorLabel(m: { id: string; jsonData: unknown }): string {
    const rec = m.jsonData as Record<string, unknown> | null;
    const type = rec?.__type as string | undefined;
    const codeMode = rec?.codeMode as boolean | undefined;
    if (codeMode) return 'Coding';
    if (type === 'cindy') return 'CindyJS';
    if (type === 'wsp' || type === 'sketchpad') return 'WSP';
    if (type === 'geogebra') return 'GeoGebra';
    return 'Design';
  }

  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  const isLastAdmin = user.role === 'ADMIN' && adminCount <= 1;

  const avatarUrl = user.avatar?.replace(/^\/avatars\//, '/api/avatars/') ?? null;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-700">
          ← Danh sách người dùng
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={user.name ?? user.email} className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-700">
                {(user.name ?? user.email).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{user.name ?? '(Chưa đặt tên)'}</h1>
              <p className="text-gray-500">{user.email}</p>
              {user.role === 'ADMIN' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  ★ Admin
                </span>
              )}
            </div>
          </div>
          {!isLastAdmin && (
            <UserDeleteButton userId={user.id} userName={user.name ?? user.email} />
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <InfoRow label="ID" value={user.id} mono />
          <InfoRow label="Phone" value={user.phone ?? '—'} />
          <InfoRow label="Bio" value={user.bio ?? '—'} />
          <InfoRow label="Đăng ký" value={new Date(user.createdAt).toLocaleString('vi-VN')} />
          <InfoRow label="Cập nhật" value={new Date(user.updatedAt).toLocaleString('vi-VN')} />
        </div>
      </div>

      {/* Role management */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Vai trò</h2>
        {isLastAdmin ? (
          <p className="text-sm text-gray-500 italic">Đây là admin duy nhất, không thể thay đổi vai trò.</p>
        ) : (
          <UserRoleForm userId={user.id} currentRole={user.role} />
        )}
      </div>

      {/* Edit profile & reset password */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Chỉnh sửa hồ sơ &amp; Đặt lại mật khẩu</h2>
        <AdminEditProfileForm
          userId={user.id}
          initialName={user.name}
          initialEmail={user.email}
          initialBio={user.bio}
          initialPhone={user.phone}
        />
      </div>

      {/* Models */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Mô hình ({user.models.length})
        </h2>
        {user.models.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có mô hình nào.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {user.models.map((m) => (
              <div key={m.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-800">{m.title}</span>
                  <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${m.isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {m.isPublic ? 'Công khai' : 'Riêng tư'}
                  </span>
                </div>
                <div className="text-gray-400 flex items-center gap-3">
                  <span>{m.viewCount} lượt xem</span>
                  <span>{new Date(m.createdAt).toLocaleDateString('vi-VN')}</span>
                  <Link
                    href={`/models/${m.id}`}
                    target="_blank"
                    className="text-gray-500 hover:text-gray-700 font-medium"
                    title="Xem mô hình"
                  >
                    Xem
                  </Link>
                  <a
                    href={getEditorUrl(m)}
                    target="_blank"
                    className="text-brand-600 hover:text-brand-800 font-medium"
                    title={`Mở trong ${getEditorLabel(m)} editor`}
                  >
                    Sửa ({getEditorLabel(m)})
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Tokens */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          API Tokens ({user.apiTokens.length})
        </h2>
        {user.apiTokens.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có API token nào.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {user.apiTokens.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800">{t.name}</span>
                <span className="text-gray-400">
                  {t.lastUsed
                    ? `Dùng lần cuối: ${new Date(t.lastUsed).toLocaleDateString('vi-VN')}`
                    : 'Chưa dùng'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Send Notification */}
      <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">📨 Gửi thông báo tới người dùng</h2>
        <AdminNotifyForm
          userId={user.id}
          models={user.models.map((m) => ({ id: m.id, title: m.title }))}
        />
      </div>

      {/* Notifications history */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          Lịch sử thông báo ({user.notifications.length})
        </h2>
        {user.notifications.length === 0 ? (
          <p className="text-sm text-gray-400">Chưa có thông báo nào.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {user.notifications.map((n) => (
              <div key={n.id} className="py-2.5 flex items-start justify-between text-sm gap-3">
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0">
                    {n.type === 'INACTIVITY_WARNING' ? '⏰' : '📢'}
                  </span>
                  <span className={n.isRead ? 'text-gray-400' : 'text-gray-800 font-medium'}>
                    {n.message}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-gray-400">
                  {n.isRead
                    ? <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">Đã đọc</span>
                    : <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Chưa đọc</span>}
                  <span>{new Date(n.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className={`mt-0.5 text-gray-800 ${mono ? 'font-mono text-xs' : ''}`}>{value}</dd>
    </div>
  );
}
