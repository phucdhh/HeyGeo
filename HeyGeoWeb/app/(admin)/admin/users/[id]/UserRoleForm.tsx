'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  currentRole: string;
}

export default function UserRoleForm({ userId, currentRole }: Props) {
  const [role, setRole]       = useState(currentRole);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, start]    = useTransition();
  const router                = useRouter();

  async function save() {
    setError(''); setSuccess('');
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi không xác định'); return; }
      setSuccess('Đã cập nhật vai trò thành công');
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        disabled={isPending}
      >
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>
      <button
        onClick={save}
        disabled={isPending || role === currentRole}
        className="px-4 py-2 bg-brand-700 text-white text-sm font-medium rounded-lg hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending ? 'Đang lưu...' : 'Lưu'}
      </button>
      {error   && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
    </div>
  );
}
