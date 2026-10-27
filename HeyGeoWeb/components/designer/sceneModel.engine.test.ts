// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  applyScene,
  findObjectsAt,
  planScene,
  polygonElements,
  setSceneChrome,
  syncPositions,
  takeScene,
  type SceneSnapshot,
} from './sceneModel';
import type { HeyGeoElement } from './designTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
let JXG: any;
function newBoard(opts: Record<string, unknown> = {}) {
  const div = document.createElement('div');
  // jsdom lays nothing out, so the board needs its size written on it; without
  // this every screen coordinate JSXGraph computes is zero.
  div.style.width = '800px';
  div.style.height = '600px';
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, {
    boundingbox: [-8, 8, 8, -8],
    showCopyright: false,
    showNavigation: false,
    ...opts,
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

/** A triangle plus a midline: points, segments and a derived point. */
const triangle = (): HeyGeoElement[] => [
  el({ type: 'point', id: 'A', parents: [0, 0], attrs: { name: 'A' } }),
  el({ type: 'point', id: 'B', parents: [4, 0], attrs: { name: 'B' } }),
  el({ type: 'point', id: 'C', parents: [1, 3], attrs: { name: 'C' } }),
  el({ type: 'segment', id: 'sAB', parents: ['A', 'B'], attrs: { strokeColor: '#1e3c96' } }),
  el({ type: 'segment', id: 'sBC', parents: ['B', 'C'], attrs: { strokeColor: '#1e3c96' } }),
  el({ type: 'midpoint', id: 'mAC', parents: ['A', 'C'], attrs: { name: 'M' } }),
];

const snap = (elements: HeyGeoElement[], meta = { axis: false, grid: false }): SceneSnapshot =>
  takeScene(elements, meta);

/** Mirror of the designer: load a document, then hand back board + snapshot. */
function load(board: any, elements: HeyGeoElement[]) {
  const out = applyScene(board, snap(elements));
  expect(out.errors).toEqual([]);
  return out;
}

describe('undo against the real engine', () => {
  it('builds a document without a plan, in construction order', () => {
    const b = newBoard();
    const out = load(b, triangle());
    expect(out.createdIds).toEqual(['A', 'B', 'C', 'sAB', 'sBC', 'mAC']);
    expect(b.objects.mAC.X()).toBeCloseTo(0.5);
  });

  it('recolouring leaves every board object where it is', () => {
    const b = newBoard();
    load(b, triangle());
    const mBefore = b.objects.mAC;
    const target = snap(triangle().map((e) => (e.id === 'sAB'
      ? el({ type: 'segment', id: 'sAB', parents: ['A', 'B'], attrs: { strokeColor: '#c83c3c' } })
      : e)));
    const out = applyScene(b, target, planScene(snap(triangle()), target));
    expect(out.createdIds).toEqual([]);
    expect(b.objects.sAB.visProp.strokecolor).toBe('#c83c3c');
    // the untouched midpoint is still the same live object, not a copy
    expect(b.objects.mAC).toBe(mBefore);
    expect(b.objects.mAC.X()).toBeCloseTo(0.5);
  });

  it('moves a dragged point in place', () => {
    const b = newBoard();
    load(b, triangle());
    const mBefore = b.objects.mAC;
    const prev = snap(triangle());
    const next = snap(triangle().map((e) => (e.id === 'A' ? el({ type: 'point', id: 'A', parents: [2, 2], attrs: { name: 'A' } }) : e)));
    const plan = planScene(prev, next);
    expect(plan.moves).toEqual([{ id: 'A', coords: [2, 2] }]);
    const out = applyScene(b, next, plan);
    expect(out.createdIds).toEqual([]);
    expect(b.objects.A.X()).toBeCloseTo(2);
    expect(b.objects.mAC).toBe(mBefore);                 // same object, new position
    expect(b.objects.mAC.X()).toBeCloseTo(1.5);          // and the derived point followed it
  });

  it('undoes a cascade delete by rebuilding parent before child', () => {
    const b = newBoard();
    const full = snap(load(b, triangle()).elements);
    const segmentObj = b.objects.sAB;
    const survivors = { B: b.objects.B, C: b.objects.C, sBC: b.objects.sBC };

    // Delete A the way the designer does: JSXGraph takes its dependents with it.
    b.removeObject(b.objects.A);
    expect(b.objects.sAB).toBeUndefined();
    expect(b.objects.mAC).toBeUndefined();
    const afterDelete = snap(full.elements.filter((e) => !['A', 'sAB', 'mAC'].includes(e.id)));
    applyScene(b, afterDelete, planScene(full, afterDelete));

    const back = applyScene(b, full, planScene(afterDelete, full));
    expect(back.errors).toEqual([]);
    expect(back.createdIds).toEqual(['A', 'sAB', 'mAC']);
    expect(back.elements.map((e) => e.id)).toEqual(['A', 'B', 'C', 'sAB', 'sBC', 'mAC']);
    expect(b.objects.mAC.X()).toBeCloseTo(0.5);
    expect(b.objects.sAB).not.toBe(segmentObj);           // a new object for a new build
    expect(b.objects.B).toBe(survivors.B);                // everything else kept its identity
    expect(b.objects.sBC).toBe(survivors.sBC);
  });

  it('re-creates a segment whose parents changed, and keeps the rest', () => {
    const b = newBoard();
    const full = snap(load(b, triangle()).elements);
    const before = { A: b.objects.A, C: b.objects.C };
    const next = snap(full.elements.map((e) => (e.id === 'sAB'
      ? el({ type: 'segment', id: 'sAB', parents: ['A', 'C'], attrs: { strokeColor: '#1e3c96' } })
      : e)));
    const out = applyScene(b, next, planScene(full, next));
    expect(out.createdIds).toEqual(['sAB']);
    expect(b.objects.A).toBe(before.A);
    expect(b.objects.C).toBe(before.C);
    expect(b.objects.sAB.point2.id).toBe('C');
  });

  it('reports a broken element instead of throwing', () => {
    const b = newBoard();
    load(b, triangle());
    const broken = snap([el({ type: 'segment', id: 'sZZ', parents: ['A', 'nope'] })]);
    const out = applyScene(b, broken, planScene(snap(triangle()), broken));
    expect(out.elements).toEqual([]);
    expect(b.objects.sZZ).toBeUndefined();
  });

  it('syncs a dragged point back into the document', () => {
    const b = newBoard();
    const elements = load(b, triangle()).elements;
    b.objects.A.moveTo([3.25, 1.5]);
    b.update();
    expect(syncPositions(elements, b)).toBe(true);
    expect(elements.find((e) => e.id === 'A')!.parents).toEqual([3.25, 1.5]);
    // and the write-back is what keeps undo honest
    expect(syncPositions(elements, b)).toBe(false);
  });

  it('toggles axes and grid without tearing the board down', () => {
    const b = newBoard({ axis: true, grid: true });
    const out = load(b, triangle());
    const point = b.objects.A;
    setSceneChrome(b, { axis: false, grid: false });
    expect(b.defaultAxes.x.visProp.visible).toBe(false);
    expect(b.defaultAxes.y.visProp.visible).toBe(false);
    expect(Object.values(b.objects).filter((o: any) => o.elType === 'grid')
      .every((o: any) => o.visProp.visible === false)).toBe(true);
    setSceneChrome(b, { axis: true, grid: true });
    expect(b.defaultAxes.x.visProp.visible).toBe(true);
    expect(b.objects.A).toBe(point);                      // the board survived
    expect(out.createdIds.length).toBe(6);
  });

  it('leaves a board with no axes alone instead of failing', () => {
    const b = newBoard({ axis: false, grid: false });
    expect(() => setSceneChrome(b, { axis: true, grid: true })).not.toThrow();
  });
});

describe('the polygon tray', () => {
  const corners = [
    el({ type: 'point', id: 'v0', parents: [0, 0], attrs: { name: 'A' } }),
    el({ type: 'point', id: 'v1', parents: [4, 0], attrs: { name: 'B' } }),
    el({ type: 'point', id: 'v2', parents: [4, 3], attrs: { name: 'C' } }),
    el({ type: 'point', id: 'v3', parents: [0, 3], attrs: { name: 'D' } }),
  ];
  const vertexIds = corners.map((c) => c.id);

  it('leaves the polygon alone for the first row, borders and all', () => {
    const plan = polygonElements('polygon', vertexIds, 'pg1');
    expect(plan).toEqual([
      expect.objectContaining({ type: 'polygon', id: 'pg1', parents: vertexIds }),
    ]);
    const b = newBoard();
    load(b, [...corners, ...plan]);
    expect(b.objects.pg1.borders.every((l: any) => l.visProp.visible)).toBe(true);
  });

  it('adds a closed ring of segments for the second row and hides the borders they replace', () => {
    const plan = polygonElements('polygon_and_edges', vertexIds, 'pg1');
    expect(plan.map((e) => e.type)).toEqual(['polygon', 'segment', 'segment', 'segment', 'segment']);
    expect(plan.slice(1).map((e) => e.parents)).toEqual([
      ['v0', 'v1'], ['v1', 'v2'], ['v2', 'v3'], ['v3', 'v0'],
    ]);
    const b = newBoard();
    load(b, [...corners, ...plan]);
    expect(b.objects.pg1.borders.every((l: any) => l.visProp.visible === false)).toBe(true);
    // the ring closes on itself instead of leaving one side open
    expect(b.objects.pg1_s3.point1).toBe(b.objects.v3);
    expect(b.objects.pg1_s3.point2).toBe(b.objects.v0);
  });

  it('leaves only the edges for the third row', () => {
    const plan = polygonElements('polygon_edges', vertexIds, 'pg1');
    expect(plan.every((e) => e.type === 'segment')).toBe(true);
    expect(plan).toHaveLength(4);
    const b = newBoard();
    load(b, [...corners, ...plan]);
    expect(b.objects.pg1).toBeUndefined();
    expect(b.objects.pg1_s0.point2).toBe(b.objects.v1);
  });

  it('selects the polygon wherever its interior is clicked', () => {
    const b = newBoard();
    load(b, [...corners, ...polygonElements('polygon', vertexIds, 'pg1')]);
    b.update();
    // user coords → the screen coords the hit test is written in
    const at = (ux: number, uy: number): [number, number] => [
      b.origin.scrCoords[1] + ux * b.unitX,
      b.origin.scrCoords[2] - uy * b.unitY,
    ];
    const SELECTABLE = ['point', 'segment', 'circle', 'polygon'];
    const hit = (ux: number, uy: number) =>
      findObjectsAt(b, ...at(ux, uy), SELECTABLE, 8).filter((o: any) => o.elType === 'polygon');

    expect(hit(2, 1.5).map((o: any) => o.id)).toEqual(['pg1']);    // inside
    expect(hit(2, 3).map((o: any) => o.id)).toEqual(['pg1']);       // on the top edge
    expect(hit(6, 6)).toEqual([]);                                  // outside the shape
    // the border lines belong to the polygon and are not objects of their own
    expect(findObjectsAt(b, ...at(2, 3), ['segment'], 8)).toEqual([]);
  });
});
