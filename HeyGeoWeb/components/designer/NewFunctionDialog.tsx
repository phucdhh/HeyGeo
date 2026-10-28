'use client';

import { useRef, useState } from 'react';
import { evalExpression } from './expression';
import { DEFAULT_DOMAIN, functionPlot, plotProblem } from './plotModel';

interface Props {
  onConfirm: (expr: string, domain: [number, number]) => void;
  onCancel: () => void;
}

// The desktop's Functions popup, in its order, inserting the name its own
// alias map settles on: arcsin reads as asin, and so on.
const FUNCTIONS: { label: string; insert: string }[] = [
  { label: 'sin', insert: 'sin' },
  { label: 'cos', insert: 'cos' },
  { label: 'tan', insert: 'tan' },
  { label: 'arcsin', insert: 'asin' },
  { label: 'arccos', insert: 'acos' },
  { label: 'arctan', insert: 'atan' },
  { label: 'abs', insert: 'abs' },
  { label: 'sqrt', insert: 'sqrt' },
  { label: 'ln', insert: 'ln' },
  { label: 'log10', insert: 'log10' },
  { label: 'exp', insert: 'exp' },
  { label: 'round', insert: 'round' },
  { label: 'floor', insert: 'floor' },
  { label: 'ceil', insert: 'ceil' },
  { label: 'sgn', insert: 'sgn' },
];

// The keypad the desktop's dialog shows, in its rows: digits and four
// operations, then the brackets, the power and the variable it is written in.
const KEYS: { label: string; insert?: string }[] = [
  { label: '7' }, { label: '8' }, { label: '9' }, { label: '+', insert: '+' },
  { label: '4' }, { label: '5' }, { label: '6' }, { label: '−', insert: '-' },
  { label: '1' }, { label: '2' }, { label: '3' }, { label: '×', insert: '*' },
  { label: '0' }, { label: '.' }, { label: '⌫' }, { label: '/', insert: '/' },
  { label: '(' }, { label: ')' }, { label: '^' }, { label: 'x', insert: 'x' },
];

/** Three values of the formula, so the designer sees the curve before drawing it. */
const PROBES = [-1, 0, 1];

/** What the formula is worth at one x, or null when it has no number there. */
function at(expr: string, x: number): number | null {
  return evalExpression(expr, () => null, (name) => (name === 'x' ? x : undefined));
}

/**
 * Graph | New Function… — the desktop's New Function dialog.
 *
 * The formula stays the text that was typed: what reaches the document is an
 * infix expression, its variable and its domain, which the plot reads back
 * through the marked frame. Nothing here is ever compiled.
 */
export default function NewFunctionDialog({ onConfirm, onCancel }: Props) {
  const [expr, setExpr] = useState('');
  const [from, setFrom] = useState(DEFAULT_DOMAIN[0]);
  const [to, setTo] = useState(DEFAULT_DOMAIN[1]);
  const [caret, setCaret] = useState(0);
  const field = useRef<HTMLInputElement>(null);

  const problem = expr.trim() ? plotProblem(functionPlot(expr, [from, to])) : 'Nhập công thức cho f(x)';
  const values = PROBES.map((x) => ({ x, y: expr.trim() ? at(expr, x) : null }));
  // A formula that answers with no number at all is not a curve: sin(x) does,
  // y+1 does not (and plotProblem has already named the variable it asked for).
  const ready = problem === null && values.some((v) => v.y !== null);

  function insert(text: string) {
    const pos = field.current ? caret : expr.length;
    setExpr(expr.slice(0, pos) + text + expr.slice(pos));
    setCaret(pos + text.length);
    field.current?.focus();
  }

  function backspace() {
    const before = expr.slice(0, caret);
    if (!before) return;
    setExpr(before.slice(0, -1) + expr.slice(caret));
    setCaret(caret - 1);
    field.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[30rem] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-4">Hàm số mới</h2>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono italic text-gray-700">f(x) =</span>
          <input
            ref={field}
            autoFocus
            className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="x^2 + sin(x)"
            value={expr}
            onChange={(e) => { setExpr(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm(expr, [from, to]); }}
          />
        </div>

        {/* The desktop typesets the formula here; what says the same thing in a
            browser is the value the curve has at three points of its domain. */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-sm font-mono text-gray-800">f(x) = {expr.trim() || '…'}</p>
          <p className="mt-1 text-xs font-mono text-gray-600">
            {values.map((v) => (v.y === null
              ? `f(${v.x}) = —`
              : `f(${v.x}) = ${Number(v.y.toFixed(4))}`)).join('   ')}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {FUNCTIONS.map((f) => (
            <button
              key={f.label}
              onClick={() => insert(`${f.insert}(`)}
              className="text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => insert('pi')}
            className="text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
          >
            π
          </button>
          <button
            onClick={() => insert('e')}
            className="text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
          >
            e
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {KEYS.map((key) => (
            <button
              key={key.label}
              onClick={() => (key.label === '⌫' ? backspace() : insert(key.insert ?? key.label))}
              className={[
                'text-sm border rounded-lg py-1.5 transition-colors',
                key.label === 'x'
                  ? 'border-brand-400 bg-brand-50 font-bold text-gray-800 hover:bg-brand-100'
                  : 'border-gray-300 hover:bg-gray-100',
              ].join(' ')}
            >
              {key.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3 text-sm text-gray-700">
          <label className="flex items-center gap-1">
            x min:
            <input
              type="number"
              step={0.5}
              value={from}
              onChange={(e) => setFrom(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
          <label className="flex items-center gap-1">
            x max:
            <input
              type="number"
              step={0.5}
              value={to}
              onChange={(e) => setTo(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded-lg px-2 py-1 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </label>
        </div>

        <p className="mt-2 h-5 text-xs text-gray-500">
          {!ready && expr.trim() !== '' ? problem : ''}
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
            onClick={() => onConfirm(expr, [from, to])}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              !ready
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Tạo hàm số
          </button>
        </div>
      </div>
    </div>
  );
}
