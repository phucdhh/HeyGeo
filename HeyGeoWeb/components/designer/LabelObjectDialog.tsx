'use client';

import { useRef, useState, useEffect } from 'react';

interface Props {
  /** The label the chosen object carries now. */
  initial: string;
  onConfirm: (label: string) => void;
  onCancel: () => void;
}

/**
 * Display | Label Object… — the desktop's one-field label dialog.
 *
 * Sketchpad asks for the text of the label itself, not the name the
 * construction uses to refer to the object, and it relabels one point or one
 * curve at a time. The text is written to `attrs.name`, which is what the
 * board draws beside the object when Display | Show Label is on.
 */
export default function LabelObjectDialog({ initial, onConfirm, onCancel }: Props) {
  const [label, setLabel] = useState(initial);
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => { field.current?.focus(); field.current?.select(); }, []);

  const shown = label.trim() === '' ? '—' : label;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[24rem]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1">Nhãn đối tượng</h2>
        <p className="text-xs text-gray-500 mb-3">
          Nhãn là chữ vẽ cạnh đối tượng, bật Display | Show Label để nhìn thấy nó.
        </p>

        <label className="block text-xs font-medium text-gray-500 mb-1">Nội dung nhãn</label>
        <input
          ref={field}
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(label); }}
          placeholder="Ví dụ: A, d, (O)"
          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">Nhãn sẽ vẽ</p>
          <p className="mt-0.5 text-sm font-mono text-gray-800 break-words">{shown}</p>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={() => onConfirm(label)}
            className="flex-1 text-sm text-white bg-brand-600 hover:bg-brand-700 rounded-lg py-1.5 transition-colors"
          >
            Đặt nhãn
          </button>
        </div>
      </div>
    </div>
  );
}
