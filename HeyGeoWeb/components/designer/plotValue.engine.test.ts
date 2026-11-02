// @vitest-environment jsdom
/**
 * Graph | Plot Value on Path, on a real board: the point is placed by the number
 * it reads, and it goes on reading that number after the page moves under it.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyScene, takeScene } from './sceneModel';
import { syncPlotValues } from './elementRegistry';
import { numberValueOf } from './measurement';
import type { HeyGeoElement } from './designTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
let JXG: any;

function newBoard(): any {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '600px';
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, {
    boundingbox: [-8, 8, 8, -8], showCopyright: false, showNavigation: false,
    axis: false, grid: false,
  });
}

beforeAll(() => {
  const src = readFileSync(resolve(process.cwd(), 'public/vendor/jsxgraph/jsxgraphcore.js'), 'utf8');
  new Function(src)();
  JXG = (globalThis as any).JXG;
  (window as any).matchMedia = vi.fn(() => ({
    matches: false, addEventListener: () => {}, removeEventListener: () => {},
  }));
});

const el = (over: Partial<HeyGeoElement> & { type: string; id: string }): HeyGeoElement => ({
  parents: [], attrs: {}, ...over,
});

const build = (elements: HeyGeoElement[]) => {
  const board = newBoard();
  const out = applyScene(board, takeScene(elements, { axis: false, grid: false }));
  board.update();
  return { board, out };
};

describe('a value plotted on a path', () => {
  // the segment to plot along, and a second one whose length is the number
  const scene = (): HeyGeoElement[] => [
    el({ type: 'point', id: 'A', parents: [-3, -3] }),
    el({ type: 'point', id: 'B', parents: [3, -3] }),
    el({ type: 'segment', id: 's', parents: ['A', 'B'] }),
    el({ type: 'point', id: 'C', parents: [0, 2] }),
    el({ type: 'point', id: 'D', parents: [2, 2] }),
    el({ type: 'segment', id: 't', parents: ['C', 'D'] }),
    el({ type: 'text', id: 'len', parents: [0, 4, ''], attrs: { measure: { op: 'length', args: ['t'] } } }),
    el({
      type: 'glider', id: 'P', parents: [0, 0, 's'],
      attrs: {
        name: 'P',
        // the reading is a sixth of the second segment: a third of the way along
        plotValue: { value: '#0/6', args: ['len'], path: 's', kind: 'segment' },
      },
    }),
  ];

  const follow = (board: any, placed: Map<string, number>) => {
    if (syncPlotValues(board, scene(), placed, (id) => numberValueOf(board, id))) board.update();
  };

  it('places the point where the reading falls along the segment', () => {
    const { board, out } = build(scene());
    expect(out.errors).toEqual([]);
    // a length of 2 over a 6-unit span is a third of the way from A to B
    expect(board.objects.P.X()).toBeCloseTo(-3 + (2 / 6) * 6, 6);
    expect(board.objects.P.Y()).toBeCloseTo(-3, 6);
  });

  it('moves the point when the number it reads changes', () => {
    const { board } = build(scene());
    const placed = new Map<string, number>();
    follow(board, placed);
    expect(board.objects.P.X()).toBeCloseTo(-1, 6);
    // the second segment grows to 4 units, so the reading is a larger share
    board.objects.D.moveTo([4, 2]);
    board.update();
    follow(board, placed);
    expect(board.objects.P.X()).toBeCloseTo(-3 + (4 / 6) * 6, 6);
  });

  it('leaves a point the designer dragged until the number moves again', () => {
    const { board } = build(scene());
    const placed = new Map<string, number>();
    follow(board, placed);
    board.objects.P.moveTo([2, -3]);
    board.update();
    follow(board, placed);
    expect(board.objects.P.X()).toBeCloseTo(2, 6);
  });
});
