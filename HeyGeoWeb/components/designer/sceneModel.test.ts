import { describe, expect, it, vi } from 'vitest';
import {
  applyScene,
  constructionKey,
  dependentsOf,
  parentIds,
  planScene,
  pushCapped,
  syncPositions,
  takeScene,
  UNDO_LIMIT,
  withDependents,
  type SceneSnapshot,
} from './sceneModel';
import type { HeyGeoElement } from './designTypes';

const el = (over: Partial<HeyGeoElement> & { type: string; id: string }): HeyGeoElement => ({
  parents: [],
  attrs: {},
  ...over,
});

const scene = (...elements: HeyGeoElement[]): SceneSnapshot =>
  takeScene(elements, { axis: false, grid: false });

describe('dependency graph', () => {
  const tri = [
    el({ type: 'point', id: 'A', parents: [0, 0] }),
    el({ type: 'point', id: 'B', parents: [3, 0] }),
    el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
    el({ type: 'midpoint', id: 'm1', parents: ['s1'] }),
    el({ type: 'circle', id: 'c1', parents: ['A', 'm1'] }),
  ];

  it('reads construction parents, not coordinates', () => {
    expect(parentIds(el({ type: 'point', id: 'A', parents: [1, 2] }))).toEqual([]);
    expect(parentIds(el({ type: 'glider', id: 'g', parents: [1, 2, 'c1'] }))).toEqual(['c1']);
    expect(constructionKey(el({ type: 'segment', id: 's', parents: ['A', 'B'] })))
      .toBe(constructionKey(el({ type: 'segment', id: 'other', parents: ['A', 'B'] })));
    expect(constructionKey(el({ type: 'segment', id: 's', parents: ['A', 'B'] })))
      .not.toBe(constructionKey(el({ type: 'segment', id: 's', parents: ['B', 'A'] })));
  });

  it('maps who is built from whom', () => {
    expect(dependentsOf(tri)).toEqual({ A: ['s1', 'c1'], B: ['s1'], s1: ['m1'], m1: ['c1'] });
  });

  it('pulls in every transitive dependent', () => {
    expect([...withDependents(tri, ['A'])].sort()).toEqual(['A', 'c1', 'm1', 's1']);
  });

  it('does not loop on a parent cycle', () => {
    const cyclic = [
      el({ type: 'segment', id: 's1', parents: ['p1', 'p2'] }),
      el({ type: 'point', id: 'p1', parents: ['s1'] }),
    ];
    expect([...withDependents(cyclic, ['s1'])].sort()).toEqual(['p1', 's1']);
  });
});

describe('planScene', () => {
  const base = scene(
    el({ type: 'point', id: 'A', parents: [0, 0] }),
    el({ type: 'point', id: 'B', parents: [3, 0] }),
    el({ type: 'segment', id: 's1', parents: ['A', 'B'], attrs: { strokeColor: '#1e3c96' } }),
  );

  it('does nothing to an unchanged scene', () => {
    const p = planScene(base, base);
    expect(p.removeIds).toEqual([]);
    expect(p.moves).toEqual([]);
    expect(p.attrUpdates).toEqual([]);
    expect(p.rebuildIds.size).toBe(0);
  });

  it('removes a leaf without touching its parents', () => {
    const next = scene(...base.elements.slice(0, 2));
    expect(planScene(base, next).removeIds).toEqual(['s1']);
  });

  it('removes children before the parent they hang from', () => {
    const wide = scene(
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [3, 0] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      el({ type: 'midpoint', id: 'm1', parents: ['s1'] }),
    );
    expect([...withDependents(wide.elements, ['A'])].sort()).toEqual(['A', 'm1', 's1']);
    const next = scene(wide.elements[1]);               // only B survives
    expect(planScene(wide, next).removeIds).toEqual(['m1', 's1', 'A']);
  });

  it('turns a colour change into one attribute update', () => {
    const next = scene(
      base.elements[0],
      base.elements[1],
      el({ type: 'segment', id: 's1', parents: ['A', 'B'], attrs: { strokeColor: '#c83c3c' } }),
    );
    const p = planScene(base, next);
    expect(p.attrUpdates).toEqual([{ id: 's1', attrs: { strokeColor: '#c83c3c' } }]);
    expect(p.removeIds).toEqual([]);
  });

  it('turns a point coordinate change into a move, not a rebuild', () => {
    const next = scene(
      el({ type: 'point', id: 'A', parents: [1.5, 2] }),
      base.elements[1],
      base.elements[2],
    );
    const p = planScene(base, next);
    expect(p.moves).toEqual([{ id: 'A', coords: [1.5, 2] }]);
    expect(p.removeIds).toEqual([]);
  });

  it('re-creates the survivors when a construction is re-parented', () => {
    const wide = scene(
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [3, 0] }),
      el({ type: 'point', id: 'C', parents: [1, 4] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
    );
    const now = segment(
      wide,
      el({ type: 'segment', id: 's1', parents: ['A', 'C'] }),
    );
    const p = planScene(wide, now);
    expect(p.removeIds).toEqual(['s1']);
    expect([...p.rebuildIds]).toEqual(['s1']);
  });

  it('plans an add as nothing but a creation', () => {
    const next = scene(...base.elements, el({ type: 'point', id: 'D', parents: [1, 1] }));
    const p = planScene(base, next);
    expect(p.removeIds).toEqual([]);
    expect(p.rebuildIds.size).toBe(0);
    expect(p.moves).toEqual([]);
    expect(p.attrUpdates).toEqual([]);
  });

  it('carries axis and grid as document state', () => {
    expect(takeScene([], { axis: true, grid: false }).axis).toBe(true);
  });
});

function segment(scene_: SceneSnapshot, replacement: HeyGeoElement): SceneSnapshot {
  return scene(...scene_.elements.map((e) => (e.id === replacement.id ? replacement : e)));
}

describe('syncPositions', () => {
  it('writes live coordinates back into the document', () => {
    const elements = [el({ type: 'point', id: 'A', parents: [0, 0] })];
    const board = { objects: { A: { X: () => 2.5, Y: () => 1 } } };
    expect(syncPositions(elements, board)).toBe(true);
    expect(elements[0].parents).toEqual([2.5, 1]);
  });

  it('quietly survives a board without the object', () => {
    const elements = [el({ type: 'point', id: 'A', parents: [0, 0] })];
    expect(syncPositions(elements, { objects: {} })).toBe(false);
    expect(elements[0].parents).toEqual([0, 0]);
  });

  it('rounds the float noise a drag leaves behind', () => {
    const elements = [el({ type: 'point', id: 'A', parents: [1, 1] })];
    const board = { objects: { A: { X: () => 0.30000000000000004, Y: () => 2 } } };
    syncPositions(elements, board);
    expect(elements[0].parents).toEqual([0.3, 2]);
  });

  it('keeps the curve parent of a glider', () => {
    const elements = [el({ type: 'glider', id: 'g', parents: [0, 0, 'c1'] })];
    const board = { objects: { g: { X: () => 3, Y: () => 4 } } };
    syncPositions(elements, board);
    expect(elements[0].parents).toEqual([3, 4, 'c1']);
  });

  it('leaves constructed points to their parents', () => {
    const elements = [el({ type: 'midpoint', id: 'm', parents: ['A', 'B'] })];
    const board = { objects: { m: { X: () => 9, Y: () => 9 } } };
    expect(syncPositions(elements, board)).toBe(false);
  });

  it('leaves the configured value of a slider alone', () => {
    const elements = [el({ type: 'slider', id: 'sl', parents: [[0, 5], [3, 5], [0, 2, 5]] })];
    const board = { objects: { sl: { X: () => 1, Y: () => 5 } } };
    expect(syncPositions(elements, board)).toBe(false);
  });
});

describe('undo history', () => {
  it('is bounded at UNDO_LIMIT and drops the oldest first', () => {
    const stack: SceneSnapshot[] = [];
    for (let i = 0; i < UNDO_LIMIT + 25; i++) {
      pushCapped(stack, takeScene([el({ type: 'point', id: `p${i}`, parents: [i, 0] })], { axis: false, grid: false }));
    }
    expect(stack.length).toBe(UNDO_LIMIT);
    expect(stack[0].elements[0].id).toBe('p25');
    expect(stack[stack.length - 1].elements[0].id).toBe(`p${UNDO_LIMIT + 24}`);
  });

  it('snapshots are copies, so later edits cannot rewrite history', () => {
    const elements = [el({ type: 'point', id: 'A', parents: [0, 0] })];
    const snap = takeScene(elements, { axis: false, grid: false });
    elements[0].parents = [7, 7];
    expect(snap.elements[0].parents).toEqual([0, 0]);
  });
});

describe('applyScene with a fake board', () => {
  interface Fake {
    objects: Record<string, Live>;
    create(type: string, parents: unknown[], attrs: Record<string, unknown>): Live;
    removeObject(obj: Live): void;
    update(): void;
  }

  // A board stand-in that behaves like JSXGraph where the plan cares: objects
  // keyed by id, cascade removal, and a create() that registers.
  function fakeBoard(elements: HeyGeoElement[]): Fake {
    const board: Fake = {
      objects: {},
      create: vi.fn(),
      removeObject: vi.fn(),
      update: vi.fn(),
    };
    let specs = [...elements];
    const create = vi.fn((type: string, parents: unknown[], attrs: Record<string, unknown>): Live => {
      const obj: Live = {
        id: attrs.id as string, type, parents, attrs, elType: type,
        setAttribute: (a: Record<string, unknown>) => Object.assign(obj.attrs, a),
        moveTo: (c: number[]) => { obj.parents = [...c]; },
        X: () => obj.parents[0] as number,
        Y: () => obj.parents[1] as number,
      };
      board.objects[obj.id] = obj;
      specs.push({ type: obj.type, id: obj.id, parents: obj.parents, attrs: obj.attrs });
      return obj;
    });
    // JSXGraph removes an element together with everything built from it.
    const removeObject = vi.fn((obj: Live) => {
      for (const id of withDependents(specs, [obj.id])) delete board.objects[id];
      specs = specs.filter((s) => board.objects[s.id]);
    });
    Object.assign(board, { create, removeObject });
    for (const e of elements) create(e.type, e.parents, { ...e.attrs, id: e.id });
    return board;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Live = Record<string, any>;

  it('keeps every board object that the change did not touch', () => {
    const elements = [
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [3, 0] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'], attrs: { strokeColor: '#1e3c96' } }),
    ];
    const board = fakeBoard(elements);
    const before = { ...board.objects };
    const next = takeScene(
      [elements[0], elements[1], { ...elements[2], attrs: { strokeColor: '#c83c3c' } }],
      { axis: false, grid: false },
    );
    const out = applyScene(board, next, planScene(takeScene(elements, { axis: false, grid: false }), next));
    expect(board.objects.A).toBe(before.A);
    expect(board.objects.B).toBe(before.B);
    expect(board.objects.s1).toBe(before.s1);          // recoloured in place
    expect(board.objects.s1.attrs.strokeColor).toBe('#c83c3c');
    expect(out.errors).toEqual([]);
    expect(out.createdIds).toEqual([]);
  });

  it('moves a dragged point without re-creating it', () => {
    const A = el({ type: 'point', id: 'A', parents: [0, 0] });
    const board = fakeBoard([A]);
    const next = takeScene([el({ type: 'point', id: 'A', parents: [4, 5] })], { axis: false, grid: false });
    const out = applyScene(board, next, planScene(takeScene([A], { axis: false, grid: false }), next));
    expect(out.createdIds).toEqual([]);
    expect(board.objects.A.parents).toEqual([4, 5]);
  });

  it('undoes a cascade delete by rebuilding parents before children', () => {
    const elements = [
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [3, 0] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
    ];
    const board = fakeBoard(elements);
    const full = takeScene(elements, { axis: false, grid: false });
    // Deleting A took the segment with it, exactly as JSXGraph cascades.
    applyScene(board, takeScene([elements[1]], { axis: false, grid: false }),
      planScene(full, takeScene([elements[1]], { axis: false, grid: false })));
    expect(Object.keys(board.objects)).toEqual(['B']);

    const back = applyScene(board, full, planScene(takeScene([elements[1]], { axis: false, grid: false }), full));
    expect(back.createdIds).toEqual(['A', 's1']);
    expect(Object.keys(board.objects).sort()).toEqual(['A', 'B', 's1']);
    expect(back.elements.map((e) => e.id)).toEqual(['A', 'B', 's1']);
  });

  it('re-creates a segment that was re-parented, and nothing else', () => {
    const elements = [
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [3, 0] }),
      el({ type: 'point', id: 'C', parents: [1, 4] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
    ];
    const board = fakeBoard(elements);
    const before = { ...board.objects };
    const next = takeScene([
      elements[0], elements[1], elements[2],
      { ...elements[3], parents: ['A', 'C'] },
    ], { axis: false, grid: false });
    const plan = planScene(takeScene(elements, { axis: false, grid: false }), next);
    expect(plan.removeIds).toEqual(['s1']);
    expect([...plan.rebuildIds]).toEqual(['s1']);

    const out = applyScene(board, next, plan);
    expect(board.objects.A).toBe(before.A);
    expect(board.objects.C).toBe(before.C);
    expect(board.objects.s1).not.toBe(before.s1);       // a new object for a new construction
    expect(board.objects.s1.parents.map((p: Live) => p?.id ?? p)).toEqual(['A', 'C']);
    expect(out.createdIds).toEqual(['s1']);
  });

  it('creates a pending child after its parent even when the plan lists them apart', () => {
    const board = fakeBoard([]);
    const next = takeScene([
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [1, 1] }),
    ], { axis: false, grid: false });
    const out = applyScene(board, next);
    expect(out.errors).toEqual([]);
    expect(out.createdIds).toEqual(['A', 'B', 's1']);
  });

  it('reports a parent the document never had instead of throwing', () => {
    const board = fakeBoard([]);
    const next = takeScene([el({ type: 'segment', id: 's1', parents: ['ghost', 'B'] })], { axis: false, grid: false });
    const out = applyScene(board, next);
    expect(out.elements).toEqual([]);
    expect(out.errors.join(' ')).toMatch(/cha không tồn tại/);
  });

  it('recreates what drifted away from the document without a plan', () => {
    const elements = [el({ type: 'point', id: 'A', parents: [0, 0] })];
    const board = fakeBoard(elements);
    delete board.objects.A;                             // someone removed it behind our back
    const snap = takeScene(elements, { axis: false, grid: false });
    const out = applyScene(board, snap);                // no plan: pure reconcile
    expect(out.createdIds).toEqual(['A']);
  });
});
