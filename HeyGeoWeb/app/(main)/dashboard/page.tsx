import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyToken } from '@/lib/jwt';
import { prisma } from '@/lib/prisma';
import DashboardShell, { type NotifItem, type SerializedModel } from './DashboardShell';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  if (!token) redirect('/login');

  const payload = await verifyToken(token);
  if (!payload) redirect('/login');

  const [user, allDbNotifications, recentComments] = await Promise.all([
    prisma.user.findUnique({
      where: { id: payload.userId },
      include: { models: { orderBy: { updatedAt: 'desc' } } },
    }),
    // Fetch up to 20 most recent notifications (both read and unread) for full history
    prisma.notification.findMany({
      where: { userId: payload.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.comment.findMany({
      where: {
        model:     { userId: payload.userId },
        userId:    { not: payload.userId },
        isDeleted: false,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        parentId:  null,
      },
      include: {
        model: { select: { id: true, title: true, shareToken: true } },
        user:  { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  if (!user) redirect('/login');

  // Mark unread DB notifications as read (fire-and-forget)
  const unreadIds = allDbNotifications.filter((n) => !n.isRead).map((n) => n.id);
  if (unreadIds.length > 0) {
    void prisma.notification.updateMany({ where: { id: { in: unreadIds } }, data: { isRead: true } });
  }

  // --- Build notification list (structured for client-side translation) ---
  const notifications: NotifItem[] = [];

  // 1. Admin / DB notifications (isNew = was unread when fetched)
  for (const n of allDbNotifications) {
    notifications.push({
      type:      'db',
      key:       n.id,
      icon:      n.type === 'INACTIVITY_WARNING' ? '⏰' : '📢',
      message:   n.message,
      createdAt: n.createdAt.toISOString(),
      href:      n.modelId ? `/models/${n.modelId}` : undefined,
      isNew:     !n.isRead,
    });
  }

  // 2. Recent comments from others on user's models (always treated as new)
  for (const c of recentComments) {
    notifications.push({
      type:       'comment',
      key:        c.id,
      icon:       '💬',
      who:        c.user?.name ?? c.user?.email ?? 'Someone',
      modelTitle: c.model.title,
      createdAt:  c.createdAt.toISOString(),
      href:       c.model.shareToken ? `/share/${c.model.shareToken}` : `/models/${c.model.id}`,
      isNew:      true,
    });
  }

  // 3. Dynamic inactivity warning (always new)
  const hasInactivityNotif = allDbNotifications.some((n) => n.type === 'INACTIVITY_WARNING');
  if (!hasInactivityNotif && user.models.length > 0) {
    const daysSince = Math.floor((Date.now() - user.models[0].updatedAt.getTime()) / 86400000);
    if (daysSince >= 30) {
      notifications.push({
        type:      'inactivity',
        key:       'inactivity',
        icon:      '⏰',
        daysSince,
        isNew:     true,
      });
    }
  }

  // Sort by createdAt descending; inactivity (no timestamp) goes to the end
  notifications.sort((a, b) => {
    const aTime = a.type !== 'inactivity' ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.type !== 'inactivity' ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  // Serialize models (dates → ISO strings)
  const serializedModels: SerializedModel[] = user.models.map((m) => ({
    id:           m.id,
    title:        m.title,
    description:  m.description,
    isPublic:     m.isPublic,
    viewCount:    m.viewCount,
    shareToken:   m.shareToken,
    updatedAt:    m.updatedAt.toISOString(),
    jsonData:     m.jsonData as object,
    thumbnailSvg: m.thumbnailSvg,
    codeMode:     (m.jsonData as { codeMode?: boolean } | null)?.codeMode === true,
  }));

  return (
    <DashboardShell
      userName={user.name}
      userEmail={user.email}
      models={serializedModels}
      notifications={notifications}
    />
  );
}

