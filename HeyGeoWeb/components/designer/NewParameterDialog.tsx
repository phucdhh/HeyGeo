'use client';

import { useState } from 'react';
import {
  PARAMETER_DEFAULTS,
  parameterProblem,
  precisionOf,
  type ParameterConfig,
  type ParameterSpec,
} from './parameterModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  onConfirm: (cfg: ParameterConfig) => void;
  onCancel: () => void;
}

/** Number | New Parameter… — the GSP dialog: a name, a value, and its range. */
export default function NewParameterDialog({ onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [name, setName] = useState('n');
  // The typed text is kept so its decimals can decide the displayed precision.
  const [valueText, setValueText] = useState(String(PARAMETER_DEFAULTS.value));
  const [min, setMin] = useState<number>(PARAMETER_DEFAULTS.min);
  const [max, setMax] = useState<number>(PARAMETER_DEFAULTS.max);

  const value = Number(valueText.replace(',', '.'));
  const spec: ParameterSpec = {
    value,
    min,
    max,
    precision: precisionOf(valueText),
  };
  const problem = parameterProblem(name, spec);

  function handleConfirm() {
    if (problem) return;
    onConfirm({ name: name.trim(), ...spec });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-96 text-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold mb-4 text-brand-900">Tham số mới</h2>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="w-28 text-xs text-gray-600">Tên</label>
            <input
              type="text"
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-xs text-gray-600">Giá trị</label>
            <input
              type="text"
              inputMode="decimal"
              value={valueText}
              onChange={(e) => setValueText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-xs text-gray-600">Nhỏ nhất</label>
            <input
              type="number"
              step="any"
              value={min}
              onChange={(e) => setMin(Number(e.target.value))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="w-28 text-xs text-gray-600">Lớn nhất</label>
            <input
              type="number"
              step="any"
              value={max}
              onChange={(e) => setMax(Number(e.target.value))}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Số chữ số thập phân của giá trị quyết định độ chính xác hiển thị:
          gõ 5 → 5, gõ 5.0 → 5.0, gõ 5.00 → 5.00.
        </p>
        {problem && <p className="mt-2 text-xs text-amber-700">⚠ {problem}</p>}

        <div className="flex gap-3 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!!problem}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-2 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Tạo
          </button>
        </div>
      </div>
    </div>
  );
}
