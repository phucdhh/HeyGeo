'use client';

import { useState } from 'react';
import { SAMPLES, samplesProblem } from './samplesModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** How many times the picked locus is sampled now. */
  initial: number;
  onConfirm: (samples: number) => void;
  onCancel: () => void;
}

/**
 * Display | Number of Samples… — the desktop's Change Number of Samples dialog.
 *
 * A locus is drawn by stepping its glider through the path and recording where
 * the traced point lands; this is how many steps to take. The desktop lets the
 * count run from 15 to 40000 and redraws as the spinner moves, so the result is
 * only committed when the dialog is accepted.
 */
export default function SamplesDialog({ initial, onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [samples, setSamples] = useState(initial);
  const problem = samplesProblem(samples);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[22rem]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Số mẫu của quỹ tích</h2>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          Số mẫu:
          <input
            type="number"
            autoFocus
            min={SAMPLES.min}
            max={SAMPLES.max}
            step={SAMPLES.step}
            value={samples}
            onChange={(e) => setSamples(Number(e.target.value))}
            onKeyDown={(e) => { if (e.key === 'Enter' && !problem) onConfirm(samples); }}
            className="w-28 border border-gray-300 rounded-lg px-3 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </label>

        <p className="mt-2 text-xs text-gray-500">
          Càng nhiều mẫu, quỹ tích càng mượt và càng chậm vẽ lại. Từ {SAMPLES.min} đến{' '}
          {SAMPLES.max} mẫu.
        </p>

        <p className="mt-2 h-4 text-xs text-gray-500">{problem ?? ''}</p>

        <div className="flex gap-3 mt-2">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={problem !== null}
            onClick={() => onConfirm(samples)}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              problem !== null
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
}
