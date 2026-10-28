import { describe, expect, it } from 'vitest';
import {
  arrowDragMap,
  imageClosures,
  imageDeps,
  isImageSpec,
  type ImageSpec,
} from './transforms';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pt = any;

/** A point whose position can be changed underneath the closures, like a drag does. */
function point(x: number, y: number): Pt {
  const p = {
    x, y,
    X: () => p.x,
    Y: () => p.y,
    moveTo: (nx: number, ny: number) => { p.x = nx; p.y = ny; },
  };
  return p;
}
const segment = (a: Pt, b: Pt): Pt => ({ point1: a, point2: b });

const WORLD: Record<string, Pt> = {
  A: point(2, 1),
  V1: point(0, 0),
  V2: point(3, 4),
  O: point(1, 1),
  L1: point(0, 0),
  L2: point(4, 0),
  mirror: segment(point(0, 0), point(4, 0)),
  steep: segment(point(0, 0), point(0, 5)),
  degenerate: segment(point(2, 2), point(2, 2)),
};
const board = (objects = WORLD): Pt => ({ objects });

const pos = (board: Pt, srcId: string, image: ImageSpec): [number, number] => {
  const [x, y] = imageClosures(board, srcId, image);
  return [x(), y()];
};

describe('isImageSpec / imageDeps', () => {
  it('recognises only a complete descriptor', () => {
    expect(isImageSpec({ op: 'rotate', of: ['O'], angle: 90 })).toBe(true);
    expect(isImageSpec({ op: 'translate', of: [] })).toBe(true);
    expect(isImageSpec({ op: 'translate' })).toBe(false);
    expect(isImageSpec({ of: ['O'] })).toBe(false);
    expect(isImageSpec('function(board){}')).toBe(false);
    expect(isImageSpec(null)).toBe(false);
  });

  it('lists the elements the map is taken with', () => {
    expect(imageDeps({ attrs: { image: { op: 'dilate', of: ['O'], k: 2 } } })).toEqual(['O']);
    expect(imageDeps({ attrs: {} })).toEqual([]);
  });
});

describe('imageClosures', () => {
  it('translates along a marked vector', () => {
    expect(pos(board(), 'A', { op: 'translate', of: ['V1', 'V2'] })).toEqual([5, 5]);
  });

  it('translates along a typed offset', () => {
    expect(pos(board(), 'A', { op: 'translate', of: [], dx: 2.5, dy: -1 })).toEqual([4.5, 0]);
  });

  it('omits an offset of nothing rather than moving nowhere by mistake', () => {
    expect(pos(board(), 'A', { op: 'translate', of: [] })).toEqual([2, 1]);
  });

  it('rotates about a marked centre, counter-clockwise', () => {
    const [x, y] = pos(board(), 'A', { op: 'rotate', of: ['O'], angle: 90 });
    expect(x).toBeCloseTo(1);
    expect(y).toBeCloseTo(2);
  });

  it('keeps a full turn at the source', () => {
    const [x, y] = pos(board(), 'A', { op: 'rotate', of: ['O'], angle: 360 });
    expect(x).toBeCloseTo(2);
    expect(y).toBeCloseTo(1);
  });

  it('dilates from a marked centre', () => {
    expect(pos(board(), 'A', { op: 'dilate', of: ['O'], k: 0.5 })).toEqual([1.5, 1]);
    expect(pos(board(), 'A', { op: 'dilate', of: ['O'], k: -1 })).toEqual([0, 1]);
  });

  it('reflects in a marked line', () => {
    expect(pos(board(), 'A', { op: 'reflect', of: ['mirror'] })).toEqual([2, -1]);
  });

  it('reflects in a vertical line', () => {
    const [x] = pos(board(), 'A', { op: 'reflect', of: ['steep'] });
    expect(x).toBeCloseTo(-2);
  });

  it('follows its source and its partners', () => {
    const b = board();
    const spec: ImageSpec = { op: 'dilate', of: ['O'], k: 2 };
    expect(pos(b, 'A', spec)).toEqual([3, 1]);
    WORLD.A.moveTo(4, 4);
    expect(pos(b, 'A', spec)).toEqual([7, 7]);
    WORLD.O.moveTo(0, 0);
    expect(pos(b, 'A', spec)).toEqual([8, 8]);
    WORLD.A.moveTo(2, 1);
    WORLD.O.moveTo(1, 1);
  });

  it('stays on the source when the map has nothing to read', () => {
    const empty = board({ A: WORLD.A });
    expect(pos(empty, 'A', { op: 'translate', of: ['V1', 'V2'] })).toEqual([2, 1]);
    expect(pos(empty, 'A', { op: 'rotate', of: ['O'], angle: 90 })).toEqual([2, 1]);
    expect(pos(empty, 'A', { op: 'dilate', of: ['O'], k: 3 })).toEqual([2, 1]);
    expect(pos(empty, 'A', { op: 'reflect', of: ['mirror'] })).toEqual([2, 1]);
  });

  it('stays on the source for a mirror whose endpoints coincide', () => {
    expect(pos(board(), 'A', { op: 'reflect', of: ['degenerate'] })).toEqual([2, 1]);
  });

  it('stays put rather than throwing when the source itself is gone', () => {
    const b = board({});
    const [x, y] = imageClosures(b, 'ghost', { op: 'translate', of: [], dx: 1, dy: 1 });
    expect([x(), y()]).toEqual([0, 0]);
  });

  it('is an identity for an op it does not know', () => {
    expect(pos(board(), 'A', { op: 'shear' as ImageSpec['op'], of: [] })).toEqual([2, 1]);
  });
});

describe('dilating by a marked ratio', () => {
  it('reads the second marked segment over the first, as the desktop does', () => {
    const image = (segments: [string, string]): ImageSpec =>
      ({ op: 'dilate', of: ['O'], ratioMark: { segments } });
    expect(pos(board(), 'A', image(['mirror', 'steep']))).toEqual([2.25, 1]);
    expect(pos(board(), 'A', image(['steep', 'mirror']))).toEqual([1.8, 1]);
  });

  it('follows the segments while they move', () => {
    const world = {
      A: point(2, 1),
      O: point(1, 1),
      one: segment(point(0, 0), point(2, 0)),
      two: segment(point(0, 0), point(1, 0)),
    };
    const b = board(world);
    const image: ImageSpec = { op: 'dilate', of: ['O'], ratioMark: { segments: ['one', 'two'] } };
    expect(pos(b, 'A', image)).toEqual([1.5, 1]);
    world.two.point2.moveTo(4, 0);
    expect(pos(b, 'A', image)).toEqual([3, 1]);
  });

  it('takes a parameter or a measurement as the factor itself', () => {
    const world = { A: point(2, 1), O: point(1, 1), k: { Value: () => 3 }, s: segment(point(0, 0), point(0, 4)) };
    const b = board(world);
    expect(pos(b, 'A', { op: 'dilate', of: ['O'], ratioMark: { slider: 'k' } })).toEqual([4, 1]);
    expect(pos(b, 'A', { op: 'dilate', of: ['O'], ratioMark: { measure: { op: 'length', args: ['s'] } } })).toEqual([5, 1]);
  });

  it('stays on the source when the ratio cannot be read', () => {
    const world = { A: point(2, 1), O: point(1, 1), zero: segment(point(1, 1), point(1, 1)) };
    const b = board(world);
    expect(pos(b, 'A', { op: 'dilate', of: ['O'], ratioMark: { segments: ['zero', 'zero'] } })).toEqual([2, 1]);
    expect(pos(b, 'A', { op: 'dilate', of: ['O'], ratioMark: { measure: { op: 'length', args: ['gone'] } } })).toEqual([2, 1]);
  });

  it('hangs off the segments it reads, not only the centre', () => {
    expect(imageDeps({
      attrs: { image: { op: 'dilate', of: ['O'], ratioMark: { segments: ['s1', 's2'] } } },
    })).toEqual(['O', 's1', 's2']);
    expect(imageDeps({
      attrs: { image: { op: 'dilate', of: ['O'], ratioMark: { slider: 'k' } } },
    })).toEqual(['O', 'k']);
  });
});

/**
 * The rotate and dilate arrows move the whole selection from one map, measured
 * from where the pointer went down. Everything a drag gets wrong — compounding,
 * stuttering across the half-turn, dividing by zero — shows up here.
 */
describe('arrowDragMap', () => {
  it('carries the pointer travel to every point of the group', () => {
    const map = arrowDragMap('translate', null, [1, 1], [3, -1]);
    expect(map(0, 0)).toEqual([2, -2]);
    expect(map(5, 5)).toEqual([7, 3]);
  });

  it('moves nothing while the translate pointer is where it started', () => {
    expect(arrowDragMap('translate', null, [4, 4], [4, 4])(9, -2)).toEqual([9, -2]);
  });

  it('turns the selection by the angle the pointer travelled', () => {
    const [x, y] = arrowDragMap('rotate', [0, 0], [2, 0], [0, 2])(2, 0);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(2);
  });

  it('keeps every point at its distance from the marked centre', () => {
    const map = arrowDragMap('rotate', [0, 0], [1, 0], [-0.5, 0.8660254]);
    expect(Math.hypot(...map(3, 4))).toBeCloseTo(5);
  });

  it('leaves the marked centre where it was', () => {
    expect(arrowDragMap('rotate', [1, 1], [3, 1], [1, 3])(1, 1)).toEqual([1, 1]);
    expect(arrowDragMap('dilate', [1, 1], [3, 1], [5, 1])(1, 1)).toEqual([1, 1]);
  });

  it('does not stutter when the pointer crosses the half-turn line', () => {
    const [x, y] = arrowDragMap('rotate', [0, 0], [-2, -0.001], [-2, 0.001])(3, 0);
    expect(x).toBeCloseTo(3);
    expect(y).toBeCloseTo(0);
  });

  it('is the identity while the pointer is where it started', () => {
    const [x, y] = arrowDragMap('rotate', [2, 5], [7, 5], [7, 5])(4, 9);
    expect(x).toBeCloseTo(4);
    expect(y).toBeCloseTo(9);
  });

  it('scales by the ratio of the two pointer distances', () => {
    expect(arrowDragMap('dilate', [0, 0], [2, 0], [5, 0])(2, 2)).toEqual([5, 5]);
    expect(arrowDragMap('dilate', [1, 1], [5, 1], [2, 1])(9, 1)).toEqual([3, 1]);
  });

  it('takes the distance from the centre, not the direction of travel', () => {
    // pointer moved a quarter turn at the same radius: nothing grows
    expect(arrowDragMap('dilate', [0, 0], [2, 0], [0, 2])(4, 0)).toEqual([4, 0]);
  });

  it('refuses to divide by zero when the grab is on the centre', () => {
    expect(arrowDragMap('dilate', [0, 0], [0, 0], [3, 4])(1, 1)).toEqual([1, 1]);
  });
});
