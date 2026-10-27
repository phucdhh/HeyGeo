// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createElement,
  unresolvedParentId,
  type ElementSpec,
} from './elementRegistry';

/* eslint-disable @typescript-eslint/no-explicit-any */
let JXG: any;
function newBoard() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, { boundingbox: [0, 0, 10, 10], axis: false, showGrid: false });
}

beforeAll(() => {
  // jsxgraphcore.js is the same self-hosted file the app serves in P0.1
  const src = readFileSync(resolve(process.cwd(), 'public/vendor/jsxgraph/jsxgraphcore.js'), 'utf8');
  new Function(src)();
  JXG = (globalThis as any).JXG;
  // JSXGraph reads prefers-reduced-motion at init; jsdom has no matchMedia
  (window as any).matchMedia = vi.fn(() => ({
    matches: false, addEventListener: () => {}, removeEventListener: () => {},
  }));
});

afterAll(() => {
  JXG?.JSXGraph?.freeAllBoards?.();
});

const spec = (over: Partial<ElementSpec> & { type: string }): ElementSpec => ({
  id: 'e1', parents: [], attrs: {}, ...over,
});

// Verbatim shapes from HeyGeoWebExporter: a G_MEASURE caption whose value is an
// IIFE over board.objects, with centimetres-per-unit (here 2) multiplied in.
const DESKTOP_DISTANCE =
  "function(){return 'AB = '+((function(){var bo=board.objects," +
  "dx=bo['A'].X()-bo['B'].X(),dy=bo['A'].Y()-bo['B'].Y();" +
  "return Math.sqrt(dx*dx+dy*dy)*2;})()).toFixed(2)+' cm';}";

const DESKTOP_COORDS =
  "function(){var ox=board.objects['O'].X(),oy=board.objects['O'].Y();" +
  "var ux=board.objects['U'].X(),uy=board.objects['U'].Y();" +
  "var sf=Math.sqrt((ux-ox)*(ux-ox)+(uy-oy)*(uy-oy));" +
  "var x=(board.objects['A'].X()-ox)/sf;" +
  "var y=(board.objects['A'].Y()-oy)/sf;" +
  "return 'A = ('+x.toFixed(2)+'; '+y.toFixed(2)+')';}";

// Mirrors the parent resolution in DesignCanvas's loadDataToBoard
function loader(board: any, elements: ElementSpec[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elMap: Record<string, any> = {};
  const errors: string[] = [];
  let pending = elements;
  while (pending.length > 0) {
    const deferred: ElementSpec[] = [];
    for (const item of pending) {
      const missing = unresolvedParentId(item, new Set(Object.keys(elMap)));
      if (missing !== null) {
        deferred.push(item);
        continue;
      }
      const out = createElement(board, item, elMap);
      if (out.obj) elMap[item.id ?? ''] = out.obj;
      else errors.push(out.error ?? item.type);
    }
    if (deferred.length === pending.length) break;
    pending = deferred;
  }
  for (const item of pending) {
    errors.push(`${item.type} "${item.id}": cha không tồn tại (${item.parents.join(', ')})`);
  }
  return { elMap, errors, loaded: Object.keys(elMap).length };
}

describe('real JSXGraph engine', () => {
  it('loads the self-hosted vendor build', () => {
    expect(JXG).toBeTruthy();
    expect(JXG.version).toBe('1.12.2');
  });

  it.each([
    ['point', () => [1, 2], 'point'],
    ['segment', (b: any, A: any) => [A, b.create('point', [3, 4])], 'segment'],
    ['line', (b: any, A: any) => [A, b.create('point', [3, 4])], 'line'],
    ['circle', (b: any, A: any) => [A, 2], 'circle'],
    ['midpoint', (b: any, A: any) => [A, b.create('point', [3, 3])], 'midpoint'],
    ['glider', (b: any, A: any) => [2, 2, b.create('segment', [A, b.create('point', [6, 1])])], 'glider'],
    ['perpendicular', (b: any, A: any) => [A, b.create('segment', [A, b.create('point', [6, 1])])], 'perpendicular'],
    ['parallel', (b: any, A: any) => [A, b.create('segment', [A, b.create('point', [6, 1])])], 'parallel'],
    ['bisector', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5])], 'bisector'],
    ['angle', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5])], 'angle'],
    ['sector', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5])], 'sector'],
    ['arc', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5])], 'arc'],
    ['polygon', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5])], 'polygon'],
    ['functiongraph', () => [(x: number) => x * x], 'curve'],
    ['curve', () => [[1, 2, 3], [1, 4, 9]], 'curve'],
    ['slider', (b: any, A: any) => [[1, 6], [4, 6], [0, 1, 5], A], 'slider'],
    ['intersection', (b: any, A: any) => {
      const l = b.create('segment', [A, b.create('point', [6, 1])]);
      return [b.create('circle', [A, 2]), l, 1];
    }, 'intersection'],
    ['conic', (b: any, A: any) => [A, b.create('point', [3, 3]), b.create('point', [1, 5]), b.create('point', [4, 2]), b.create('point', [2, 6])], 'curve'],
    ['ticks', (b: any, A: any) => {
      const l = b.create('line', [A, b.create('point', [2, 2])]);
      return [l, [A]];
    }, 'ticks'],
    ['tracecurve', (b: any, A: any) => {
      const seg = b.create('segment', [A, b.create('point', [6, 1])]);
      return [b.create('glider', [2, 2, seg]), b.create('point', [4, 4])];
    }, 'curve'],
    ['text', (b: any, A: any) => [A.X(), A.Y(), 'caption'], 'text'],
  ])('creates %s', (type, parents, expectedElType) => {
    const b = newBoard();
    const A = b.create('point', [1, 2]);
    const out = b.create(type, (parents as any)(b, A));
    expect(out).toBeTruthy();
    expect(out.elType).toBe(expectedElType);
  });
});

describe('registry against the real engine', () => {
  // One element of every registered type, with parents written the way
  // HeyGeoWebExporter and the designer write them: ids for references,
  // coordinate arrays for free geometry.
  const scene: ElementSpec[] = [
    spec({ type: 'point', id: 'A', parents: [0, 0] }),
    spec({ type: 'point', id: 'B', parents: [4, 0] }),
    spec({ type: 'point', id: 'C', parents: [1, 3] }),
    spec({ type: 'point', id: 'D', parents: [2, 4] }),
    spec({ type: 'point', id: 'E', parents: [3, 2] }),
    spec({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
    spec({ type: 'line', id: 'l1', parents: ['A', 'C'] }),
    spec({ type: 'ray', id: 'r1', parents: ['A', 'B'] }),
    spec({ type: 'circle', id: 'c1', parents: ['A', 2] }),
    spec({ type: 'arc', id: 'a1', parents: ['A', 'B', 'C'] }),
    spec({ type: 'sector', id: 'sec1', parents: ['B', 'A', 'C'] }),
    spec({ type: 'angle', id: 'ang1', parents: ['B', 'A', 'C'] }),
    spec({ type: 'midpoint', id: 'm1', parents: ['A', 'B'] }),
    spec({ type: 'intersection', id: 'i1', parents: ['c1', 'l1', 0] }),
    spec({ type: 'glider', id: 'g1', parents: [1, 0, 's1'] }),
    spec({ type: 'perpendicular', id: 'perp1', parents: ['C', 's1'] }),
    spec({ type: 'parallel', id: 'par1', parents: ['C', 's1'] }),
    spec({ type: 'bisector', id: 'bis1', parents: ['B', 'A', 'C'] }),
    spec({ type: 'polygon', id: 'poly1', parents: ['A', 'B', 'C'] }),
    spec({ type: 'conic', id: 'conic1', parents: ['A', 'B', 'C', 'D', 'E'] }),
    spec({ type: 'slider', id: 'slid1', parents: [[0, 5], [3, 5], [0, 1, 5]] }),
    spec({ type: 'text', id: 't1', parents: [1, 1, 'nhãn'] }),
    spec({ type: 'curve', id: 'cur1', parents: [[1, 2, 3], [1, 4, 9]] }),
    spec({ type: 'functiongraph', id: 'fg1', parents: ['function(x){ return x*x; }', -2, 2] }),
    spec({ type: 'ticks', id: 'tk1', parents: ['l1', 1] }),
    spec({ type: 'anglebisector', id: 'ab1', parents: ['B', 'A', 'C'] }),
    spec({ type: 'transform', id: 'tr1', parents: [1, 0], attrs: { type: 'translate' } }),
    spec({ type: 'transform', id: 'tr2', parents: ['s1'], attrs: { type: 'reflect' } }),
    // a reflected copy uses the transform as a parent, the desktop spelling
    spec({ type: 'point', id: 'Cimg', parents: ['C', 'tr2'] }),
  ];

  it('rebuilds every registered type from production-shaped JSON', () => {
    const b = newBoard();
    const r = loader(b, scene);
    expect(r.errors).toEqual([]);
    expect(r.loaded).toBe(scene.length);
  });

  it('gives each type the engine class the designer expects', () => {
    const b = newBoard();
    const r = loader(b, scene);
    const elTypes = Object.fromEntries(
      Object.entries(r.elMap).map(([id, o]) => [id, (o as any).elType]),
    );
    // JSXGraph has no ray, and conic/functiongraph are Curve subclasses.
    // tracecurve is not asserted here: locus sampling needs real layout
    // metrics and blows the jsdom stack, so P0.6 covers it in the browser.
    expect(elTypes.r1).toBe('line');
    expect(elTypes.conic1).toBe('curve');
    expect(elTypes.fg1).toBe('curve');
    expect(elTypes.perp1).toBe('perpendicular');
    expect(elTypes.ab1).toBe('bisector');
    // transforms carry no elType; assert what they do instead of how they name
    expect((r.elMap.Cimg as any).Y()).toBeCloseTo(-3);
    expect(elTypes.i1).toBe('intersection');
    expect(elTypes.tk1).toBe('ticks');
  });

  it('maps ray to a line with one arrow, verifiable on the engine object', () => {
    const b = newBoard();
    const out = createElement(b, spec({ type: 'ray', parents: ['A', 'B'] }), {
      A: b.create('point', [0, 0]),
      B: b.create('point', [3, 2]),
    });
    const line = out.obj as any;
    expect(line.visProp.lastarrow).toEqual([1, 1]);
    expect(line.visProp.firstarrow).toEqual([0, 0]);
  });

  it('rejects an unsupported type without touching the engine', () => {
    const b = newBoard();
    const before = Object.keys(b.objects).length;
    const out = createElement(b, spec({ type: 'mystery', parents: [] }));
    expect(out.obj).toBeNull();
    expect(Object.keys(b.objects).length).toBe(before);
  });

  it('renders a legacy measurement descriptor against a real point', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [2, 1] }),
      spec({
        type: 'text',
        id: 't1',
        parents: [0, 0, 'A.x'],
        attrs: { measure: { op: 'abscissa', args: ['A'], label: 'A.x', precision: 2 } },
      }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.loaded).toBe(2);
    b.update();
    expect(String((r.elMap.t1 as any).plaintext)).toBe('A.x = 2.00');

    (r.elMap.A as any).setPosition(1, [7, 5]);
    b.update();
    expect(String((r.elMap.t1 as any).plaintext)).toBe('A.x = 7.00');
  });

  it('reports a stored code source it cannot express instead of running it', () => {
    const b = newBoard();
    const before = Object.keys(b.objects).length;
    const out = createElement(b, spec({
      type: 'text',
      parents: [0, 0, "function(){return 'x = '+board.objects['A'].X()}"],
    }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/không dựng lại được/);
    expect(Object.keys(b.objects).length).toBe(before);
  });

  it('round-trips a model with ids, references and out-of-order children', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'perpendicular', id: 'perp', parents: ['C', 's1'] }),
      spec({ type: 'midpoint', id: 'M', parents: ['A', 'B'] }),
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [4, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      spec({ type: 'point', id: 'C', parents: [2, 3] }),
      spec({ type: 'angle', id: 'ang', parents: ['B', 'A', 'C'] }),
    ]);
    expect(r.errors).toEqual([]);
    expect(r.loaded).toBe(7);
    expect((r.elMap.perp as any).parents).toBeDefined();
  });

  it('reports a dangling reference instead of building a broken object', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['A', 'ghost'] }),
    ]);
    expect(r.loaded).toBe(1);
    expect(r.errors.join(' ')).toMatch(/ghost|không tồn tại/);
  });

  it('surfaces an engine error with its message', () => {
    const b = newBoard();
    const out = createElement(b, spec({ type: 'segment', parents: [[0, 0], [0, 0]] }));
    // identical endpoints: JSXGraph throws rather than returning nothing useful
    if (!out.obj) expect(out.error).toMatch(/segment/);
    else expect(out.obj.elType).toBe('segment');
  });

  it('plots a desktop-exported function with its parameter intact', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({
        type: 'functiongraph',
        id: 'f1',
        parents: ['function(x){ return x*x; }', -2, 2],
      }),
    ]);
    expect(r.errors).toEqual([]);
    const curve = r.elMap.f1 as any;
    expect(curve.Y(3)).toBeCloseTo(9);
  });

  it('plots a desktop-exported parametric curve', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({
        type: 'curve',
        id: 'c1',
        parents: ['function(t){ return Math.cos(t); }', 'function(t){ return Math.sin(t); }', 0, 6.28],
      }),
    ]);
    expect(r.errors).toEqual([]);
    const curve = r.elMap.c1 as any;
    expect(curve.X(0)).toBeCloseTo(1);
    expect(curve.Y(0)).toBeCloseTo(0);
  });

  it('renders a desktop-exported distance caption, scale and all', () => {
    const b = newBoard();
    // HeyGeoWebExporter writes measure text as [x, y, functionSource]
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [3, 4] }),
      spec({ type: 'text', id: 'cap', parents: [1, 6, DESKTOP_DISTANCE] }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    const txt = r.elMap.cap as any;
    expect(String(txt.plaintext)).toBe('AB = 10.00 cm');

    (r.elMap.B as any).setPosition(1, [0, 8]);
    b.update();
    expect(String(txt.plaintext)).toBe('AB = 16.00 cm');
  });

  it('renders a desktop-exported coordinate-system caption', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'O', parents: [0, 0] }),
      spec({ type: 'point', id: 'U', parents: [2, 0] }),
      spec({ type: 'point', id: 'A', parents: [2, 1] }),
      spec({ type: 'text', id: 'cap', parents: [0.5, 0.5, DESKTOP_COORDS] }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(String((r.elMap.cap as any).plaintext)).toBe('A = (1.00; 0.50)');
  });

  // The five templates DesignCanvas wrote into a transformed point's parents
  // before transforms.ts existed, quoted verbatim from git HEAD.
  const legacyPair = (make: (axis: 'X' | 'Y') => string): [string, string] =>
    [make('X'), make('Y')];
  const LEGACY = {
    vector: (src: string, from: string, to: string) =>
      legacyPair((a) => `function(board){var P=board.objects['${src}'], A=board.objects['${from}'], B=board.objects['${to}']; return P.${a}()+(B.${a}()-A.${a}())}`),
    offset: (src: string, dx: number, dy: number) =>
      legacyPair((a) => `function(board){var P=board.objects['${src}']; return P.${a}()+${a === 'X' ? dx : dy}}`),
    rotate: (src: string, centre: string, deg: number) => {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return legacyPair((a) => a === 'X'
        ? `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; var dx=P.X()-C.X(), dy=P.Y()-C.Y(); return C.X()+dx*${cos}-dy*${sin}}`
        : `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; var dx=P.X()-C.X(), dy=P.Y()-C.Y(); return C.Y()+dx*${sin}+dy*${cos}}`);
    },
    dilate: (src: string, centre: string, k: number) =>
      legacyPair((a) => `function(board){var P=board.objects['${src}'], C=board.objects['${centre}']; return C.${a}()+${k}*(P.${a}()-C.${a}())}`),
    reflect: (src: string, line: string) =>
      legacyPair((a) => `function(board){var P=board.objects['${src}'], L=board.objects['${line}']; var p1=L.point1, p2=L.point2; var vx=p2.X()-p1.X(), vy=p2.Y()-p1.Y(); var v2=vx*vx+vy*vy; if(v2<1e-12)return P.${a}(); var wx=P.X()-p1.X(), wy=P.Y()-p1.Y(); var t=(wx*vx+wy*vy)/v2; return 2*(p1.${a}()+t*${a === 'X' ? 'vx' : 'vy'})-P.${a}()}`),
  };

  const at = (o: any): [number, number] => [o.X(), o.Y()];

  /**
   * A document that stores the old source is migrated and rebuilt at the same
   * place the compiled source used to put it — the copy keeps following its
   * source, its vector, its centre and its mirror.
   */
  it('rebuilds a legacy translated copy without running its source', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'V1', parents: [0, 0] }),
      spec({ type: 'point', id: 'V2', parents: [2, 3] }),
      spec({ type: 'point', id: 'A', parents: [1, 1] }),
      spec({ type: 'point', id: 'A2', parents: LEGACY.vector('A', 'V1', 'V2') }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)).toEqual([3, 4]);

    (r.elMap.A as any).setPosition(1, [5, 5]);
    (r.elMap.V2 as any).setPosition(1, [1, 1]);
    b.update();
    expect(at(r.elMap.A2)).toEqual([6, 6]);
  });

  it('rebuilds a legacy copy translated by a number', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [1, 1] }),
      spec({ type: 'point', id: 'A2', parents: LEGACY.offset('A', 2.5, -1) }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)).toEqual([3.5, 0]);
  });

  it('rebuilds a legacy rotated copy and keeps the angle', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'O', parents: [0, 0] }),
      spec({ type: 'point', id: 'A', parents: [2, 1] }),
      spec({ type: 'point', id: 'A2', parents: LEGACY.rotate('A', 'O', 90) }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)[0]).toBeCloseTo(-1);
    expect(at(r.elMap.A2)[1]).toBeCloseTo(2);

    (r.elMap.A as any).setPosition(1, [0, 3]);
    b.update();
    expect(at(r.elMap.A2)[0]).toBeCloseTo(-3);
    expect(at(r.elMap.A2)[1]).toBeCloseTo(0);
  });

  it('rebuilds a legacy dilated copy about its centre', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'O', parents: [1, 1] }),
      spec({ type: 'point', id: 'A', parents: [3, 3] }),
      spec({ type: 'point', id: 'A2', parents: LEGACY.dilate('A', 'O', 0.5) }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)).toEqual([2, 2]);
  });

  it('rebuilds a legacy reflected copy in its mirror', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'L1', parents: [0, 0] }),
      spec({ type: 'point', id: 'L2', parents: [4, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['L1', 'L2'] }),
      spec({ type: 'point', id: 'A', parents: [1, 3] }),
      spec({ type: 'point', id: 'A2', parents: LEGACY.reflect('A', 's1') }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)[0]).toBeCloseTo(1);
    expect(at(r.elMap.A2)[1]).toBeCloseTo(-3);

    (r.elMap.L2 as any).setPosition(1, [4, 4]);
    b.update();
    // mirrored in y = x, the copy swaps its coordinates
    expect(at(r.elMap.A2)[0]).toBeCloseTo(3);
    expect(at(r.elMap.A2)[1]).toBeCloseTo(1);
  });

  it('builds a declarative image point and keeps it out of JSXGraph attrs', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'O', parents: [0, 0] }),
      spec({ type: 'point', id: 'A', parents: [2, 0] }),
      spec({
        type: 'point', id: 'A2', parents: ['A'],
        attrs: { image: { op: 'rotate', of: ['O'], angle: 180 } },
      }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(at(r.elMap.A2)[0]).toBeCloseTo(-2);
    expect(at(r.elMap.A2)[1]).toBeCloseTo(0);
    expect((r.elMap.A2 as any).visProp.image).toBeUndefined();
  });

  it('reports an image point whose source is not on the board', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'point', id: 'A2', parents: ['ghost'],
      attrs: { image: { op: 'translate', of: [], dx: 1, dy: 1 } },
    }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/không tồn tại/);
  });

  it('refuses an image point with more than its source as parent', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'point', id: 'A2', parents: ['A', 'B'],
      attrs: { image: { op: 'translate', of: [], dx: 1, dy: 1 } },
    }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/cần 1 đối tượng cha/);
  });
});

// The Context menu writes these into the document, so a style chosen with the
// mouse has to survive a save like any other attribute.
describe('the Display attributes the Context menu writes', () => {
  it('gives a point the radius GSP calls its style', () => {
    const b = newBoard();
    const { obj } = createElement(b, spec({ type: 'point', id: 'p1', parents: [1, 1], attrs: { size: 5 } }));
    expect(obj.visProp.size).toBe(5);
  });

  it('stacks an interior by the layer the document carries', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'a', parents: [1, 2] }),
      spec({ type: 'point', id: 'b', parents: [3, 4] }),
      spec({ type: 'point', id: 'c', parents: [5, 2] }),
      spec({ type: 'polygon', id: 'pg', parents: ['a', 'b', 'c'], attrs: { layer: 12 } }),
    ]);
    expect(r.errors).toEqual([]);
    expect((r.elMap.pg as any).visProp.layer).toBe(12);
  });

  it('reloads a label or a trace that was toggled from the menu', () => {
    const b = newBoard();
    const elements = [
      spec({ type: 'point', id: 'A', parents: [2, 3], attrs: { withLabel: true, trace: true } }),
    ];
    const r = loader(b, elements);
    expect(r.errors).toEqual([]);
    expect((r.elMap.A as any).visProp.withlabel).toBe(true);
    expect((r.elMap.A as any).visProp.trace).toBe(true);
  });
});

// A desktop calculation used to arrive as the number the exporter had already
// worked out. With a declarative op it arrives as the expression, so the board
// has to answer the same number — and keep answering it as the geometry moves.
describe('a calculation over the real board', () => {
  const shown = (obj: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = obj;
    return String(t?.plaintext ?? '');
  };

  const elements = [
    spec({ type: 'point', id: 'A', parents: [1, 1] }),
    spec({ type: 'point', id: 'B', parents: [4, 5] }),
    spec({ type: 'segment', id: 'seg', parents: ['A', 'B'] }),
    spec({
      type: 'text', id: 'm1', parents: [0, 6, 'AB'],
      attrs: { measure: { op: 'length', args: ['seg'], label: 'AB', precision: 2 } },
    }),
    spec({
      type: 'text', id: 'c1', parents: [0, 7, 'AB/2'],
      attrs: {
        measure: {
          op: 'calculate', args: ['m1'], expr: '#0/2', label: 'AB/2', precision: 2,
        },
      },
    }),
  ];

  it('reads the number its operands display', () => {
    const b = newBoard();
    const r = loader(b, elements);
    expect(r.errors).toEqual([]);
    b.update();
    expect(shown(r.elMap.m1)).toBe('AB = 5.00');
    expect(shown(r.elMap.c1)).toBe('AB/2 = 2.50');
  });

  it('recalculates when a point it depends on moves', () => {
    const b = newBoard();
    const r = loader(b, elements);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.elMap.B as any).moveTo([1, 1]);
    b.update();
    expect(shown(r.elMap.m1)).toBe('AB = 0.00');
    expect(shown(r.elMap.c1)).toBe('AB/2 = 0.00');
  });

  it('refuses a calculation that asks for an operand the document never listed', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [1, 1] }),
      spec({ type: 'point', id: 'B', parents: [2, 1] }),
      spec({
        type: 'text', id: 'c1', parents: [0, 3, 'C1'],
        attrs: { measure: { op: 'calculate', args: ['A', 'B'], expr: '#0+#5', label: 'C1' } },
      }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    expect(shown(r.elMap.c1)).toBe('…');
  });
});

// The desktop measures an arc by its curve, not its chord, and areas a sector
// or an arc segment. Both arrive as descriptors now, so the numbers the web
// prints have to come out of the element the board actually drew.
describe('an arc measured over the real board', () => {
  const shown = (obj: unknown): string => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t: any = obj;
    return String(t?.plaintext ?? '');
  };
  const caption = (op: string, args: string[], label: string, over: Record<string, unknown> = {}) =>
    spec({
      type: 'text', id: `${op}${args.join('')}`, parents: [0, 9, label],
      attrs: { measure: { op, args, label, precision: 2, ...over } },
    });

  // A is the centre, S the first point, E the one the arc turns to: a quarter
  // of a circle of radius 2, so the curve is π long.
  const QUARTER = [
    spec({ type: 'point', id: 'A', parents: [1, 1] }),
    spec({ type: 'point', id: 'S', parents: [3, 1] }),
    spec({ type: 'point', id: 'E', parents: [1, 3] }),
    spec({ type: 'arc', id: 'ar', parents: ['A', 'S', 'E'] }),
    spec({ type: 'sector', id: 'se', parents: ['A', 'S', 'E'] }),
    caption('arcLength', ['ar'], 'cung', { unit: ' cm' }),
    caption('arcAngle', ['ar'], 'α', { unit: '°' }),
    caption('segmentArea', ['ar'], 'chúng', { unit: ' cm²' }),
    caption('area', ['se'], 'quạt', { unit: ' cm²' }),
  ];

  it('measures the curve the board drew', () => {
    const b = newBoard();
    const r = loader(b, QUARTER);
    expect(r.errors).toEqual([]);
    b.update();
    expect(shown(r.elMap['arcLengthar'])).toBe('cung = 3.14 cm');
    expect(shown(r.elMap['arcAnglear'])).toBe('α = 90.00°');
    // the bow between the curve and its chord
    expect(shown(r.elMap['segmentAreaar'])).toBe('chúng = 1.14 cm²');
    expect(shown(r.elMap['arease'])).toBe('quạt = 3.14 cm²');
  });

  it('follows the arc when its end point goes the long way round', () => {
    const b = newBoard();
    const r = loader(b, QUARTER);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.elMap.E as any).moveTo([1, -1]);
    b.update();
    expect(shown(r.elMap['arcAnglear'])).toBe('α = 270.00°');
    expect(shown(r.elMap['arcLengthar'])).toBe('cung = 9.42 cm');
    expect(shown(r.elMap['segmentAreaar'])).toBe('chúng = 11.42 cm²');
  });

  it('measures the arc through three points too', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'S', parents: [3, 1] }),
      spec({ type: 'point', id: 'E', parents: [1, 3] }),
      spec({ type: 'point', id: 'A', parents: [1, 1] }),
      spec({ type: 'circumcirclearc', id: 'ca', parents: ['E', 'A', 'S'] }),
      caption('arcLength', ['ca'], 'cung'),
      caption('arcAngle', ['ca'], 'α', { unit: '°' }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    // from E through A to S: the circumcentre is (2, 2), the radius √2, and the
    // arc is exactly the half turn that leaves out the corner at (3, 3)
    expect(shown(r.elMap['arcAngleca'])).toBe('α = 180.00°');
    expect(shown(r.elMap['arcLengthca'])).toBe(`cung = ${(Math.PI * Math.SQRT2).toFixed(2)}`);
  });
});
