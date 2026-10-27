import { describe, expect, it } from 'vitest';
import {
  coordsysOf,
  coordsysRows,
  defaultFrame,
  frameElements,
  frameSelection,
  hasCoordsys,
  isCoordsysSpec,
  originCarriesUnit,
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
    expect(coordsysOf(FRAME)).toEqual({ origin: 'O', unit: 'U' });
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
    expect(coordsysOf(two)).toEqual({ origin: 'O', unit: 'U' });
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
    expect(coordsysRows(PLAIN, ['A', 'B'])).toEqual({ canNew: true, canDefine: true });
    expect(coordsysRows(PLAIN, ['A'])).toEqual({ canNew: true, canDefine: true });
    expect(coordsysRows(PLAIN, [])).toEqual({ canNew: true, canDefine: false });
    expect(coordsysRows(PLAIN, ['k'])).toEqual({ canNew: true, canDefine: false });
  });

  it('offers neither once a frame is marked: one system at a time, as in Sketchpad', () => {
    // to redefine it the designer drags its points, or deletes the frame first
    expect(coordsysRows(FRAME, ['A', 'B'])).toEqual({ canNew: false, canDefine: false });
  });
});

describe('dragging the origin', () => {  it('carries the unit point by the same travel', () => {
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
