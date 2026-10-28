'use client';

import { useState } from 'react';
import { FONT_FAMILIES, FONT_SIZES, fontStack } from './fontModel';

interface Props {
  /** The face the picks draw with now. */
  initial: { family: string; size: number };
  onConfirm: (font: { family: string; size: number }) => void;
  onCancel: () => void;
}

/**
 * Display | Font | Font… — the desktop's Font dialog.
 *
 * The submenu carries the five faces and five sizes Sketchpad offers; this
 * chooses among the same list in one place, with the size the picks already
 * have when it is off the list. The preview is drawn with the same CSS stack the
 * board uses, so what is accepted is what the labels become.
 */
export default function FontDialog({ initial, onConfirm, onCancel }: Props) {
  const [family, setFamily] = useState(initial.family);
  const [size, setSize] = useState(initial.size);

  // a size the picks already had but the menu does not offer stays selectable
  const sizes = FONT_SIZES.includes(size as (typeof FONT_SIZES)[number])
    ? [...FONT_SIZES]
    : [...FONT_SIZES, size].sort((a, b) => a - b);

  const chosen = { family, size };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[23rem]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Phông chữ</h2>

        <div className="flex gap-3">
          <label className="flex-1 text-xs font-medium text-gray-500">
            Họ phông
            <select
              autoFocus
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              className="mt-1 w-full text-sm text-gray-800 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>

          <label className="text-xs font-medium text-gray-500">
            Cỡ chữ
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="mt-1 w-24 text-sm text-gray-800 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {sizes.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 rounded-lg border border-gray-200 px-4 py-5 text-center">
          <span
            className="text-gray-800"
            style={{ fontFamily: fontStack(family), fontSize: Math.min(size, 30) }}
          >
            Hình học động HeyGeo
          </span>
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Phông áp dụng cho nhãn của điểm, đường cong và cho chữ đang chọn.
        </p>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(chosen)}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-1.5 hover:bg-brand-700 transition-colors"
          >
            Đặt phông
          </button>
        </div>
      </div>
    </div>
  );
}
