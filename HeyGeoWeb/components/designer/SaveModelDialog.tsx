'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  initialTitle: string;
  initialDesc?: string;
  initialPublic?: boolean;
  isSaving: boolean;
  onSave: (title: string, desc: string, isPublic: boolean) => void;
  onCancel: () => void;
}

export default function SaveModelDialog({
  initialTitle,
  initialDesc = '',
  initialPublic = false,
  isSaving,
  onSave,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [desc,  setDesc]  = useState(initialDesc);
  const [pub,   setPub]   = useState(initialPublic);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), desc.trim(), pub);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Lưu mô hình</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ví dụ: Định lý Pythagoras"
              maxLength={120}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mô tả <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
            </label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Mô tả ngắn về mô hình..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Public toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="pub-toggle"
              checked={pub}
              onChange={e => setPub(e.target.checked)}
              className="h-4 w-4 text-brand-600 rounded"
            />
            <label htmlFor="pub-toggle" className="text-sm text-gray-700">
              Công khai (có thể chia sẻ qua link)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-5 py-2 text-sm rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
