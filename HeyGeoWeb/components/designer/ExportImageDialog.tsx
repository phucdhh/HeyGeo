'use client';

import { useState } from 'react';
import {
  HIGH_QUALITY_SCALE,
  IMAGE_FORMATS,
  type ImageFormat,
} from './imageExport';

interface Props {
  /** What the first file type offered is, as the desktop preselects PNG. */
  initial?: ImageFormat;
  onConfirm: (format: ImageFormat, highQuality: boolean) => void;
  onCancel: () => void;
}

/**
 * File | Export To Image… — the desktop's format list beside its High Quality
 * Image tick. Nothing is written until the dialog is accepted.
 */
export default function ExportImageDialog({ initial = 'png', onConfirm, onCancel }: Props) {
  const [format, setFormat] = useState<ImageFormat>(initial);
  const [highQuality, setHighQuality] = useState(true);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[22rem]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Xuất hình ảnh</h2>

        <p className="text-sm text-gray-700 mb-1">Chọn định dạng tệp:</p>
        <div className="flex gap-2 mb-4">
          {IMAGE_FORMATS.map((f) => (
            <button
              key={f.format}
              onClick={() => setFormat(f.format)}
              className={[
                'flex-1 text-sm rounded-lg py-1.5 border transition-colors',
                format === f.format
                  ? 'border-brand-600 text-brand-700 bg-brand-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={highQuality}
            onChange={(e) => setHighQuality(e.target.checked)}
            className="accent-brand-600"
          />
          Ảnh chất lượng cao
        </label>
        <p className="mt-2 text-xs text-gray-500">
          Ảnh chất lượng cao gấp đôi số điểm ảnh theo mỗi chiều, nét hơn khi
          phóng to hoặc in ra.
        </p>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            autoFocus
            onClick={() => onConfirm(format, highQuality)}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-1.5 hover:bg-brand-700 transition-colors"
          >
            Xuất
          </button>
        </div>
      </div>
    </div>
  );
}
