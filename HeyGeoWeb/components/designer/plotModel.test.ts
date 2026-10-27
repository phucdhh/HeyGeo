import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DOMAIN,
  PLOT_SAMPLES,
  frameToBoard,
  functionPlot,
  isPlotSpec,
  plotAt,
  plotParents,
  plotProblem,
  type PlotSpec,
} from './plotModel';
import type { FrameGeometry } from './gridModel';

// the frame the grid tests use: its origin at board (2, 3), one board unit to a
// unit, so the frame's (1, 1) is the board's (3, 4)
const SQUARE: FrameGeometry = { origin: [2, 3], xUnit: 1, yUnit: 1 };
// the same origin with a short x unit and a long y one, as a rectangular frame has
const WIDE: FrameGeometry = { origin: [2, 3], xUnit: 0.5, yUnit: 2 };

const curve = (x: string, y: string, variable: 'x' | 't' = 'x'): PlotSpec => ({
  x, y, variable, from: -5, to: 5,
});

/** Where a point lands, read with the tolerance trigonometry leaves behind. */
function near(point: [number, number] | null, x: number, y: number): void {
  expect(point).not.toBeNull();
  expect(point?.[0]).toBeCloseTo(x, 9);
  expect(point?.[1]).toBeCloseTo(y, 9);
}

describe('a typed curve on a marked frame', () => {
  it('puts each frame coordinate where that frame says it is', () => {
    expect(frameToBoard(SQUARE, [1, 1])).toEqual([3, 4]);
    // the identity curve runs along the frame's own axes, not the page's
    expect(plotAt(curve('x', 'x'), SQUARE, 2)).toEqual([4, 5]);
    expect(plotAt(curve('x', 'x'), SQUARE, -3)).toEqual([-1, 0]);
  });

  it('draws f(x) = x² − 2 through the frame', () => {
    const f = functionPlot('x^2-2');
    expect(f.x).toBe('x');
    expect(plotAt(f, SQUARE, 0)).toEqual([2, 1]);
    expect(plotAt(f, SQUARE, 3)).toEqual([5, 10]);
    // its roots sit on the axis, one unit point's distance either side of origin
    near(plotAt(f, SQUARE, Math.SQRT2), 2 + Math.SQRT2, 3);
  });

  it('scales each axis by its own unit', () => {
    expect(plotAt(curve('x', 'x'), WIDE, 2)).toEqual([3, 7]);
  });

  it('follows the frame it was drawn on', () => {
    const f = functionPlot('x');
    const moved: FrameGeometry = { origin: [5, 5], xUnit: 1, yUnit: 1 };
    const doubled: FrameGeometry = { origin: [2, 3], xUnit: 2, yUnit: 2 };
    expect(plotAt(f, moved, 1)).toEqual([6, 6]);
    expect(plotAt(f, doubled, 1)).toEqual([4, 5]);
  });

  it('has no point where the expression has no number', () => {
    // the desktop skips these samples and breaks its polyline between them
    expect(plotAt(functionPlot('1/x'), SQUARE, 0)).toBeNull();
    expect(plotAt(functionPlot('1/x'), SQUARE, 2)).toEqual([4, 3.5]);
    expect(plotAt(functionPlot('sqrt(x)'), SQUARE, -4)).toBeNull();
    expect(plotAt(functionPlot('sqrt(x)'), SQUARE, 4)).toEqual([6, 5]);
  });

  it('draws nothing on a frame that has no length in it', () => {
    const flat: FrameGeometry = { origin: [2, 3], xUnit: 0, yUnit: 0 };
    expect(plotAt(functionPlot('x'), flat, 1)).toBeNull();
  });

  it('reads a parametric curve in its own variable', () => {
    const circle = curve('cos(t)', 'sin(t)', 't');
    expect(plotAt(circle, SQUARE, 0)).toEqual([3, 3]);
    near(plotAt(circle, SQUARE, Math.PI / 2), 2, 4);
    expect(plotProblem(circle)).toBeNull();
  });

  it('knows pi, e and the units, and nothing the designer did not type', () => {
    expect(plotAt(functionPlot('pi'), SQUARE, 0)).toEqual([2, 3 + Math.PI]);
    expect(plotAt(functionPlot('2x'), SQUARE, 3)).toEqual([5, 9]);
    // a typed curve holds no references to other elements
    expect(plotAt(functionPlot('#0'), SQUARE, 1)).toBeNull();
  });

  it('opens with the domain and sampling the desktop dialog shows', () => {
    expect(DEFAULT_DOMAIN).toEqual([-5, 5]);
    expect(PLOT_SAMPLES).toBe(300);
    const f = functionPlot('x^2');
    expect([f.from, f.to]).toEqual([-5, 5]);
    expect(functionPlot('x^2', [-1, 1]).to).toBe(1);
  });
});

describe('the reason a curve cannot be drawn', () => {
  it('is empty for a curve that reads only its own variable', () => {
    expect(plotProblem(functionPlot('x^2-2'))).toBeNull();
    expect(plotProblem(curve('cos(t)', 'sin(t)', 't'))).toBeNull();
  });

  it('names a variable the curve does not have', () => {
    expect(plotProblem(curve('x', 'y^2'))).toContain('y');
    expect(plotProblem(curve('t', 'x', 't'))).toContain('x');
    expect(plotProblem(curve('x', 'window'))).toContain('window');
  });

  it('is not a domain that runs backwards', () => {
    expect(plotProblem({ ...curve('x', 'x'), from: 5, to: 5 })).toContain('miền');
    expect(plotProblem({ ...curve('x', 'x'), from: 5, to: -5 })).toContain('miền');
  });
});

describe('a curve read back from a document', () => {
  it('accepts what a document writes and nothing that only looks like it', () => {
    expect(isPlotSpec(functionPlot('x'))).toBe(true);
    expect(isPlotSpec(curve('cos(t)', 'sin(t)', 't'))).toBe(true);
    expect(isPlotSpec(null)).toBe(false);
    expect(isPlotSpec('x^2')).toBe(false);
    expect(isPlotSpec({ x: 'x', y: 'x', variable: 'y', from: -1, to: 1 })).toBe(false);
    expect(isPlotSpec({ x: 'x', y: 'x', variable: 'x', from: -1 })).toBe(false);
    expect(isPlotSpec({ x: 1, y: 2, variable: 'x', from: -1, to: 1 })).toBe(false);
  });
});

describe('the parents a plot is built from', () => {
  /** A point of a frame, as the board holds it: movable, and read where it stands. */
  function point(at: [number, number]): { X: () => number; Y: () => number; move: (x: number, y: number) => void } {
    let [x, y] = at;
    return { X: () => x, Y: () => y, move: (nx, ny) => { x = nx; y = ny; } };
  }

  /** The frame's three points, in the order a plot names them. */
  const square = () => [point([2, 3]), point([3, 3]), point([2, 4])];

  it('is the curve itself, sampled as two functions over its domain', () => {
    const [x, y, from, to] = plotParents(square(), functionPlot('x^2-2'));
    expect(from).toBe(-5);
    expect(to).toBe(5);
    expect([x(3), y(3)]).toEqual([5, 10]);
    expect([x(0), y(0)]).toEqual([2, 1]);
  });

  it('follows the frame while it is being dragged', () => {
    const [origin, unit, vertical] = square();
    const [x, y] = plotParents([origin, unit, vertical], functionPlot('x'));
    expect([x(2), y(2)]).toEqual([4, 5]);
    // dragging the unit point out to twice its reach re-scales the curve…
    unit.move(4, 3);
    expect([x(2), y(2)]).toEqual([6, 5]);
    // …and dragging the whole frame, which is what the origin does, carries it
    unit.move(5, 5);
    origin.move(4, 5);
    vertical.move(4, 6);
    expect([x(2), y(2)]).toEqual([6, 7]);
  });

  it('reads a rectangular frame along its own y axis', () => {
    const [x, y] = plotParents([point([0, 0]), point([1, 0]), point([0, 2])], functionPlot('x'));
    expect([x(1), y(1)]).toEqual([1, 2]);
  });

  it('has no number for a sample the expression cannot answer', () => {
    const [x, y] = plotParents(square(), functionPlot('1/x'));
    expect(x(0)).toBeNaN();
    expect(y(0)).toBeNaN();
    expect(y(2)).toBe(3.5);
  });

  it('draws nothing rather than throwing when a frame point is gone', () => {
    const [x, y] = plotParents([point([2, 3]), null, point([2, 4])], functionPlot('x'));
    expect(x(1)).toBeNaN();
    expect(y(1)).toBeNaN();
  });
});
