import { NextResponse } from 'next/server';

// POST /api/auth/logout
export async function POST() {
  const response = NextResponse.json({ message: 'Đã đăng xuất' });
  response.cookies.delete('auth-token');
  return response;
}
