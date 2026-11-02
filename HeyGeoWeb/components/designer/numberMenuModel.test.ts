import { describe, expect, it } from 'vitest';
import {
  SLIDER_DEFAULTS,
  calculateSpec,
  canCalculate,
  defaultSlider,
  nextParameterName,
  expandOperands,
  numberSources,
  parameterPlace,
  pruneOperands,
  seedCalculate,
} from './numberMenuModel';
import type { HeyGeoElement } from './designTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
const el = (type: string, id: string, attrs: Record<string, unknown> = {}): HeyGeoElement => ({
  type, id, parents: [], attrs,
});
const measure = (id: string, op: string, label: string) =>
  el('text', id, { measure: { op, args: [], label, precision: 2 } });

const BOARD = [
  el('point', 'A', { name: 'A' }),
  measure('mAB', 'length', 'AB'),
  el('slider', 'sl', { name: 'a' }),
  measure('mPoly', 'area', 'Area ABC'),
  measure('mEq', 'equationLine', 'Equation L'),
  measure('mCo', 'coordinates', 'A'),
  measure('mCalc', 'calculate', 'AB + a'),
];

describe('the numbers a calculation may read', () => {
  it('lists a parameter beside the measurements and sliders', () => {
    const sources = numberSources([
      el('parameter', 'p1', { name: 'n', parameter: { value: 3, min: 0, max: 10, precision: 0 } }),
    ]);
    expect(sources).toEqual([{ id: 'p1', label: 'n' }]);
  });

  it('lists the measurements that show a number and the sliders', () => {
    expect(numberSources(BOARD)).toEqual([
      { id: 'mAB', label: 'AB' },
      { id: 'sl', label: 'a' },
      { id: 'mPoly', label: 'Area ABC' },
      { id: 'mCalc', label: 'AB + a' },
    ]);
  });

  it('leaves out captions that are not numbers', () => {
    const labels = numberSources(BOARD).map((s) => s.id);
    expect(labels).not.toContain('mEq');
    expect(labels).not.toContain('mCo');
    expect(labels).not.toContain('A');
  });

  it('calls a slider by the name it was given', () => {
    expect(numberSources([el('slider', 'sl1')])).toEqual([{ id: 'sl1', label: 'sl1' }]);
  });

  it('has nothing to offer an empty page', () => {
    expect(numberSources([el('point', 'A')])).toEqual([]);
    expect(canCalculate(numberSources(BOARD), [])).toBe(true);
  });
});

describe('Number | Calculate…', () => {
  it('opens for nothing picked and for one number picked', () => {
    const sources = numberSources(BOARD);
    expect(canCalculate(sources, ['mAB'])).toBe(true);
    expect(canCalculate(sources, ['sl'])).toBe(true);
    // a shape is not a number, and two numbers do not make one calculation
    expect(canCalculate(sources, ['A'])).toBe(false);
    expect(canCalculate(sources, ['mAB', 'sl'])).toBe(false);
  });

  it('starts from the picked number', () => {
    expect(seedCalculate(numberSources(BOARD), ['mAB'])).toEqual({ expr: '#0', args: ['mAB'] });
    expect(seedCalculate(numberSources(BOARD), ['A'])).toEqual({ expr: '', args: [] });
    expect(seedCalculate(numberSources(BOARD), [])).toEqual({ expr: '', args: [] });
  });

  it('names the numbers it reads, the way the desktop expands a formula', () => {
    const sources = numberSources(BOARD);
    expect(expandOperands('#0/#1', ['mAB', 'sl'], sources)).toBe('AB/a');
    // a nested calculation is written out with the numbers inside it
    expect(expandOperands('sqrt(#0)', ['mCalc'], sources)).toBe('sqrt(AB + a)');
  });

  it('drops an operand the expression no longer reads', () => {
    expect(pruneOperands('#0', ['mAB', 'sl'])).toEqual({ expr: '#0', args: ['mAB'] });
  });

  it('renumbers what is left', () => {
    expect(pruneOperands('#1 - #0', ['mAB', 'sl']))
      .toEqual({ expr: '#0 - #1', args: ['sl', 'mAB'] });
  });

  it('writes a descriptor, never JavaScript', () => {
    const spec = calculateSpec('#0 + 2*#1', ['mAB', 'sl'], numberSources(BOARD));
    expect(spec).toEqual({
      op: 'calculate',
      args: ['mAB', 'sl'],
      expr: '#0 + 2*#1',
      label: 'AB + 2*a',
      precision: 2,
    });
  });

  it('keeps an expression that points past its operands as written', () => {
    // the preview shows the calculation as undefined; the document still says
    // which ids it meant, and a caption for a missing operand is not a crash
    const spec = calculateSpec('#0/#1', ['mAB'], numberSources(BOARD));
    expect(spec.args).toEqual(['mAB']);
    expect(spec.expr).toBe('#0/#1');
  });
});

describe('Number | New Parameter…', () => {
  it('takes the first place in the left margin', () => {
    expect(parameterPlace([])).toEqual({ x1: -7, y1: 6.5, x2: -3.5, y2: 6.5 });
  });

  it('lines the next ones up under it', () => {
    const two = [el('slider', 's1'), el('slider', 's2')];
    expect(parameterPlace(two).y1).toBeCloseTo(6.5 - 2 * 1.5, 6);
    expect(parameterPlace(two).x1).toBe(-7);
  });
});

describe('Number | Add Slider', () => {
  it('drops a slider on the dialog’s defaults', () => {
    expect(SLIDER_DEFAULTS).toEqual({ min: 0, max: 10, init: 5, step: 0.1 });
    expect(defaultSlider([])).toEqual({ name: 'a', min: 0, max: 10, init: 5, step: 0.1 });
  });

  it('names it the first letter no slider uses', () => {
    expect(nextParameterName([el('slider', 'sl1', { name: 'a' })])).toBe('b');
    expect(nextParameterName([
      el('slider', 'sl1', { name: 'a' }),
      el('slider', 'sl2', { name: 'c' }),
    ])).toBe('b');
    // a point called A is not a number and does not take the name
    expect(nextParameterName([el('point', 'A', { name: 'a' })])).toBe('a');
  });

  it('moves on to s1 once the alphabet is spent', () => {
    const all = Array.from({ length: 26 }, (_, i) =>
      el('slider', `sl${i}`, { name: String.fromCharCode(97 + i) }));
    expect(nextParameterName(all)).toBe('s1');
    expect(nextParameterName([...all, el('slider', 'slx', { name: 's1' })])).toBe('s2');
  });
});
