'use client';

import { useState } from 'react';
import type { SliderConfig } from './designTypes';

interface Props {
  onConfirm: (cfg: SliderConfig) => void;
  onCancel: () => void;
}

export default function SliderConfigDialog({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState('a');
  const [min,  setMin]  = useState(0);
  const [max,  setMax]  = useState(10);
  const [init, setInit] = useState(5);
  const [step, setStep] = useState(0.1);

  function handleConfirm() {
    const resolvedName = name.trim() || 'a';
    const resolvedInit = Math.min(max, Math.max(min, init));
    onConfirm({ name: resolvedName, min, max, init: resolvedInit, step: Math.max(0, step) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={e => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-80"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-4">Cấu hình thanh trượt</h2>

        <div className="space-y-3">
          {/* Name */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 w-20 flex-shrink-0">Tên</label>
            <input
              autoFocus
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
            />
          </div>

          {/* Min */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 w-20 flex-shrink-0">Giá trị nhỏ nhất</label>
            <input
              type="number" step="any"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={min}
              onChange={e => setMin(Number(e.target.value))}
            />
          </div>

          {/* Max */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 w-20 flex-shrink-0">Giá trị lớn nhất</label>
            <input
              type="number" step="any"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={max}
              onChange={e => setMax(Number(e.target.value))}
            />
          </div>

          {/* Init */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 w-20 flex-shrink-0">Giá trị ban đầu</label>
            <input
              type="number" step="any"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={init}
              onChange={e => setInit(Number(e.target.value))}
            />
          </div>

          {/* Step */}
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 w-20 flex-shrink-0">Bước nhảy</label>
            <input
              type="number" min="0" step="any"
              className="flex-1 text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={step}
              onChange={e => setStep(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 text-sm text-white bg-brand-600 rounded-lg py-1.5 hover:bg-brand-700 transition-colors"
          >
            Tạo thanh trượt
          </button>
        </div>
      </div>
    </div>
  );
}
