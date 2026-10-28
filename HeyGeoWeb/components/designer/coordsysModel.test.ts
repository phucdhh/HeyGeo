import { describe, expect, it } from 'vitest';
import {
  coordsysOf,
  defaultFrame,
  frameElements,
  framePoints,
  frameSelection,
  graphRows,
  hasCoordsys,
  isCoordsysSpec,
  originCarriesUnit,
  verticalElement,
  withGrid,
} from './coordsysModel';
import type { HeyGeoElement } from './designTypes';

const point = (id: string, x: number, y: number, attrs: Record<string, unknown> = {}): HeyGeoElement => ({
  type: 'point', id, parents: [x, y], attrs: { name: id, ...attrs },
});

const anything = (type: string, id: string, parents: HeyGeoElement['parents'] = [], attrs: Record<string, unknown> = {}): HeyGeoElement => ({
  type, id, parents, attrs,
});

const FRAME = frameElements(defaultFrame('O', 'U', 'O', 'U'), []);
const IDS = FRAME.map((e) => e.id);

describe('a frame marked on its origin', () => {
  it('reads the mark back out of the document', () => {
    expect(coordsysOf(FRAME)).toEqual({
      origin: 'O', unit: 'U', grid: 'square', showGrid: false, snap: false,
    });
    expect(hasCoordsys(FRAME)).toBe(true);
  });

  it('has no frame until one is marked', () => {
    expect(coordsysOf([point('A', 1, 2)])).toBeNull();
    expect(hasCoordsys([])).toBe(false);
  });

  it('loses the frame when either of its points is gone', () => {
    // a caption has no scale without its unit point, and JSXGraph's cascade has
    // already taken the axes away with the origin
    expect(coordsysOf(FRAME.filter((e) => e.id !== 'U'))).toBeNull();
    expect(coordsysOf(FRAME.filter((e) => e.id !== 'O'))).toBeNull();
  });

  it('refuses a mark that points at itself', () => {
    expect(isCoordsysSpec({ unit: 'O' })).toBe(true);
    expect(coordsysOf([point('O', 0, 0, { coordsys: { unit: 'O' } })])).toBeNull();
  });

  it('takes the first frame when a document somehow holds two', () => {
    const two = [
      point('O', 0, 0, { coordsys: { unit: 'U' } }), point('U', 1, 0),
      point('P', 2, 2, { coordsys: { unit: 'Q' } }), point('Q', 3, 2),
    ];
    expect(coordsysOf(two)).toEqual({
      origin: 'O', unit: 'U', grid: 'square', showGrid: false, snap: false,
    });
  });

  it('reads the grid settings the document states, and the defaults it leaves out', () => {
    const drawn = [
      point('O', 0, 0, { coordsys: { unit: 'U', grid: 'polar', showGrid: true, snap: true } }),
      point('U', 1, 0),
    ];
    expect(coordsysOf(drawn)).toMatchObject({ grid: 'polar', showGrid: true, snap: true });
    // a form no grid has is a typo, not a frame the designer asked for
    const mistyped = [
      point('O', 0, 0, { coordsys: { unit: 'U', grid: 'hexagonal', showGrid: 'yes' } }),
      point('U', 1, 0),
    ];
    expect(coordsysOf(mistyped)).toMatchObject({ grid: 'square', showGrid: false });
  });
});

describe('the elements a frame is made of', () => {
  it('lists origin, unit, y-direction point and the two axes in build order', () => {
    expect(IDS).toEqual(['O', 'U', 'O_v', 'O_x', 'O_y']);
    expect(FRAME[0].attrs.coordsys).toEqual({ unit: 'U' });
    expect(FRAME[3].parents).toEqual(['O', 'U']);
    expect(FRAME[4].parents).toEqual(['O', 'O_v']);
  });

  it('derives the y-direction from the unit point, a quarter turn about the origin', () => {
    expect(FRAME[2].attrs.image).toEqual({ op: 'rotate', of: ['O'], angle: 90 });
    expect(FRAME[2].parents).toEqual(['U']);
    expect(FRAME[2].attrs.visible).toBe(false);
  });

  it('keeps a point the designer already had and only marks it', () => {
    const picked = [point('A', 2, 3, { name: 'A', size: 6, strokeColor: '#c83c3c' }), point('B', 4, 3)];
    const [origin, unit] = frameElements(
      { origin: { id: 'A', name: 'ignored', coords: [9, 9] }, unit: { id: 'B', name: 'ignored', coords: [9, 9] } },
      picked,
    );
    expect(origin.attrs.name).toBe('A');
    expect(origin.attrs.size).toBe(6);
    expect(origin.parents).toEqual([2, 3]);
    expect(origin.attrs.coordsys).toEqual({ unit: 'B' });
    // the existing unit keeps its own place too: a frame defined on two points the
    // designer drew is measured from where they are
    expect(unit.parents).toEqual([4, 3]);
    expect(unit.attrs.coordsys).toBeUndefined();
  });

  it('defaults to an origin in the middle of the page with its unit one away', () => {
    const [origin, unit] = FRAME;
    expect(origin.parents).toEqual([0, 0]);
    expect(unit.parents).toEqual([1, 0]);
  });
});

/** A board that has been dragged: positions the document has not caught up with. */
const dragged = (positions: Record<string, [number, number]>) =>
  (id: string) => {
    const p = positions[id];
    return p && { X: () => p[0], Y: () => p[1] };
  };

describe('the Graph menu over a selection', () => {
  const PLAIN = [
    point('A', 0, 0), point('B', 2, 0),
    anything('circle', 'k', ['A', 'B']),
    anything('slider', 's', [[0, 0], [1, 0], [0, 5, 10]]),
  ];

  it('marks the points the designer picked, in pick order', () => {
    expect(frameSelection(PLAIN, ['A', 'B'])).toEqual(['A', 'B']);
    expect(frameSelection(PLAIN, ['B', 'A'])).toEqual(['B', 'A']);
    // a point however it was built is still a place an origin can sit
    expect(frameSelection([...PLAIN, anything('glider', 'G', [1, 1, 'k'])], ['G']))
      .toEqual(['G']);
  });

  it('defines nothing from a shape, from three points, or from nothing', () => {
    expect(frameSelection(PLAIN, ['k'])).toEqual([]);
    expect(frameSelection(PLAIN, ['A', 'k'])).toEqual([]);
    expect(frameSelection(PLAIN, ['A', 'B', 'B'])).toEqual([]);
    expect(frameSelection(PLAIN, [])).toEqual([]);
    // a slider is a number, not a place
    expect(frameSelection(PLAIN, ['s'])).toEqual([]);
  });

  it('offers both items while no frame is marked and the points are picked', () => {
    expect(graphRows(PLAIN, ['A', 'B'])).toEqual({
      canNew: true, canDefine: true, canGrid: false, grid: 'square', showGrid: false, snap: false,
    });
    expect(graphRows(PLAIN, ['A']).canDefine).toBe(true);
    expect(graphRows(PLAIN, []).canDefine).toBe(false);
    expect(graphRows(PLAIN, ['k']).canDefine).toBe(false);
    // the desktop greys the grid group out with the same gate: a grid is a frame's
    expect(graphRows(PLAIN, []).canGrid).toBe(false);
  });

  it('offers neither once a frame is marked: one system at a time, as in Sketchpad', () => {
    // to redefine it the designer drags its points, or deletes the frame first
    const rows = graphRows(FRAME, ['A', 'B']);
    expect(rows).toMatchObject({ canNew: false, canDefine: false, canGrid: true });
    expect(rows.grid).toBe('square');
  });

  it('shows the grid the frame already has, for the checkmarks', () => {
    const framed = withGrid(FRAME, { grid: 'trig', showGrid: true }, () => [0, 1])!;
    expect(graphRows(framed, [])).toMatchObject({
      canGrid: true, grid: 'trig', showGrid: true, snap: false,
    });
  });
});

describe('the point that gives the y-axis its direction', () => {
  it('is welded to the unit point in every form but a rectangular one', () => {
    for (const form of ['square', 'polar', 'trig'] as const) {
      const v = verticalElement('O', 'U', form, [0, 1]);
      expect(v.parents, form).toEqual(['U']);
      expect(v.attrs.image, form).toEqual({ op: 'rotate', of: ['O'], angle: 90 });
      expect(v.attrs.visible, form).toBe(false);
      expect(v.attrs.fixed, form).toBe(true);
    }
  });

  it('becomes a point the designer can drag in a rectangular frame', () => {
    // the desktop shows this point only for Rectangular Grid, and its distance
    // from the origin is what sets the y spacing
    const v = verticalElement('O', 'U', 'rectangular', [0, 2]);
    expect(v.parents).toEqual([0, 2]);
    expect(v.attrs.image).toBeUndefined();
    expect(v.attrs.visible).toBe(true);
    expect(v.attrs.fixed).toBe(false);
  });

  it('stays welded until the board says where it stands', () => {
    const v = verticalElement('O', 'U', 'rectangular', null);
    expect(v.parents).toEqual(['U']);
  });
});

describe('changing the grid of a frame', () => {
  const live = (id: string) => (id === 'O_v' ? ([0, 2] as [number, number]) : null);

  it('rewrites the mark in full and leaves every other element alone', () => {
    const next = withGrid(FRAME, { showGrid: true }, live)!;
    expect(next).toHaveLength(FRAME.length);
    expect(next[0].attrs.coordsys).toEqual({ unit: 'U', grid: 'square', showGrid: true, snap: false });
    expect(next[1]).toBe(FRAME[1]);
    expect(next[3]).toBe(FRAME[3]);
  });

  it('changes only the shape of the y-direction point, and only for rectangular', () => {
    const rect = withGrid(FRAME, { grid: 'rectangular' }, live)!;
    expect(rect[2].parents).toEqual([0, 2]);
    expect(rect[2].attrs.visible).toBe(true);

    // going back welds it to the unit point again, so the axes are square
    const square = withGrid(rect, { grid: 'square' }, live)!;
    expect(square[2].parents).toEqual(['U']);
    expect(square[2].attrs.image).toEqual({ op: 'rotate', of: ['O'], angle: 90 });
  });

  it('says nothing when the settings already read that way', () => {
    expect(withGrid(FRAME, { grid: 'square' }, live)).toBeNull();
    expect(withGrid(FRAME, { showGrid: false, snap: false }, live)).toBeNull();
  });

  it('has no grid to change on a board with no frame', () => {
    expect(withGrid([point('A', 0, 0)], { showGrid: true }, live)).toBeNull();
  });
});

describe('dragging the origin', () => {
  it('carries the unit point by the same travel', () => {
    const moved = originCarriesUnit(FRAME, dragged({ O: [2, 1], U: [3, 0] }), 'O');
    expect(moved).toEqual({ id: 'U', coords: [3, 1] });
  });

  it('has nothing to carry while the origin stays where it was', () => {
    expect(originCarriesUnit(FRAME, dragged({ O: [0, 0], U: [1, 0] }), 'O')).toBeNull();
  });

  it('does not move the unit point twice when the whole selection travelled', () => {
    // a group drag has already put the unit where a rigid frame wants it
    expect(originCarriesUnit(FRAME, dragged({ O: [2, 1], U: [3, 1] }), 'O')).toBeNull();
  });

  it('leaves a dragged unit point alone: that is the designer rescaling the frame', () => {
    expect(originCarriesUnit(FRAME, dragged({ O: [0, 0], U: [4, 0] }), 'U')).toBeNull();
  });

  it('does not follow a point the document cannot place, like a midpoint origin', () => {
    const derived = [
      point('A', 0, 0), point('B', 2, 0),
      { type: 'midpoint', id: 'M', parents: ['A', 'B'], attrs: { coordsys: { unit: 'U' } } },
      point('U', 1, 0),
    ];
    expect(originCarriesUnit(derived, dragged({ M: [1, 2], U: [1, 0] }), 'M')).toBeNull();
  });

  it('is quiet on a board with no frame', () => {
    expect(originCarriesUnit([point('A', 0, 0)], dragged({ A: [1, 1] }), 'A')).toBeNull();
  });
});

describe('the three points a plot is measured against', () => {
  it('names the origin, its unit point and the point that gives the y direction', () => {
    expect(framePoints(FRAME)).toEqual(['O', 'U', 'O_v']);
  });

  it('has none without a marked frame, nor with a frame missing its y direction', () => {
    expect(framePoints([point('A', 0, 0), point('U', 1, 0)])).toBeNull();
    // a hand-written document that marks a frame but never draws it has nothing
    // to read a curve's y spacing from
    expect(framePoints(FRAME.filter((e) => e.id !== 'O_v'))).toBeNull();
  });
});
