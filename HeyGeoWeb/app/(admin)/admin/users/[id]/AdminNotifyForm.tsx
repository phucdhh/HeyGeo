'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

interface Model {
  id: string;
  title: string;
}

interface Props {
  userId: string;
  models: Model[];
}

export default function AdminNotifyForm({ userId, models }: Props) {
  const [type, setType]       = useState('ADMIN_MESSAGE');
  const [message, setMessage] = useState('');
  const [modelId, setModelId] = useState('');
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [isPending, start]    = useTransition();
  const router                = useRouter();

  async function send() {
    if (!message.trim()) { setError('Vui lòng nhập nội dung thông báo.'); return; }
    setError(''); setSuccess('');
    start(async () => {
      const res = await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, type, message: message.trim(), modelId: modelId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Lỗi không xác định'); return; }
      setSuccess('Đã gửi thông báo thành công.');
      setMessage('');
      setModelId('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          disabled={isPending}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
        >
          <option value="ADMIN_MESSAGE">📢 Thông báo của Admin</option>
          <option value="INACTIVITY_WARNING">⏰ Cảnh báo không hoạt động</option>
        </select>

        {models.length > 0 && (
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={isPending}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none"
          >
            <option value="">— Không gắn mô hình —</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
        )}
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Nội dung thông báo gửi tới người dùng..."
        rows={3}
        disabled={isPending}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-400 outline-none resize-none"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={send}
          disabled={isPending || !message.trim()}
          className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Đang gửi...' : '📨 Gửi thông báo'}
        </button>
        {error   && <p className="text-red-500 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
      </div>
    </div>
  );
}
