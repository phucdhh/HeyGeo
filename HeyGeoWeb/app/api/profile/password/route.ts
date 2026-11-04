import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { comparePassword, hashPassword } from '@/lib/auth';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/profile/password — change own password, current password required
export async function POST(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ error: 'Chưa xác thực' }, { status: 401 });

  // Verifying the old password is a credential guess: keep it slow per account.
  if (!rateLimit(`password:${auth.userId}`, 5, 60_000)) {
    return NextResponse.json(
      { error: 'Quá nhiều lần thử. Vui lòng thử lại sau ít phút.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
  }

  const { currentPassword, newPassword } = body as Record<string, unknown>;
  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    return NextResponse.json({ error: 'Mật khẩu là bắt buộc' }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: 'Mật khẩu mới phải có ít nhất 8 ký tự' }, { status: 400 });
  }
  // bcrypt only reads the first 72 bytes; anything longer would silently work
  // while the user believes the whole string is their password.
  if (newPassword.length > 72) {
    return NextResponse.json({ error: 'Mật khẩu mới tối đa 72 ký tự' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });

  if (!(await comparePassword(currentPassword, user.password))) {
    return NextResponse.json({ error: 'Mật khẩu hiện tại không đúng' }, { status: 403 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'Mật khẩu mới phải khác mật khẩu hiện tại' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });

  return NextResponse.json({ message: 'Đã đổi mật khẩu' });
}
