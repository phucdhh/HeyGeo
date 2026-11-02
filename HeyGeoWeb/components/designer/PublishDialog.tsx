'use client';

/**
 * File | Publish to Web… — puts the sketch in the Gallery, where the models the
 * other tools publish already are, and hands back its public link.
 */

import { useEffect, useRef, useState } from 'react';

export interface PublishResult {
  title: string;
  shareUrl: string | null;
}

interface Props {
  initialTitle: string;
  initialDescription?: string;
  publishing: boolean;
  error?: string;
  result?: PublishResult | null;
  onPublish: (title: string, description: string) => void;
  onClose: () => void;
}

export default function PublishDialog({
  initialTitle,
  initialDescription = '',
  publishing,
  error,
  result = null,
  onPublish,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initialTitle === 'Chưa đặt tên' ? '' : initialTitle);
  const [desc, setDesc] = useState(initialDescription);
  const [copied, setCopied] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!result) titleRef.current?.focus();
  }, [result]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function copyLink() {
    if (!result?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        {result ? (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Đã xuất bản</h2>
            <p className="text-sm text-gray-600 mb-4">
              <strong>{result.title}</strong> đã có trong Thư viện HeyGeo.
            </p>
            {result.shareUrl && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-4">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Liên kết công khai
                </p>
                <a
                  href={result.shareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-brand-700 break-all hover:underline"
                >
                  {result.shareUrl}
                </a>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2">
              {result.shareUrl && (
                <button
                  type="button"
                  onClick={copyLink}
                  className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {copied ? '✓ Đã sao chép' : 'Sao chép liên kết'}
                </button>
              )}
              <a
                href="/gallery"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Mở Thư viện
              </a>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
              >
                Đóng
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Xuất bản lên Thư viện</h2>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Mô hình sẽ được lưu công khai và hiện trong Thư viện HeyGeo cùng các mô hình
              của Sketchpad, Web Sketchpad, HeyGeo Desktop hay JSXGraph. Ai có liên kết đều
              xem được.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (title.trim()) onPublish(title.trim(), desc.trim());
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Quỹ tích đường trung trực"
                  maxLength={120}
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Mô tả ngắn để người xem hiểu bài toán…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={publishing}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={publishing || !title.trim()}
                  className="px-5 py-2 text-sm rounded-lg bg-brand-600 text-white font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {publishing ? 'Đang xuất bản…' : 'Xuất bản'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
