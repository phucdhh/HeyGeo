'use client';

import { useRef, useState } from 'react';
import { evalExpression } from './expression';
import type { NumberValue } from './designTypes';
import type { PlotValueChoice, ValuePath } from './plotValueModel';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** The numbers on the board the value may read. */
  values: NumberValue[];
  /** The paths of the sketch a value may be plotted along. */
  paths: ValuePath[];
  /** What the dialog opens with: the picks, and the path they named. */
  initial: PlotValueChoice;
  onPlot: (choice: PlotValueChoice) => boolean;
  onDone: () => void;
}

/** How each kind of path reads a value, in Sketchpad's own terms. */
const HINTS: Record<ValuePath['kind'], string> = {
  segment: '0 ở đầu thứ nhất, 1 ở đầu thứ hai',
  line: 'khoảng cách dọc theo đường, tính từ điểm thứ nhất',
  ray: 'khoảng cách dọc theo tia, tính từ đỉnh',
  circle: 'số vòng, ngược chiều kim đồng hồ từ điểm bên phải tâm',
};

/**
 * Graph | Plot Value on Axis/Path… — Sketchpad's Plot Value dialog.
 *
 * The value is infix text over the ids of the numbers it reads, exactly like a
 * plotted point's coordinates, so a parameter under it carries the point along
 * its path when it changes. The path is one object of the sketch, or the marked
 * frame's x axis when none is named.
 */
export default function PlotValueDialog({ values, paths, initial, onPlot, onDone }: Props) {
  useDialogDismiss(onDone);
  const [value, setValue] = useState(initial.value);
  const [args, setArgs] = useState<string[]>(initial.args);
  const [path, setPath] = useState<string>(initial.path ?? '');
  const [caret, setCaret] = useState(initial.value.length);
  const field = useRef<HTMLInputElement>(null);

  const chosen = paths.find((p) => p.id === path) ?? null;
  const problem = value.trim() ? null : 'Nhập một giá trị để vẽ';
  const number = value.trim()
    ? evalExpression(value, (i) => (args[i] ? values.find((v) => v.id === args[i])?.value ?? null : null))
    : null;
  // a formula over numbers that are not known yet has no place to stand
  const ready = problem === null && number !== null && Number.isFinite(number);

  function insert(text: string) {
    const at = caret;
    setValue(value.slice(0, at) + text + value.slice(at));
    setCaret(at + text.length);
    field.current?.focus();
  }

  /** A number the designer clicks keeps the slot it already has. */
  function insertOperand(id: string) {
    const slot = args.indexOf(id);
    if (slot < 0) setArgs([...args, id]);
    insert(`#${slot < 0 ? args.length : slot}`);
  }

  function plot() {
    if (!ready) return;
    onPlot({ value, args, path: path === '' ? null : path });
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onDone}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[30rem] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-3">Vẽ giá trị</h2>

        <div className="flex items-center gap-2">
          <span className="w-16 text-sm text-gray-700">Giá trị</span>
          <input
            ref={field}
            autoFocus
            className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="0.5"
            value={value}
            onChange={(e) => { setValue(e.target.value); setCaret(e.target.selectionStart ?? e.target.value.length); }}
            onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
            onKeyDown={(e) => { if (e.key === 'Enter') plot(); }}
          />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className="w-16 text-sm text-gray-700">Trên</span>
          <select
            className="flex-1 text-sm border border-gray-300 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          >
            <option value="">Trục x của hệ trục</option>
            {paths.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </div>

        <p className="mt-2 h-5 text-xs text-gray-500">
          {problem ?? (chosen ? HINTS[chosen.kind] : 'Đặt giá trị lên trục hoành của hệ trục đã đánh dấu.')}
        </p>

        <h3 className="mt-3 mb-1 text-xs uppercase tracking-wide text-gray-500">Các giá trị</h3>
        <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-lg">
          {values.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-400">Chưa có con số nào trên trang vẽ.</p>
          )}
          {values.map((v) => (
            <button
              key={v.id}
              onClick={() => insertOperand(v.id)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-brand-50 transition-colors"
            >
              <span className="font-mono">{v.label}</span>
              <span className="text-gray-400">
                {v.value === null ? ' — chưa xác định' : ` = ${v.value.toFixed(2)}`}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-3 mt-4">
          <button
            onClick={onDone}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={!ready}
            onClick={plot}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              !ready
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Vẽ giá trị
          </button>
        </div>
      </div>
    </div>
  );
}
