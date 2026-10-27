'use client';

import { useRef, useState } from 'react';
import { evalExpression } from './expression';
import type { NumberValue } from './designTypes';

interface Props {
  /** The numbers on the board the designer may calculate with. */
  values: NumberValue[];
  /** What the dialog opens with: the number that was picked, or nothing. */
  initial: { expr: string; args: string[] };
  onConfirm: (expr: string, args: string[]) => void;
  onCancel: () => void;
}

// The desktop's Calculator keypad, in its own order, with the two keys its
// Functions popup answers to when no list is open.
const KEYS = [
  '7', '8', '9', '+',
  '4', '5', '6', '-',
  '1', '2', '3', '*',
  '0', '.', '⌫', '/',
  '(', ')', '^',
];

/**
 * Number | Calculate… — the desktop's Calculator.
 *
 * A click on one of the numbers on the board puts an operand slot in the
 * expression, and the expression is stored as text over the ids it reads, so
 * what reaches the document is a description of an arithmetic sum and never a
 * piece of JavaScript to run.
 */
export default function CalculateDialog({ values, initial, onConfirm, onCancel }: Props) {
  const [expr, setExpr] = useState(initial.expr);
  const [args, setArgs] = useState<string[]>(initial.args);
  const [caret, setCaret] = useState(initial.expr.length);
  const field = useRef<HTMLInputElement>(null);

  const operand = (i: number): number | null => {
    const found = values.find((v) => v.id === args[i]);
    return found ? found.value : null;
  };
  const value = expr.trim() ? evalExpression(expr, operand) : null;

  function insert(text: string) {
    const at = field.current ? caret : expr.length;
    setExpr(expr.slice(0, at) + text + expr.slice(at));
    setCaret(at + text.length);
    field.current?.focus();
  }

  function backspace() {
    const before = expr.slice(0, caret);
    const after = expr.slice(caret);
    // an operand slot is one key to delete, not however many characters its
    // number happens to be written with
    const token = /#\d+$/.exec(before);
    const cut = token ? before.length - token[0].length : before.length - 1;
    if (cut < 0) return;
    setExpr(before.slice(0, cut) + after);
    setCaret(cut);
    field.current?.focus();
  }

  /** A number the designer clicks keeps the slot it already has. */
  function insertOperand(id: string) {
    const at = args.indexOf(id);
    if (at < 0) setArgs([...args, id]);
    insert(`#${at < 0 ? args.length : at}`);
  }

  function pressKey(key: string) {
    if (key === '⌫') backspace();
    else if (key === '√') insert('sqrt(');
    else insert(key);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onKeyDown={(e) => { if (e.key === 'Escape') onCancel(); }}
    >
      <div
        className="bg-white rounded-xl shadow-2xl p-6 w-[26rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold text-gray-800 mb-4">Máy tính</h2>

        <input
          ref={field}
          autoFocus
          className="w-full text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="#0 + #1"
          value={expr}
          onChange={(e) => { setExpr(e.target.value); setCaret(e.target.selectionStart ?? expr.length); }}
          onSelect={(e) => setCaret(e.currentTarget.selectionStart ?? 0)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value !== null) onConfirm(expr, args); }}
        />

        {/* The desktop shows the running value under the formula window. */}
        <p className="mt-2 h-5 text-sm font-mono text-gray-600">
          {value === null
            ? <span className="text-gray-400">Giá trị chưa xác định</span>
            : `= ${value.toFixed(2)}`}
        </p>

        <div className="grid grid-cols-4 gap-1.5 mt-3">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => pressKey(key)}
              className="text-sm border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
            >
              {key}
            </button>
          ))}
          <button
            onClick={() => insert('pi')}
            className="text-sm border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
          >
            π
          </button>
        </div>

        <h3 className="mt-4 mb-1 text-xs uppercase tracking-wide text-gray-500">Các giá trị</h3>
        <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
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

        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg py-1.5 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            disabled={value === null}
            onClick={() => onConfirm(expr, args)}
            className={[
              'flex-1 text-sm rounded-lg py-1.5 transition-colors',
              value === null
                ? 'text-gray-400 bg-gray-100 cursor-default'
                : 'text-white bg-brand-600 hover:bg-brand-700',
            ].join(' ')}
          >
            Tạo phép tính
          </button>
        </div>
      </div>
    </div>
  );
}
