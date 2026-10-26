'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Props {
  userId: string;
  userName: string;
}

export default function UserDeleteButton({ userId, userName }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError]           = useState('');
  const [isPending, start]          = useTransition();
  const router                      = useRouter();

  async function handleDelete() {
    setError('');
    start(async () => {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi không xác định'); setConfirming(false); return; }
      router.push('/admin/users');
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
      >
        Xóa tài khoản
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <p className="text-sm text-red-600 font-medium">
        Xóa &quot;{userName}&quot;? Không thể hoàn tác.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="px-3 py-1.5 text-sm border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Đang xóa...' : 'Xác nhận xóa'}
        </button>
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
    </div>
  );
}
