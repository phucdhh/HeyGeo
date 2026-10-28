'use client';

import { useState } from 'react';
import { normalizeHex } from './colorModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** The colour the first picked object draws with now. */
  initial: string;
  onConfirm: (color: string) => void;
  onCancel: () => void;
}

/**
 * Display | Color | Other Color… — the desktop's colour chooser.
 *
 * Sketchpad keeps eight ready-made pens in the submenu and sends everyone else
 * here; the browser's own picker stands in for QColorDialog, and the same value
 * can be typed as hex. The colour is written through the same path as a swatch,
 * so it reaches the document and survives a reload.
 */
export default function ColorDialog({ initial, onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [color, setColor] = useState(normalizeHex(initial) ?? '#000000');
  const [text, setText] = useState(normalizeHex(initial) ?? '#000000');

  function typeHex(value: string) {
    setText(value);
    const hex = normalizeHex(value);
    if (hex) setColor(hex);
  }

  function pick(value: string) {
    const hex = normalizeHex(value) ?? '#000000';
    setColor(hex);
    setText(hex);
  }

  const typed = normalizeHex(text);
  const ready = typed !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[22rem]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Màu khác</h2>

        <div className="flex items-center gap-3">
          <input
            type="color"
            autoFocus
            value={color}
            onChange={(e) => pick(e.target.value)}
            className="w-12 h-12 rounded-lg border border-gray-300 p-1 bg-white cursor-pointer"
            aria-label="Chọn màu"
          />
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">Mã màu</label>
            <input
              type="text"
              value={text}
              onChange={(e) => typeHex(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm(typed); }}
              spellCheck={false}
              className="w-full font-mono text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
          <div className="h-10" style={{ backgroundColor: ready ? typed : color }} />
          <p className="px-3 py-1.5 text-xs text-gray-500 border-t border-gray-200">
            Màu áp dụng cho mọi đối tượng đang chọn.
          </p>
        </div>

        <p className="mt-2 h-4 text-xs text-gray-500">
          {ready ? '' : 'Mã màu cần dạng #RRGGBB, ví dụ #1e3c96.'}
        </p>

        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!ready}
            onClick={() => { if (typed) onConfirm(typed); }}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              !ready
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Áp dụng
          </button>
        </div>
      </div>
    </div>
  );
}
