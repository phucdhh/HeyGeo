'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminNotifDeleteButton({ notifId }: { notifId: string }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);
    await fetch(`/api/admin/notifications?id=${notifId}`, { method: 'DELETE' });
    router.refresh();
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => setConfirm(false)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Hủy
        </button>
        <button
          onClick={handleDelete}
          disabled={pending}
          className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
        >
          {pending ? 'Đang xóa...' : 'Xác nhận'}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirm(true)}
      className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      title="Xóa thông báo"
    >
      Xóa
    </button>
  );
}
