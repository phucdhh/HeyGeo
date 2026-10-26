import { describe, expect, it, vi } from 'vitest';
import {
  createElement,
  expressionFromCode,
  isLegacyCodeSource,
  isSupportedType,
  normalizeElement,
  unresolvedParentId,
  type ElementSpec,
} from './elementRegistry';
import { applyScene, takeScene } from './sceneModel';
import type { HeyGeoElement } from './designTypes';

function fakeBoard() {
  const create = vi.fn((_type: string) => ({ ok: true }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { create, calls: () => create.mock.calls as any[] };
}

/** An elMap holding A and B, which is what the loader would pass after building them. */
const built = () => ({ A: { id: 'A' }, B: { id: 'B' }, C: { id: 'C' }, D: { id: 'D' } });

const el = (over: Partial<ElementSpec> & { type: string }): ElementSpec => ({
  id: 'x1',
  parents: [],
  attrs: {},
  ...over,
});

describe('createElement', () => {
  it('creates a supported type with its parents and id', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'point', parents: [1, 2] }));
    expect(out.obj).toBeTruthy();
    expect(board.calls()[0]).toEqual(['point', [1, 2], { id: 'x1' }]);
  });

  it('maps ray to a line with a far-end arrow', () => {
    const board = fakeBoard();
    createElement(board, el({ type: 'ray', parents: ['A', 'B'] }), built());
    const [, , attrs] = board.calls()[0];
    expect(attrs.firstArrow).toEqual([0, 0]);
    expect(attrs.lastArrow).toEqual([1, 1]);
  });

  it('lets the stored attributes win over registry defaults', () => {
    const board = fakeBoard();
    createElement(board, el({ type: 'ray', parents: ['A', 'B'], attrs: { lastArrow: [0, 0] } }), built());
    expect(board.calls()[0][2].lastArrow).toEqual([0, 0]);
  });

  it('reports an unknown type instead of returning nothing', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'notarealtype', parents: [] }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/notarealtype/);
    expect(board.create).not.toHaveBeenCalled();
  });

  it('rejects the wrong parent count before touching the engine', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'segment', parents: ['A'] }), built());
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/cần 2/);
    expect(board.create).not.toHaveBeenCalled();
  });

  it('accepts a variadic polygon', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'polygon', parents: ['A', 'B', 'C', 'D'] }), built());
    expect(out.obj).toBeTruthy();
  });

  it('flags a dangling parent reference', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'segment', parents: ['A', 'missing'] }), built());
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/không tồn tại/);
  });

  it('surfaces an engine error with the element type', () => {
    const board = { create: vi.fn(() => { throw new Error('boom'); }) };
    const out = createElement(board as never, el({ type: 'circle', parents: ['A', 'B'] }), built());
    expect(out.obj).toBeNull();
    expect(out.error).toBe('circle: boom');
  });

  it('passes a text caption through as a literal, not as an element id', () => {
    const board = fakeBoard();
    const caption = el({ type: 'text', parents: [1, 2, 'AB = 3 cm'] });
    // only the anchor indices of a text look up ids; the caption must survive
    const out = createElement(board, caption, { 'AB = 3 cm': { shouldNotBeUsed: true } });
    expect(out.obj).toBeTruthy();
    expect(board.calls()[0][1]).toEqual([1, 2, 'AB = 3 cm']);
  });

  it('accepts a slider written as three coordinate arrays', () => {
    const board = fakeBoard();
    const out = createElement(board, el({ type: 'slider', parents: [[0, 5], [3, 5], [0, 1, 5]] }));
    expect(out.error).toBeUndefined();
    expect(board.calls()[0][0]).toBe('slider');
  });
});

describe('by-name parent mode (desktop transforms)', () => {
  const translate = el({ type: 'transform', parents: [`X($('v2'))-X($('v1'))`, 0] });

  it('resolves a string that names a built element', () => {
    const board = fakeBoard();
    createElement(board, el({ type: 'transform', parents: ['s1'] }), { s1: { id: 's1' } });
    expect(board.calls()[0][1]).toEqual([{ id: 's1' }]);
  });

  it('leaves a JessieCode expression untouched', () => {
    const board = fakeBoard();
    createElement(board, translate, { A: { id: 'A' } });
    expect(board.calls()[0][1]).toEqual([`X($('v2'))-X($('v1'))`, 0]);
  });

  it('never defers on a by-name parent', () => {
    expect(unresolvedParentId(translate, new Set())).toBeNull();
  });
});

describe('parent ordering', () => {
  it('names the first parent that is not built yet', () => {
    expect(unresolvedParentId(el({ type: 'segment', parents: ['A', 'B'] }), new Set(['A']))).toBe('B');
    expect(unresolvedParentId(el({ type: 'segment', parents: ['A', 'B'] }), new Set(['A', 'B']))).toBeNull();
  });

  it('treats numeric and array parents as self-contained', () => {
    expect(unresolvedParentId(el({ type: 'point', parents: [1, 2] }), new Set())).toBeNull();
    expect(
      unresolvedParentId(el({ type: 'curve', parents: [[1, 2, null]] }), new Set()),
    ).toBeNull();
  });

  it('does not read a text caption as an element reference', () => {
    expect(
      unresolvedParentId(el({ type: 'text', parents: [1, 2, 'Chu vi tam giác'] }), new Set()),
    ).toBeNull();
    expect(
      unresolvedParentId(el({ type: 'text', parents: ['A', 2, 'caption'] }), new Set()),
    ).toBe('A');
  });
});

describe('stored code sources', () => {
  const legacy = el({
    type: 'text',
    parents: [`function(){return board.objects['A'].X()+0.3}`, 1, 'label'],
  });

  it('are detected', () => {
    expect(isLegacyCodeSource(legacy.parents[0])).toBe(true);
    expect(isLegacyCodeSource('A')).toBe(false);
    expect(isLegacyCodeSource(1)).toBe(false);
  });

  it('are ignored when checking reference order', () => {
    expect(unresolvedParentId(legacy, new Set(['A']))).toBeNull();
  });

  it('are never evaluated: an unknown source is reported, not run', () => {
    const board = fakeBoard();
    const out = createElement(board, legacy, built());
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/không dựng lại được/);
  });

  it('become JSXGraph expressions for a curve', () => {
    expect(expressionFromCode('function(x){ return Math.sin(x)+1; }')).toBe('sin(x)+1');
    expect(expressionFromCode('function(t){ return t*t - Math.PI; }')).toBe('x*x - pi');
    expect(expressionFromCode('function(){ return board.objects.A.X(); }')).toBeNull();
    expect(expressionFromCode('function(x){ alert(1); }')).toBeNull();
    expect(expressionFromCode('not a function at all')).toBeNull();
  });

  it('are normalised on the way in, and anything else is left for reporting', () => {
    const curve = normalizeElement(el({
      type: 'functiongraph',
      parents: ['function(x){ return x*x; }', -2, 2],
    }));
    expect(curve.parents[0]).toBe('x*x');
    expect(normalizeElement(legacy)).toBe(legacy);
  });

  it('build a measurement from its descriptor instead', () => {
    const board = fakeBoard();
    const out = createElement(board, el({
      type: 'text',
      parents: [1, 2, 'd'],
      attrs: { measure: { op: 'distance', args: ['A', 'B'], precision: 2 } },
    }), built());
    expect(out.obj).toBeTruthy();
    // the descriptor is this app's business, JSXGraph must not receive it
    expect(board.calls()[0][2]).not.toHaveProperty('measure');
  });
});

describe('load round-trip over real element shapes', () => {
  // Loading is sceneModel.applyScene's job now, so these drive that function
  // instead of a second copy of its retry loop.
  interface LoadBoard {
    objects: Record<string, unknown>;
    create(type: string, parents: unknown[], attrs: Record<string, unknown>): unknown;
    removeObject(obj: unknown): void;
    update(): void;
  }
  const loadInto = (elements: ElementSpec[]) => {
    const board: LoadBoard = {
      objects: {},
      create: vi.fn(),
      removeObject: vi.fn(),
      update: vi.fn(),
    };
    board.create = vi.fn((type: string, _parents: unknown[], attrs: Record<string, unknown>) => {
      const obj = { elType: type, id: attrs.id };
      board.objects[String(attrs.id)] = obj;
      return obj;
    });
    const out = applyScene(
      board,
      takeScene(elements as unknown as HeyGeoElement[], { axis: false, grid: false }),
    );
    return {
      created: Object.keys(board.objects).length,
      order: (board.create as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0]),
      errors: out.errors,
    };
  };

  it('rebuilds a perpendicular from two stored ids', () => {
    const r = loadInto([
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [4, 0] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      el({ type: 'point', id: 'C', parents: [2, 3] }),
      el({ type: 'perpendicular', id: 'perp_1', parents: ['C', 's1'] }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(5);
    expect(r.order).toEqual(['point', 'point', 'segment', 'point', 'perpendicular']);
  });

  it('recovers when JSON lists a child before its parent', () => {
    const r = loadInto([
      el({ type: 'midpoint', id: 'm1', parents: ['A', 'B'] }),
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [2, 2] }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(3);
  });

  it('retries deep enough for a chain of reversed parents', () => {
    const r = loadInto([
      el({ type: 'perpendicular', id: 'perp', parents: ['m1', 's1'] }),
      el({ type: 'midpoint', id: 'm1', parents: ['A', 'B'] }),
      el({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      el({ type: 'point', id: 'A', parents: [0, 0] }),
      el({ type: 'point', id: 'B', parents: [4, 0] }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.created).toBe(5);
  });

  it('stops on a parent cycle instead of looping forever', () => {
    const r = loadInto([
      el({ type: 'midpoint', id: 'm1', parents: ['m2', 'A'] }),
      el({ type: 'midpoint', id: 'm2', parents: ['m1', 'A'] }),
      el({ type: 'point', id: 'A', parents: [1, 1] }),
    ]);
    expect(r.created).toBe(1);
    expect(r.errors.filter((e) => /cha không tồn tại/.test(e))).toHaveLength(2);
  });

  it('reports an element whose parent is genuinely absent', () => {
    const r = loadInto([el({ type: 'midpoint', id: 'm1', parents: ['A', 'ghost'] })]);
    expect(r.created).toBe(0);
    expect(r.errors.join(' ')).toMatch(/không tồn tại/);
  });
});

describe('registry coverage', () => {
  const persisted = [
    'point', 'glider', 'midpoint', 'intersection', 'segment', 'line', 'ray', 'circle',
    'arc', 'sector', 'angle', 'polygon', 'slider', 'text', 'ticks', 'curve',
    'functiongraph', 'conic', 'tracecurve', 'perpendicular', 'parallel', 'bisector',
    'anglebisector', 'transform',
  ];

  it.each(persisted)('supports %s', (type) => {
    expect(isSupportedType(type)).toBe(true);
  });

  it('rejects types that are not geometry', () => {
    for (const type of ['undefined', '', 'board', 'gsp', 'objectlocus', 'eventbinding']) {
      expect(isSupportedType(type)).toBe(false);
    }
  });
});
