// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement, type ElementSpec } from './elementRegistry';
import {
  LOCUS_SAMPLES, gliderPointAt, locusSamples, refreshLineLocuses, straightEnds,
} from './lineLocusModel';

/* eslint-disable @typescript-eslint/no-explicit-any */
let JXG: any;

beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'public/vendor/jsxgraph/jsxgraphcore.js'), 'utf8');
  new Function(src)();
  JXG = (globalThis as any).JXG;
  (window as any).matchMedia = vi.fn(() => ({
    matches: false, addEventListener: () => {}, removeEventListener: () => {},
  }));
});

afterAll(() => {
  JXG?.JSXGraph?.freeAllBoards?.();
});

function newBoard(): any {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, { boundingbox: [0, 0, 10, 10], axis: false, showGrid: false });
}

const spec = (over: Partial<ElementSpec> & { type: string }): ElementSpec => ({
  id: 'e1', parents: [], attrs: {}, ...over,
});

describe('a locus of a straight object', () => {
  /** Circle A through B, driver C on it, D fixed: the perpendicular bisector of CD. */
  function construction(samples: number) {
    const board = newBoard();
    const elMap: Record<string, unknown> = {};
    const build = (el: ElementSpec) => {
      const out = createElement(board, el, elMap);
      expect(out.error).toBeUndefined();
      elMap[el.id ?? ''] = out.obj;
      return out.obj;
    };
    build(spec({ type: 'point', id: 'A', parents: [3, 5] }));
    build(spec({ type: 'point', id: 'B', parents: [4, 5] }));
    build(spec({ type: 'circle', id: 'k', parents: ['A', 'B'] }));
    build(spec({ type: 'glider', id: 'C', parents: [4, 6, 'k'] }));
    build(spec({ type: 'point', id: 'D', parents: [9, 7] }));
    build(spec({ type: 'segment', id: 'CD', parents: ['C', 'D'] }));
    build(spec({ type: 'midpoint', id: 'E', parents: ['C', 'D'] }));
    build(spec({ type: 'perpendicular', id: 'perp', parents: ['CD', 'E'] }));
    const locus = build(spec({
      type: 'linelocus', id: 'fam', parents: ['C', 'perp'],
      attrs: { samples, strokeColor: '#000080' },
    }));
    board.update();
    return { board, locus, elMap };
  }

  it('draws one curve made of many separate lines', () => {
    const { locus } = construction(10);
    // two far points and a gap per sample
    expect(locus.numberPoints).toBe(30);
    expect(locus.points).toHaveLength(30);
    // the gaps are what keep the lines apart instead of joining them end to end
    expect(locus.points.filter((p: any) => Number.isNaN(p.usrCoords[1]))).toHaveLength(10);
  });

  it('sweeps a family, not the same line over and over', () => {
    const { locus } = construction(10);
    const first = [locus.points[0].usrCoords[1], locus.points[0].usrCoords[2]];
    const third = [locus.points[3].usrCoords[1], locus.points[3].usrCoords[2]];
    expect(Math.hypot(first[0] - third[0], first[1] - third[1])).toBeGreaterThan(1);
  });

  it('samples again when the driver or the figure moves', () => {
    const { board, locus, elMap } = construction(10);
    const before = locus.points[3].usrCoords.slice(1);
    (elMap.D as any).moveTo([8, 2]);
    board.update();
    expect(refreshLineLocuses(board)).toBe(true);
    board.update();
    const after = locus.points[3].usrCoords.slice(1);
    expect(Math.hypot(before[0] - after[0], before[1] - after[1])).toBeGreaterThan(1);
    // nothing moved on a second look, so nothing is recomputed
    expect(refreshLineLocuses(board)).toBe(false);
  });

  it('keeps the driver where the designer left it', () => {
    const { elMap } = construction(10);
    const C = elMap.C as any;
    const x = C.X();
    const y = C.Y();
    expect(Math.hypot(x - 4, y - 6)).toBeLessThan(1.5);
  });

  it('draws every stroke of a family that grew', () => {
    const { board, locus } = construction(10);
    expect(locus.numberPoints).toBe(30);
    // what Display | Number of Samples… and the + key do
    locus._locus.samples = 20;
    locus._locus.sig = '';
    expect(refreshLineLocuses(board)).toBe(true);
    board.update();
    expect(locus.numberPoints).toBe(60);
    expect(locus.points.filter((p: any) => Number.isNaN(p.usrCoords[1]))).toHaveLength(20);
  });

  it('draws a coarser bundle mid-drag without changing the curve’s length', () => {
    const { board, locus } = construction(10);
    expect(refreshLineLocuses(board, 2)).toBe(true);
    board.update();
    // same number of slots, half of them now gaps
    expect(locus.numberPoints).toBe(30);
    const gaps = locus.points.filter((p: any) => Number.isNaN(p.usrCoords[1])).length;
    expect(gaps).toBeGreaterThan(10);
    // the next full pass hands back every stroke
    expect(refreshLineLocuses(board)).toBe(true);
    board.update();
    expect(locus.points.filter((p: any) => Number.isNaN(p.usrCoords[1]))).toHaveLength(10);
  });
});

describe('the parts a locus is made of', () => {
  it('walks a driver round its circle', () => {
    const glider = {
      slideObject: { elementClass: 3, center: { X: () => 0, Y: () => 0 }, Radius: () => 2 },
    };
    expect(gliderPointAt(glider, 0)).toEqual([2, 0]);
    const quarter = gliderPointAt(glider, 0.25)!;
    expect(quarter[0]).toBeCloseTo(0, 6);
    expect(quarter[1]).toBeCloseTo(2, 6);
  });

  it('answers nothing for a driver that slides on nothing', () => {
    expect(gliderPointAt({ slideObject: null }, 0.5)).toBeNull();
  });

  it('trims a line to both sides of the page', () => {
    // y = 1 in user coordinates: a = 0, b = 1, c = -1
    const ends = straightEnds({ stdform: [-1, 0, 1] }, 5)!;
    expect(ends[0][0]).toBeCloseTo(-5, 6);
    expect(ends[1][0]).toBeCloseTo(5, 6);
    expect(ends[0][1]).toBeCloseTo(1, 6);
    expect(ends[1][1]).toBeCloseTo(1, 6);
  });

  it('refuses a line with no direction', () => {
    expect(straightEnds({ stdform: [0, 0, 0] }, 5)).toBeNull();
  });

  it('keeps a stored sample count inside something a page can draw', () => {
    expect(locusSamples({ samples: 12 })).toBe(12);
    expect(locusSamples({ samples: 0 })).toBe(2);
    expect(locusSamples({ samples: 9999 })).toBe(400);
    expect(locusSamples({})).toBe(LOCUS_SAMPLES);
  });
});
