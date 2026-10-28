'use client';

import { useState } from 'react';
import type { Preferences, SelectionStyle } from './preferences';

interface Props {
  initial: Preferences;
  onSave: (prefs: Preferences) => void;
  onCancel: () => void;
}

/** One colour the dialog offers, as a swatch that opens the browser's picker. */
function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-gray-700">{label}</span>
      <label
        className="relative h-8 w-16 cursor-pointer rounded-md border border-gray-300 shadow-inner"
        style={{ backgroundColor: value }}
        title={value}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}

export default function PreferencesDialog({ initial, onSave, onCancel }: Props) {
  const [backgroundColor, setBackgroundColor] = useState(initial.backgroundColor);
  const [foregroundColor, setForegroundColor] = useState(initial.foregroundColor);
  const [selection, setSelection] = useState<SelectionStyle>(initial.selection);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[24rem] text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4 text-brand-900">Tuỳ chọn</h2>

        <div className="space-y-4">
          <ColorRow
            label="Màu nền"
            value={backgroundColor}
            onChange={setBackgroundColor}
          />
          <ColorRow
            label="Màu mực mặc định"
            value={foregroundColor}
            onChange={setForegroundColor}
          />

          <div>
            <div className="text-sm text-gray-700 mb-2">Cách đánh dấu đối tượng được chọn</div>
            <div className="flex rounded-lg bg-gray-100 p-1 text-xs">
              <button
                type="button"
                onClick={() => setSelection('border')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  selection === 'border' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Khung viền
              </button>
              <button
                type="button"
                onClick={() => setSelection('blinking')}
                className={`flex-1 py-1.5 rounded-md font-medium transition-colors ${
                  selection === 'blinking' ? 'bg-white shadow text-brand-800' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Nhấp nháy
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => onSave({ backgroundColor, foregroundColor, selection })}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-2 hover:bg-brand-700 transition-colors"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
