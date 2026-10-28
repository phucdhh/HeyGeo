'use client';

import { useState } from 'react';
import { evalExpression } from './expression';
import {
  PARAM_DOMAIN,
  PLOT_SAMPLES,
  SAMPLE_RANGE,
  parametricPlot,
  plotProblem,
  type PlotSpec,
} from './plotModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  onConfirm: (spec: PlotSpec) => void;
  onCancel: () => void;
}

/** What one formula is worth at one t, or null when it has no number there. */
function at(expr: string, t: number): number | null {
  return evalExpression(expr, () => null, (name) => (name === 't' ? t : undefined));
}

const clampSamples = (n: number): number =>
  Math.min(SAMPLE_RANGE.max, Math.max(SAMPLE_RANGE.min, Math.round(n) || PLOT_SAMPLES));

/**
 * Graph | Plot Curve… — the desktop's Plot Parametric Curve dialog.
 *
 * Two formulas in t, the domain they are read over and how many samples the
 * polyline is drawn from. As with New Function, what reaches the document is the
 * text that was typed: the page reads it back through the whitelisted evaluator
 * and never compiles it.
 */
export default function PlotCurveDialog({ onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [xExpr, setXExpr] = useState('');
  const [yExpr, setYExpr] = useState('');
  const [from, setFrom] = useState(PARAM_DOMAIN[0]);
  const [to, setTo] = useState(PARAM_DOMAIN[1]);
  const [samples, setSamples] = useState(PLOT_SAMPLES);

  const spec = parametricPlot(xExpr, yExpr, [from, to], clampSamples(samples));
  // the end of the domain and its middle, so a pair that answers nowhere is not
  // drawn as an empty board the designer has to guess about
  const probes = [spec.from, (spec.from + spec.to) / 2, spec.to];
  const answers = xExpr.trim() && yExpr.trim()
    ? probes.some((t) => at(xExpr, t) !== null && at(yExpr, t) !== null)
    : false;
  const problem = !xExpr.trim() || !yExpr.trim()
    ? 'Nhập công thức cho x(t) và y(t)'
    : plotProblem(spec) ?? (answers ? null : 'công thức không cho ra điểm nào trên miền này');
  const ready = problem === null;

  const field = (
    value: string,
    set: (next: string) => void,
    label: string,
    placeholder: string,
  ) => (
    <div className="flex items-center gap-2">
      <span className="text-sm font-mono italic text-gray-700">{label}</span>
      <input
        className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        placeholder={placeholder}
        value={value}
        onChange={(e) => set(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm(spec); }}
      />
    </div>
  );

  const number = (
    value: number,
    set: (next: number) => void,
    label: string,
    step: number,
  ) => (
    <label className="flex items-center gap-1">
      {label}
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => set(Number(e.target.value))}
        className="w-20 border border-gray-300 rounded-lg px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[28rem] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-1">Vẽ đường cong tham số</h2>
        <p className="text-xs text-gray-500 mb-3">Hai phương trình theo tham số t</p>

        {field(xExpr, setXExpr, 'x(t) =', 'cos(t)')}
        <div className="mt-2">{field(yExpr, setYExpr, 'y(t) =', 'sin(t)')}</div>

        <div className="flex items-center gap-2 mt-3 text-sm text-gray-700">
          {number(from, setFrom, 't từ:', 0.5)}
          {number(to, setTo, 'đến:', 0.5)}
          {number(samples, setSamples, 'Số mẫu:', 10)}
        </div>

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
            Vẽ đường cong
          </button>
        </div>
      </div>
    </div>
  );
}
