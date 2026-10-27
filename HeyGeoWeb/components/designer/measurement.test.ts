import { describe, expect, it } from 'vitest';
import {
  anchorClosures,
  isAnchorSpec,
  isMeasureSpec,
  measureCaption,
  measureClosure,
  measureDeps,
  measureValue,
  registerMeasure,
  type MeasureSpec,
} from './measurement';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Obj = any;

const point = (x: number, y: number): Obj => ({ X: () => x, Y: () => y });
const segment = (a: Obj, b: Obj): Obj => ({ point1: a, point2: b });
const circle = (c: Obj, r: number): Obj => ({ center: c, Radius: () => r });
/** An arc the way JSXGraph builds one: a centre, a start point, an end point. */
const arc = (c: Obj, start: Obj, end: Obj): Obj => ({
  center: c, radiuspoint: start, anglepoint: end,
  Radius: () => Math.hypot(start.X() - c.X(), start.Y() - c.Y()),
});
const sector = (a: Obj, area: number): Obj => ({ ...a, Area: () => area });
const polygon = (verts: Obj[], area: number, per: number): Obj => ({
  vertices: verts,
  Area: () => area,
  Perimeter: () => per,
});
const board = (objects: Record<string, Obj>): Obj => ({ objects });

// The shapes a real document holds, so one board covers most of the ops.
const WORLD: Record<string, Obj> = {
  O: point(0, 0),
  A: point(0, 0),
  B: point(3, 4),
  U: point(2, 0),
  N: point(0, 1),
  P: point(1, 3),
  Q: point(6, 1),
  s: segment(point(0, 0), point(4, 0)),
  dot: segment(point(1, 1), point(1, 1)),
  tall: segment(point(0, 0), point(0, 5)),
  diag: segment(point(0, 0), point(2, 4)),
  half: segment(point(0, 0), point(2, 0)),
  c: circle(point(1, 2), 3),
  quarter: arc(point(1, 1), point(3, 1), point(1, 3)),
  threeQuarter: arc(point(0, 0), point(2, 0), point(0, -2)),
  pie: sector(arc(point(1, 1), point(3, 1), point(1, 3)), Math.PI),
  tri: polygon([point(0, 0), point(4, 0), point(0, 3)], -6, 12),
  sl: { Value: () => 7 },
};
const b = () => board(WORLD);

const spec = (over: Partial<MeasureSpec> & { op: MeasureSpec['op']; args: string[] }): MeasureSpec => ({
  precision: 2, ...over,
} as MeasureSpec);

describe('measureValue', () => {
  it.each([
    ['distance', ['A', 'B'], 5],
    ['length', ['s'], 4],
    ['radius', ['c'], 3],
    ['abscissa', ['B'], 3],
    ['ordinate', ['B'], 4],
    ['value', ['sl'], 7],
  ])('%s of %j', (op, args, expected) => {
    expect(measureValue(b(), spec({ op: op as MeasureSpec['op'], args }))).toBeCloseTo(expected, 6);
  });

  it('multiplies the legacy centimetres-per-unit scale in', () => {
    expect(measureValue(b(), spec({ op: 'distance', args: ['A', 'B'], scale: 2 }))).toBe(10);
  });

  it('measures point to segment by the nearest point on it', () => {
    expect(measureValue(b(), spec({ op: 'pointSegmentDistance', args: ['P', 's'] }))).toBeCloseTo(3, 6);
    // Q is past the end of the segment, so the endpoint is the nearest point
    expect(measureValue(b(), spec({ op: 'pointSegmentDistance', args: ['Q', 's'] }))).toBeCloseTo(Math.hypot(2, 1), 6);
  });

  it('circles round to the circumference', () => {
    expect(measureValue(b(), spec({ op: 'circumference', args: ['c'] }))).toBeCloseTo(2 * Math.PI * 3, 6);
  });

  it('takes the absolute area of a polygon', () => {
    expect(measureValue(b(), spec({ op: 'area', args: ['tri'] }))).toBe(6);
    expect(measureValue(b(), spec({ op: 'perimeter', args: ['tri'] }))).toBe(12);
  });

  it('measures the curved part of an arc, the way the desktop draws it', () => {
    expect(measureValue(b(), spec({ op: 'arcLength', args: ['quarter'] }))).toBeCloseTo(Math.PI, 6);
    // JSXGraph turns counterclockwise as far as the end point, so this is the long way round
    expect(measureValue(b(), spec({ op: 'arcLength', args: ['threeQuarter'] }))).toBeCloseTo(3 * Math.PI, 6);
    expect(measureValue(b(), spec({ op: 'arcAngle', args: ['quarter'] }))).toBeCloseTo(90, 6);
    expect(measureValue(b(), spec({ op: 'arcAngle', args: ['threeQuarter'] }))).toBeCloseTo(270, 6);
  });

  it('areas a sector and the bow of an arc segment', () => {
    expect(measureValue(b(), spec({ op: 'area', args: ['pie'] }))).toBeCloseTo(Math.PI, 6);
    // the desktop's G_arcSegment: the sector the arc sweeps, minus its triangle
    expect(measureValue(b(), spec({ op: 'segmentArea', args: ['quarter'] })))
      .toBeCloseTo(2 * (Math.PI / 2 - 1), 6);
    expect(measureValue(b(), spec({ op: 'segmentArea', args: ['threeQuarter'] })))
      .toBeCloseTo(2 * (3 * Math.PI / 2 + 1), 6);
  });

  it('has no arc measurement in a parent that is not an arc', () => {
    expect(measureValue(b(), spec({ op: 'arcLength', args: ['c'] }))).toBeNull();
    expect(measureValue(b(), spec({ op: 'segmentArea', args: ['ghost'] }))).toBeNull();
  });

  it('measures the angle from the first wing to the second, like the desktop', () => {
    expect(measureValue(b(), spec({ op: 'angle', args: ['N', 'A', 'U'] }))).toBeCloseTo(270, 6);
    expect(measureValue(b(), spec({ op: 'angle', args: ['U', 'A', 'N'] }))).toBeCloseTo(90, 6);
  });

  it('ratios two segments and survives a zero denominator', () => {
    expect(measureValue(b(), spec({ op: 'ratio', args: ['s', 'half'] }))).toBe(2);
    expect(measureValue(b(), spec({ op: 'ratio', args: ['s', 'dot'] }))).toBe(0);
    expect(measureValue(b(), spec({ op: 'ratio', args: ['s', 'tall'] }))).toBeCloseTo(4 / 5, 6);
  });

  it('prints a vertical line as no slope at all', () => {
    expect(measureValue(b(), spec({ op: 'slope', args: ['diag'] }))).toBe(2);
    expect(measureValue(b(), spec({ op: 'slope', args: ['tall'] }))).toBe(Infinity);
  });

  it('has no numeric value for the text-shaped ops', () => {
    expect(measureValue(b(), spec({ op: 'coordinates', args: ['B'] }))).toBeNull();
    expect(measureValue(b(), spec({ op: 'equationLine', args: ['s'] }))).toBeNull();
    expect(measureValue(b(), spec({ op: 'equationCircle', args: ['c'] }))).toBeNull();
  });

  it('is null when a parent is not on the board', () => {
    expect(measureValue(b(), spec({ op: 'distance', args: ['A', 'ghost'] }))).toBeNull();
  });
});

describe('measureCaption', () => {
  it('formats label, precision and unit', () => {
    expect(measureCaption(b(), spec({ op: 'distance', args: ['A', 'B'], label: 'AB', precision: 3, unit: ' cm' })))
      .toBe('AB = 5.000 cm');
    expect(measureCaption(b(), spec({ op: 'radius', args: ['c'], label: 'r' }))).toBe('r = 3.00');
  });

  it('leaves the label out when the caption is the value alone', () => {
    expect(measureCaption(b(), spec({ op: 'length', args: ['s'] }))).toBe('4.00');
  });

  it('prints an arc measurement with the unit the desktop puts on it', () => {
    expect(measureCaption(b(), spec({ op: 'arcLength', args: ['quarter'], label: 'cung AB', unit: ' cm' })))
      .toBe('cung AB = 3.14 cm');
    expect(measureCaption(b(), spec({ op: 'arcAngle', args: ['threeQuarter'], label: 'α', unit: '°' })))
      .toBe('α = 270.00°');
    expect(measureCaption(b(), spec({ op: 'segmentArea', args: ['quarter'], label: 'AB', unit: ' cm²' })))
      .toBe('AB = 1.14 cm²');
    // the desktop squares its centimetres-per-unit for an area
    expect(measureCaption(b(), spec({ op: 'area', args: ['pie'], scale: 2, unit: ' cm²' }))).toBe('6.28 cm²');
  });

  it('shows the two forms the web designer used to write by hand', () => {
    expect(measureCaption(b(), spec({ op: 'coordinates', args: ['B'], label: 'B' }))).toBe('B: (3.00, 4.00)');
    expect(measureCaption(b(), spec({ op: 'abscissa', args: ['B'], label: 'x_{B}' }))).toBe('x_{B} = 3.00');
  });

  it('writes the line and circle equations', () => {
    expect(measureCaption(b(), spec({ op: 'equationLine', args: ['diag'] }))).toBe('-4.0x + 2.0y + 0.0 = 0');
    expect(measureCaption(b(), spec({ op: 'equationCircle', args: ['c'] }))).toBe('(x - 1.0)² + (y - 2.0)² = 9.0');
  });

  it('measures against a document coordinate system', () => {
    // O is the origin and U is one unit away, so B is at (1.5, 2) of those units
    expect(measureCaption(b(), spec({ op: 'relativeCoordinates', args: ['O', 'U', 'B'], label: 'B' })))
      .toBe('B = (1.50; 2.00)');
    expect(measureCaption(b(), spec({ op: 'relativeAbscissa', args: ['O', 'U', 'B'], label: 'x<sub>B</sub>' })))
      .toBe('x<sub>B</sub> = 1.50');
    expect(measureCaption(b(), spec({ op: 'relativeOrdinate', args: ['O', 'U', 'B'], label: 'y<sub>B</sub>' })))
      .toBe('y<sub>B</sub> = 2.00');
    expect(measureCaption(b(), spec({ op: 'relativeDistance', args: ['O', 'U', 'A', 'B'], label: 'AB' })))
      .toBe('AB = 2.50');
  });

  it('falls back to an ellipsis instead of NaN', () => {
    expect(measureCaption(b(), spec({ op: 'distance', args: ['A', 'ghost'] }))).toBe('…');
    expect(measureCaption(b(), spec({ op: 'slope', args: ['tall'], label: 'm' }))).toBe('m = ∞');
    expect(measureCaption(b(), spec({ op: 'relativeCoordinates', args: ['O', 'O', 'B'], label: 'B' }))).toBe('…');
    expect(measureCaption(b(), spec({ op: 'coordinates', args: ['ghost'] }))).toBe('…');
    expect(measureCaption(b(), spec({ op: 'equationCircle', args: ['s'] }))).toBe('(x - 0.0)² + (y - 0.0)² = 1.0');
  });

  it('re-reads the board on every call', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movable: any = { X: () => 0, Y: () => 0 };
    const board2 = board({ A: movable, B: WORLD.B });
    const s = spec({ op: 'distance', args: ['A', 'B'] });
    expect(measureCaption(board2, s)).toBe('5.00');
    movable.X = () => 4;
    movable.Y = () => 3;
    expect(measureCaption(board2, s)).toBe('1.41');
  });

  it('swallows a broken parent rather than taking the board down', () => {
    const broken = { X: () => { throw new Error('no layout'); }, Y: () => 0 };
    const closure = measureClosure(board({ A: broken, B: WORLD.B }), spec({ op: 'distance', args: ['A', 'B'] }));
    expect(closure()).toBe('…');
  });
});

describe('the calculate measurement', () => {
  it('adds the numbers two other captions display', () => {
    const b1 = b();
    registerMeasure(b1, 'AB', { op: 'distance', args: ['A', 'B'], precision: 2 });
    registerMeasure(b1, 's', { op: 'length', args: ['s'], precision: 2 });
    expect(measureValue(b1, spec({ op: 'calculate', args: ['AB', 's'], expr: '#0+#1' }))).toBe(9);
  });

  it('reads the centimetres an operand shows, not the board units it was drawn in', () => {
    const b1 = b();
    // AB is 5 board units, which this document displays as 10 cm — and a
    // calculation of it has to use the 10 the reader sees.
    registerMeasure(b1, 'AB', { op: 'distance', args: ['A', 'B'], scale: 2 });
    expect(measureValue(b1, spec({ op: 'calculate', args: ['AB'], expr: '#0*3' }))).toBe(30);
  });

  it('calculates with a slider as happily as with a measurement', () => {
    expect(measureValue(b(), spec({ op: 'calculate', args: ['sl'], expr: '#0^2' }))).toBe(49);
  });

  it('writes the expression as the caption label, the way Sketchpad does', () => {
    const b1 = b();
    registerMeasure(b1, 'AB', { op: 'distance', args: ['A', 'B'] });
    registerMeasure(b1, 's', { op: 'length', args: ['s'] });
    expect(measureCaption(b1, spec({ op: 'calculate', args: ['AB', 's'], expr: '#0/#1', label: 'AB/s' })))
      .toBe('AB/s = 1.25');
  });

  it('keeps recalculating while the geometry moves', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movable: any = { X: () => 0, Y: () => 0 };
    const b1 = board({ A: movable, B: WORLD.B });
    registerMeasure(b1, 'AB', { op: 'distance', args: ['A', 'B'] });
    const closure = measureClosure(b1, spec({ op: 'calculate', args: ['AB'], expr: '#0*2', label: 'p' }));
    expect(closure()).toBe('p = 10.00');
    movable.X = () => 1;
    movable.Y = () => 0;
    expect(closure()).toBe('p = 8.94');
  });

  it('has no number when an operand has none', () => {
    const b1 = b();
    registerMeasure(b1, 'AB', { op: 'distance', args: ['A', 'ghost'] });
    expect(measureCaption(b1, spec({ op: 'calculate', args: ['AB'], expr: '#0+1', label: 'C1' }))).toBe('…');
    expect(measureCaption(b1, spec({ op: 'calculate', args: ['gone'], expr: '#0+1', label: 'C1' }))).toBe('…');
  });

  it('stops at a missing operand instead of recursing forever', () => {
    const b1 = b();
    // C2 is half of C1 and C1 is twice C2: a document should not be able to say
    // this, but saying it must not hang the page either.
    registerMeasure(b1, 'C1', { op: 'calculate', args: ['C2'], expr: '2*#0' });
    registerMeasure(b1, 'C2', { op: 'calculate', args: ['C1'], expr: '#0/2' });
    expect(measureValue(b1, spec({ op: 'calculate', args: ['C1'], expr: '#0+1' }))).toBeNull();
  });

  it('is the only op that needs an expression', () => {
    expect(measureValue(b(), spec({ op: 'calculate', args: [], label: 'C1' }))).toBeNull();
  });
});

describe('anchorClosures', () => {
  it('follows the midpoint of two elements plus its offsets', () => {
    const [x, y] = anchorClosures(b(), { of: ['A', 'B'], dx: 0.2, dy: 0.5 });
    expect(x()).toBeCloseTo(1.7, 6);
    expect(y()).toBeCloseTo(2.5, 6);
  });

  it('sits on a circle centre, pushed out by a radius factor', () => {
    const [x, y] = anchorClosures(b(), { of: ['c'], dx: 0, dy: 0.4, radiusFactor: 1.1 });
    expect(x()).toBeCloseTo(1 + 3 * 1.1, 6);
    expect(y()).toBeCloseTo(2.4, 6);
  });

  it('uses the centroid of a polygon and the middle of a segment', () => {
    expect(anchorClosures(b(), { of: ['tri'] })[0]()).toBeCloseTo(4 / 3, 6);
    expect(anchorClosures(b(), { of: ['tri'] })[1]()).toBe(1);
    expect(anchorClosures(b(), { of: ['s'] })[0]()).toBe(2);
  });

  it('returns zero while its anchor is missing', () => {
    expect(anchorClosures(b(), { of: ['ghost'], dx: 1 })[0]()).toBe(0);
  });

  it('keeps following a moved point', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const movable: any = { X: () => 0, Y: () => 0 };
    const [x] = anchorClosures(board({ A: movable, B: WORLD.B }), { of: ['A', 'B'] });
    expect(x()).toBeCloseTo(1.5, 6);
    movable.X = () => 5;
    expect(x()).toBeCloseTo(4, 6);
  });
});

describe('descriptor guards', () => {
  it('recognises a well-formed measure and anchor', () => {
    expect(isMeasureSpec({ op: 'distance', args: ['A', 'B'] })).toBe(true);
    expect(isMeasureSpec({ op: 'distance' })).toBe(false);
    expect(isMeasureSpec('function(){return 1}')).toBe(false);
    expect(isAnchorSpec({ of: ['A'] })).toBe(true);
    expect(isAnchorSpec({ of: 'A' })).toBe(false);
  });

  it('reports the ids a caption depends on', () => {
    const el = { attrs: { measure: { op: 'distance', args: ['A', 'B'] }, anchor: { of: ['A', 'B'] } } };
    expect(measureDeps(el)).toEqual(['A', 'B', 'A', 'B']);
    expect(measureDeps({})).toEqual([]);
  });
});
