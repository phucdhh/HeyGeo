import { describe, expect, it } from 'vitest';
import {
  isPlotPointSpec,
  plotPair,
  plotPointCoords,
  plotPointDeps,
  plotPointOf,
  plotPointParents,
  plotPointProblem,
  plotPointRows,
  plotPointSeed,
  prunePlotPoint,
  type PlotPointSpec,
} from './plotPointModel';
import type { HeyGeoElement } from './designTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
const el = (over: Partial<HeyGeoElement> & { id: string }): HeyGeoElement => ({
  type: 'point', parents: [], attrs: {}, ...over,
});

const point = (id: string, x: number, y: number): HeyGeoElement =>
  el({ id, parents: [x, y], attrs: { name: id } });

/** The frame Graph marks: an origin, a unit point two board units out, and a
 *  y-direction that reaches two units up. */
const FRAME = [
  point('O', 0, 0),
  point('U', 2, 0),
  point('O_v', 0, 2),
];

/** The live version of those three, which is what a board hands the closures. */
const liveFrame = (vertical: [number, number] = [0, 2]) => {
  const at = {
    O: [0, 0] as [number, number],
    U: [2, 0] as [number, number],
    O_v: vertical as [number, number],
  };
  const points = (['O', 'U', 'O_v'] as const).map(
    (id) => ({ X: () => at[id][0], Y: () => at[id][1] }));
  return { points, move: (id: keyof typeof at, to: [number, number]) => { at[id] = to; } };
};

const NO_NUMBERS = (): null => null;

const spec = (over: Partial<PlotPointSpec>): PlotPointSpec => ({
  shape: 'rectangular', x: '', y: '', args: [], ...over,
});

describe('a plotted point as data', () => {
  it('is the descriptor of a point and of nothing else', () => {
    const plotted = el({ id: 'P', parents: ['O', 'U', 'O_v'], attrs: { plotAt: spec({ x: '1', y: '2' }) } });
    expect(plotPointOf(plotted)).toEqual(spec({ x: '1', y: '2' }));
    expect(plotPointOf(point('A', 1, 2))).toBeNull();
    expect(plotPointOf(el({ type: 'line', id: 'L', parents: ['A', 'B'], attrs: { plotAt: spec({ x: '1', y: '2' }) } }))).toBeNull();
  });

  it('reads only a shape, two fields and a list of ids', () => {
    expect(isPlotPointSpec(spec({ x: '1', y: '2', args: ['m1'] }))).toBe(true);
    expect(isPlotPointSpec(null)).toBe(false);
    expect(isPlotPointSpec(spec({ shape: 'spherical' as any }))).toBe(false);
    expect(isPlotPointSpec(spec({ x: 1 as any }))).toBe(false);
    expect(isPlotPointSpec(spec({ args: [1] as any }))).toBe(false);
  });

  it('lists the numbers it reads as what depends on them', () => {
    const plotted = el({ id: 'P', attrs: { plotAt: spec({ x: '#0', y: '#1', args: ['m1', 'sl'] }) } });
    expect(plotPointDeps(plotted)).toEqual(['m1', 'sl']);
    expect(plotPointDeps(point('A', 1, 2))).toEqual([]);
  });
});

describe('placing a plotted point', () => {
  it('puts a rectangular pair through the frame it was plotted on', () => {
    const [x, y] = plotPointParents(liveFrame().points, spec({ x: '2', y: '3' }), NO_NUMBERS);
    expect([x(), y()]).toEqual([4, 6]);
  });

  it('puts a polar pair there too, its turn read in degrees', () => {
    const [x, y] = plotPointParents(liveFrame().points, spec({ shape: 'polar', x: '2', y: '90' }), NO_NUMBERS);
    expect(x()).toBeCloseTo(0, 9);
    expect(y()).toBeCloseTo(4, 9);
  });

  it('reads a number of the page for each operand it names', () => {
    const values: Record<string, number> = { m1: 1.5, sl: -2 };
    const [x, y] = plotPointParents(
      liveFrame().points,
      spec({ x: '#0 + 1', y: '#0 * #1', args: ['m1', 'sl'] }),
      (id) => values[id] ?? null,
    );
    expect([x(), y()]).toEqual([5, -6]);
  });

  it('follows the frame when the designer drags it', () => {
    const frame = liveFrame();
    const [x, y] = plotPointParents(frame.points, spec({ x: '2', y: '3' }), NO_NUMBERS);
    frame.move('U', [4, 0]);
    expect([x(), y()]).toEqual([8, 6]);
  });

  it('follows the numbers the designer slides', () => {
    let value = 1;
    const [x] = plotPointParents(liveFrame().points, spec({ x: '#0', y: '0', args: ['sl'] }), () => value);
    expect(x()).toBeCloseTo(2, 9);
    value = 4;
    expect(x()).toBeCloseTo(8, 9);
  });

  it('has no place where either field has no number, because half a point is not one', () => {
    const [x, y] = plotPointParents(liveFrame().points, spec({ x: '#0', y: '1', args: ['m1'] }), NO_NUMBERS);
    expect(Number.isNaN(x())).toBe(true);
    expect(Number.isNaN(y())).toBe(true);
  });

  it('has no place on a frame whose unit point sits on its origin', () => {
    const [x] = plotPointParents(liveFrame([0, 0]).points, spec({ x: '1', y: '1' }), NO_NUMBERS);
    expect(Number.isNaN(x())).toBe(true);
  });
});

describe('an operand the designer deleted from a field', () => {
  it('is renumbered away, so the point stops depending on a number it no longer reads', () => {
    const pruned = prunePlotPoint(spec({ x: '#1 + 1', y: '#2', args: ['m1', 'sl', 'm2'] }));
    expect(pruned).toEqual(spec({ x: '#0 + 1', y: '#1', args: ['sl', 'm2'] }));
  });

  it('changes nothing while both fields still read their numbers', () => {
    const kept = spec({ x: '#0', y: '#1', args: ['m1', 'sl'] });
    expect(prunePlotPoint(kept)).toEqual(kept);
  });

  it('is not used to paper over a slot the point still asks for', () => {
    // #2 names nothing, so it stays in the text for plotPointProblem to refuse
    const pruned = prunePlotPoint(spec({ x: '#2', y: '#0', args: ['m1'] }));
    expect(pruned.x).toBe('#2');
    expect(plotPointProblem(pruned)).toContain('số thứ 3');
  });
});

describe('why a plotted point cannot be placed', () => {
  it('wants both of its coordinates', () => {
    expect(plotPointProblem(spec({ x: '1', y: '' }))).toContain('hai tọa độ');
    expect(plotPointProblem(spec({ x: '', y: '' }))).toContain('hai tọa độ');
    expect(plotPointProblem(spec({ x: '1', y: '2' }))).toBeNull();
  });

  it('refuses a number the page was not given rather than placing nothing', () => {
    expect(plotPointProblem(spec({ x: '#2', y: '0', args: ['m1', 'sl'] }))).toContain('số thứ 3');
    expect(plotPointProblem(spec({ x: '0', y: '#0', args: ['m1'] }))).toBeNull();
  });

  it('refuses a name it has no number for', () => {
    expect(plotPointProblem(spec({ x: 't', y: '0' }))).toContain('cần t');
    expect(plotPointProblem(spec({ x: '2 + x', y: '0' }))).toContain('cần x');
    expect(plotPointProblem(spec({ x: '2pi', y: '0' }))).toBeNull();
  });
});

describe('what the Plot as (x, y)… row answers to', () => {
  const MARKED = [
    el({ id: 'O', parents: [0, 0], attrs: { name: 'O', coordsys: { unit: 'U' } } }),
    point('U', 2, 0),
    point('O_v', 0, 2),
  ];
  const PAGE = [
    point('A', 1, 1),
    el({ type: 'slider', id: 'sl', attrs: { name: 'a' } }),
    el({ type: 'text', id: 'm1', attrs: { measure: { op: 'distance', args: ['A', 'B'], label: 'AB', precision: 2 } } }),
    el({ type: 'text', id: 'mCo', attrs: { measure: { op: 'coordinates', args: ['A'], label: 'A', precision: 2 } } }),
  ];
  const picked = (ids: string[]) => plotPointRows([...PAGE, ...MARKED], ids);

  it('plots the two numbers that were picked, in the order they were picked', () => {
    expect(plotPair([{ id: 'sl', label: 'a' }, { id: 'm1', label: 'AB' }], ['m1', 'sl']))
      .toEqual(spec({ x: '#0', y: '#1', args: ['m1', 'sl'] }));
    expect(picked(['m1', 'sl']).canPlotPair).toBe(true);
  });

  it('waits for exactly two numbers', () => {
    expect(picked(['m1']).canPlotPair).toBe(false);
    expect(picked(['m1', 'sl', 'A']).canPlotPair).toBe(false);
    expect(picked(['m1', 'A']).canPlotPair).toBe(false);
    // a coordinate pair is not two numbers
    expect(picked(['mCo', 'sl']).canPlotPair).toBe(false);
    expect(picked([]).canPlotPair).toBe(false);
  });

  it('opens its dialog for anything else the page can be measured on', () => {
    expect(picked([]).canOpen).toBe(true);
    expect(picked(['A']).canOpen).toBe(true);
    expect(plotPointRows(PAGE, ['m1', 'sl'])).toEqual({ canPlotPair: false, canOpen: false });
  });

  it('starts the dialog with the number that was picked', () => {
    const sources = [{ id: 'sl', label: 'a' }, { id: 'm1', label: 'AB' }];
    expect(plotPointSeed(sources, ['m1'])).toEqual(spec({ x: '#0', y: '', args: ['m1'] }));
    expect(plotPointSeed(sources, ['m1', 'sl'])).toEqual(spec({ x: '#0', y: '#1', args: ['m1', 'sl'] }));
    expect(plotPointSeed(sources, ['A'])).toEqual(spec({ x: '', y: '', args: [] }));
    expect(plotPointSeed(sources, [])).toEqual(spec({ x: '', y: '', args: [] }));
  });
});
