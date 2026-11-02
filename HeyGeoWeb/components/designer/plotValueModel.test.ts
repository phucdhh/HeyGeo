import { describe, expect, it } from 'vitest';
import {
  isValuePath,
  plotValueDeps,
  plotValueNumber,
  plotValueRows,
  valueGlide,
  valuePaths,
} from './plotValueModel';
import type { HeyGeoElement } from './designTypes';

const el = (
  type: string,
  id: string,
  parents: HeyGeoElement['parents'] = [],
  attrs: Record<string, unknown> = {},
): HeyGeoElement => ({ type, id, parents, attrs });

const SKETCH: HeyGeoElement[] = [
  el('point', 'A', [0, 0], { name: 'A' }),
  el('point', 'B', [2, 0], { name: 'B' }),
  el('segment', 's1', ['A', 'B'], { name: 'a' }),
  el('line', 'l1', ['A', 'B']),
  el('circle', 'c1', ['A', 'B'], { name: 'k' }),
  el('slider', 'm', [[0, 0], [1, 0], [0, 5, 10]], { parameter: { min: 0, max: 10 } }),
];

describe('the paths a value can be plotted along', () => {
  it('lists the constructions that carry a reading, named for the dialog', () => {
    expect(valuePaths(SKETCH).map((p) => [p.id, p.kind, p.label])).toEqual([
      ['s1', 'segment', 'Đoạn a'],
      ['l1', 'line', 'Đường thẳng l1'],
      ['c1', 'circle', 'Đường tròn k'],
    ]);
    expect(isValuePath(el('ray', 'r'))).toBe(true);
    // a point is a place, not a path, and neither is a number
    expect(isValuePath(el('point', 'P'))).toBe(false);
    expect(isValuePath(el('slider', 'k'))).toBe(false);
  });

  it('turns a number into the reading each path measures by', () => {
    expect(valueGlide('segment', 0.25)).toEqual({ ratio: 0.25 });
    expect(valueGlide('line', 3)).toEqual({ distance: 3 });
    expect(valueGlide('ray', 3)).toEqual({ distance: 3 });
    // a circle counts whole turns
    expect((valueGlide('circle', 0.5) as { turn: number }).turn).toBeCloseTo(Math.PI, 12);
    expect(valueGlide('segment', Number.NaN)).toBeNull();
  });
});

describe('Graph | Plot Value on Path naming its row', () => {
  it('plots at once when a number and a path are picked', () => {
    expect(plotValueRows(SKETCH, ['m', 's1'])).toMatchObject({
      immediate: true, label: 'Plot Value on Path', values: ['m'], paths: ['s1'],
    });
    // several values on one path plot each of them
    expect(plotValueRows(SKETCH, ['m', 'm', 's1']).immediate).toBe(true);
  });

  it('plots one value on several paths', () => {
    expect(plotValueRows(SKETCH, ['m', 's1', 'c1'])).toMatchObject({
      immediate: true, label: 'Plot Value on Paths', values: ['m'], paths: ['s1', 'c1'],
    });
  });

  it('asks for the value when only the path is picked', () => {
    expect(plotValueRows(SKETCH, ['s1'])).toMatchObject({
      immediate: false, label: 'Plot Value on Path…', paths: ['s1'],
    });
  });

  it('falls back to the axis row with nothing to plot along', () => {
    expect(plotValueRows(SKETCH, []).label).toBe('Plot Value on Axis…');
    expect(plotValueRows(SKETCH, []).immediate).toBe(false);
    // two numbers and no path is not a row that can decide anything
    expect(plotValueRows(SKETCH, ['m', 'm']).immediate).toBe(false);
    expect(plotValueRows(SKETCH, ['A', 's1']).immediate).toBe(false);
  });
});

describe('the value a plotted point reads', () => {
  const spec = { value: '#0/2 + 0.1', args: ['m'], path: 's1', kind: 'segment' as const };

  it('runs the reading over the numbers of the page', () => {
    expect(plotValueNumber(spec, (id) => (id === 'm' ? 4 : null))).toBeCloseTo(2.1, 12);
  });

  it('has no place while one of its numbers is unknown', () => {
    expect(plotValueNumber(spec, () => null)).toBeNull();
  });

  it('names its path and the numbers it reads as the things it depends on', () => {
    expect(plotValueDeps({ attrs: { plotValue: spec } })).toEqual(['s1', 'm']);
    expect(plotValueDeps({ attrs: {} })).toEqual([]);
  });
});
