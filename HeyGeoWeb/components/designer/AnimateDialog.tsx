'use client';

import { useState } from 'react';
import {
  ANIMATION_DIRECTIONS,
  ANIMATION_SPEED,
  DIRECTION_LABELS,
  animationProblem,
  animationSpeed,
  type AnimationDirection,
  type AnimationSpec,
} from './animationModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** 'run' starts the picked objects now; 'button' writes what a press will run. */
  purpose?: 'run' | 'button';
  onConfirm: (spec: AnimationSpec) => void;
  onCancel: () => void;
}

/**
 * Display | Animate Objects… — the desktop's Animate dialog.
 *
 * Which way the picked objects travel and how fast. A lap is a pass along the
 * path (or the range) per second; the canvas owns the clock and stops the run
 * when Display | Stop Animation is chosen, leaving the objects where they stand.
 *
 * Edit | Action Buttons | Animation… asks the same two questions and stores the
 * answers on a button, so the two uses share this dialog and differ only in what
 * the card promises.
 */
export default function AnimateDialog({ purpose = 'run', onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [direction, setDirection] = useState<AnimationDirection>('forward');
  const [speed, setSpeed] = useState(ANIMATION_SPEED.fallback);

  const spec: AnimationSpec = { direction, speed: animationSpeed(speed) };
  const problem = animationProblem(spec);
  const ready = problem === null;
  const asButton = purpose === 'button';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[26rem] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1">
          {asButton ? 'Nút chuyển động' : 'Làm chuyển động đối tượng'}
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          {asButton
            ? 'Nhấn nút sẽ đưa các đối tượng đã chọn đi theo hướng này.'
            : 'Điểm trượt đi dọc đường của nó, tham số quét hết miền giá trị.'}
        </p>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          Hướng:
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as AnimationDirection)}
            className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {ANIMATION_DIRECTIONS.map((d) => (
              <option key={d} value={d}>{DIRECTION_LABELS[d]}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-gray-700 mt-3">
          Tốc độ:
          <input
            type="number"
            min={ANIMATION_SPEED.min}
            max={ANIMATION_SPEED.max}
            step={ANIMATION_SPEED.step}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm(spec); }}
            className="w-24 border border-gray-300 rounded-lg px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <span className="text-xs text-gray-500">vòng/giây</span>
        </label>

        <p className="mt-2 h-5 text-xs text-gray-500">{problem ?? ''}</p>

        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!ready}
            onClick={() => onConfirm(spec)}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              !ready
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            {asButton ? 'Tạo nút' : 'Bắt đầu'}
          </button>
        </div>
      </div>
    </div>
  );
}
