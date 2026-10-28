'use client';

import { useRef, useState } from 'react';
import {
  plotPointCoords,
  plotPointProblem,
  type PlotPointSpec,
  type PlotShape,
} from './plotPointModel';
import type { NumberValue } from './designTypes';
import { useDialogDismiss } from './useDialogDismiss';

interface Props {
  /** The numbers on the board the point may read. */
  values: NumberValue[];
  /** What the dialog opens with: the numbers that were picked, or nothing. */
  initial: PlotPointSpec;
  onConfirm: (spec: PlotPointSpec) => void;
  onCancel: () => void;
}

/**
 * Sketchpad's two ways of naming a place, in the order its dialog puts the tabs.
 * The polar one takes its turn in degrees because that is the angle unit the
 * desktop measures, prints and stores angles in.
 */
const TABS: { shape: PlotShape; label: string; fields: [string, string] }[] = [
  { shape: 'rectangular', label: 'Tọa độ vuông', fields: ['x =', 'y ='] },
  { shape: 'polar', label: 'Tọa độ cực', fields: ['r =', 'θ ='] },
];

const KEYS = [
  '7', '8', '9', '+',
  '4', '5', '6', '-',
  '1', '2', '3', '*',
  '0', '.', '⌫', '/',
  '(', ')', '^',
];

/** The functions a coordinate is most often written with, then the two constants. */
const FUNCTIONS = [
  { label: 'sqrt', insert: 'sqrt(' },
  { label: 'abs', insert: 'abs(' },
  { label: 'sin', insert: 'sin(' },
  { label: 'cos', insert: 'cos(' },
  { label: 'tan', insert: 'tan(' },
  { label: 'ln', insert: 'ln(' },
  { label: 'log10', insert: 'log10(' },
  { label: 'round', insert: 'round(' },
  { label: 'π', insert: 'pi' },
  { label: 'e', insert: 'e' },
];

/**
 * Graph | Plot as (x, y)… — Sketchpad's Plot Point dialog.
 *
 * The point is stored as the two expressions that were typed, over the ids of the
 * numbers they read, so a document keeps a description of a place and the page
 * never compiles what it read from storage.
 */
export default function PlotPointDialog({ values, initial, onConfirm, onCancel }: Props) {
  useDialogDismiss(onCancel);
  const [shape, setShape] = useState<PlotShape>(initial.shape);
  const [x, setX] = useState(initial.x);
  const [y, setY] = useState(initial.y);
  const [args, setArgs] = useState<string[]>(initial.args);
  const [active, setActive] = useState<'x' | 'y'>('x');
  const [caret, setCaret] = useState(initial.x.length);
  const xField = useRef<HTMLInputElement>(null);
  const yField = useRef<HTMLInputElement>(null);

  const spec: PlotPointSpec = { shape, x, y, args };
  const problem = plotPointProblem(spec);
  const placed = problem === null
    ? plotPointCoords(spec, (id) => values.find((v) => v.id === id)?.value ?? null)
    : null;
  const ready = placed !== null;

  const tab = TABS.find((t) => t.shape === shape) ?? TABS[0];
  const text = active === 'x' ? x : y;
  const write = (next: string) => (active === 'x' ? setX : setY)(next);
  const focused = () => (active === 'x' ? xField.current : yField.current);

  function insert(chunk: string) {
    const at = focused() ? caret : text.length;
    write(text.slice(0, at) + chunk + text.slice(at));
    setCaret(at + chunk.length);
    focused()?.focus();
  }

  function backspace() {
    const before = text.slice(0, caret);
    if (!before) return;
    // an operand slot is one key to delete, not however many characters its
    // number happens to be written with
    const token = /#\d+$/.exec(before);
    const cut = token ? before.length - token[0].length : before.length - 1;
    write(before.slice(0, cut) + text.slice(caret));
    setCaret(cut);
    focused()?.focus();
  }

  /** A number the designer clicks keeps the slot it already has. */
  function insertOperand(id: string) {
    const slot = args.indexOf(id);
    if (slot < 0) setArgs([...args, id]);
    insert(`#${slot < 0 ? args.length : slot}`);
  }

  /** The active field, with the label of whichever tab is open. */
  const field = (which: 'x' | 'y', label: string) => (
    <div className="flex items-center gap-2">
      <span className="w-8 text-sm font-mono italic text-gray-700">{label}</span>
      <input
        ref={which === 'x' ? xField : yField}
        autoFocus={which === 'x'}
        className="flex-1 text-sm font-mono border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        value={which === 'x' ? x : y}
        onChange={(e) => {
          const next = e.target.value;
          (which === 'x' ? setX : setY)(next);
          if (which === active) setCaret(e.target.selectionStart ?? next.length);
        }}
        onFocus={() => {
          setActive(which);
          setCaret((which === 'x' ? x : y).length);
        }}
        onSelect={(e) => {
          setActive(which);
          setCaret(e.currentTarget.selectionStart ?? 0);
        }}
        onKeyDown={(e) => { if (e.key === 'Enter' && ready) onConfirm(spec); }}
      />
    </div>
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
        <h2 className="text-base font-semibold text-gray-800 mb-3">Vẽ điểm</h2>

        <div className="flex gap-1 border-b border-gray-200 mb-3">
          {TABS.map((t) => (
            <button
              key={t.shape}
              onClick={() => setShape(t.shape)}
              className={[
                'px-3 py-1.5 text-sm rounded-t-lg border-b-2 -mb-px transition-colors',
                t.shape === shape
                  ? 'border-brand-600 text-brand-700 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>

        {field('x', tab.fields[0])}
        <div className="mt-2">{field('y', tab.fields[1])}</div>

        {/* Where the two numbers land in the frame the point is plotted onto. */}
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
          <p className="text-xs text-gray-500">
            {shape === 'polar' ? 'Điểm ở vị trí' : 'Điểm ở'}
          </p>
          <p className="text-sm font-mono text-gray-800">
            {placed === null
              ? <span className="text-gray-400">— chưa xác định</span>
              : `(${Number(placed[0].toFixed(4))}; ${Number(placed[1].toFixed(4))})`}
          </p>
        </div>

        <div className="grid grid-cols-5 gap-1.5 mt-3">
          {FUNCTIONS.map((fn) => (
            <button
              key={fn.label}
              onClick={() => insert(fn.insert)}
              className="text-xs border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
            >
              {fn.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-2">
          {KEYS.map((key) => (
            <button
              key={key}
              onClick={() => (key === '⌫' ? backspace() : insert(key))}
              className="text-sm border border-gray-300 rounded-lg py-1.5 hover:bg-gray-100 transition-colors"
            >
              {key}
            </button>
          ))}
        </div>

        <h3 className="mt-4 mb-1 text-xs uppercase tracking-wide text-gray-500">Các giá trị</h3>
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

        <p className="mt-2 h-5 text-xs text-gray-500">
          {!ready && (x.trim() !== '' || y.trim() !== '') ? problem : ''}
        </p>

        <div className="flex gap-3 mt-2">
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
            Vẽ điểm
          </button>
        </div>
      </div>
    </div>
  );
}
