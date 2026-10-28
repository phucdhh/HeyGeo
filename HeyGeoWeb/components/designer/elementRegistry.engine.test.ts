// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createElement,
  unresolvedParentId,
  type ElementSpec,
} from './elementRegistry';
import { anchorClosures, captionAnchor, type MeasureSpec } from './measurement';
import { calculateSpec, numberSources } from './numberMenuModel';
import { frameElements } from './coordsysModel';
import { measureItems } from './measureMenuModel';
import { functionPlot, parametricPlot, PLOT_SAMPLES, type PlotSpec } from './plotModel';
import type { PlotPointSpec } from './plotPointModel';
import type { HeyGeoElement } from './designTypes';

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
    // the curve the designer types, which is measured in a frame and not in the page
    spec({
      type: 'plot', id: 'plot1', parents: ['A', 'B', 'C'],
      attrs: { plot: functionPlot('x^2-2') },
    }),
    spec({ type: 'ticks', id: 'tk1', parents: ['l1', 1] }),
    spec({ type: 'anglebisector', id: 'ab1', parents: ['B', 'A', 'C'] }),
    spec({ type: 'transform', id: 'tr1', parents: [1, 0], attrs: { type: 'translate' } }),
    spec({ type: 'transform', id: 'tr2', parents: ['s1'], attrs: { type: 'reflect' } }),
    // a reflected copy uses the transform as a parent, the desktop spelling
    spec({ type: 'point', id: 'Cimg', parents: ['C', 'tr2'] }),
    // the button Edit | Action Buttons | Hide/Show makes over point A
    spec({
      type: 'actionbutton', id: 'btn1', parents: [6, 6.5, 'Ẩn A'],
      attrs: { button: { action: 'hide', name: 'A', targets: ['A'] } },
    }),
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

  it('draws a circle whose radius is a segment and follows that segment', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [3, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      spec({ type: 'circle', id: 'c1', parents: ['A', 's1'] }),
    ]);
    expect(r.errors).toEqual([]);
    expect((r.elMap.c1 as any).Radius()).toBeCloseTo(3);
    (r.elMap.B as any).moveTo([5, 0]);
    b.update();
    expect((r.elMap.c1 as any).Radius()).toBeCloseTo(5);
  });

  it('draws a circle from a distance reading, scale and all', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [3, 0] }),
      spec({
        type: 'text', id: 'm1', parents: [1, 6, ''],
        attrs: { measure: { op: 'distance', args: ['A', 'B'], scale: 2 } },
      }),
      spec({ type: 'circle', id: 'c1', parents: ['A', 'm1'] }),
    ]);
    expect(r.errors).toEqual([]);
    expect((r.elMap.c1 as any).Radius()).toBeCloseTo(6);
    (r.elMap.B as any).moveTo([4, 0]);
    b.update();
    expect((r.elMap.c1 as any).Radius()).toBeCloseTo(8);
  });

  it('draws a circle interior as the filled disc the desktop exports', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [3, 0] }),
      spec({ type: 'circle', id: 'c1', parents: ['A', 'B'] }),
      spec({
        type: 'circle', id: 'int1', parents: ['A', 'B'],
        attrs: {
          strokeColor: '#1e3c96', strokeOpacity: 0,
          fillColor: '#1e3c96', fillOpacity: 0.12,
          hasInnerPoints: true, withLabel: false,
        },
      }),
    ]);
    expect(r.errors).toEqual([]);
    const disc = r.elMap.int1 as any;
    expect(disc.elType).toBe('circle');
    expect(disc.visProp.fillopacity).toBeCloseTo(0.12);
    expect(disc.visProp.strokeopacity).toBeCloseTo(0);
    expect(disc.visProp.hasinnerpoints).toBe(true);
  });

  it('samples a locus as many times as the document says, and resamples on change', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [5, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      spec({ type: 'glider', id: 'G', parents: [2, 0, 's1'] }),
      spec({ type: 'midpoint', id: 'M', parents: ['A', 'G'] }),
      spec({ type: 'tracecurve', id: 'lc1', parents: ['G', 'M'], attrs: { numberPoints: 40 } }),
    ]);
    expect(r.errors).toEqual([]);
    const locus = r.elMap.lc1 as any;
    expect(locus.elType).toBe('curve');
    expect(locus.dataX.length).toBe(41);

    locus.setAttribute({ numberPoints: 60 });
    b.update();
    expect(locus.dataX.length).toBe(61);
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

  // Edit | Action Buttons | Hide/Show writes a boxed caption that acts on the
  // elements it names. Pressing it is the canvas's business; what the document
  // has to rebuild is a caption at the place it was put, plus the descriptor
  // that says what a press will do.
  it('draws an action button as a boxed caption and keeps the descriptor out of the engine', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [1, 1] }),
      spec({
        type: 'actionbutton', id: 'btn', parents: [6, 6.5, 'Ẩn A'],
        attrs: { button: { action: 'hide', name: 'A', targets: ['A'] } },
      }),
    ]);
    expect(r.errors).toEqual([]);
    const btn = r.elMap.btn as any;
    expect(btn.elType).toBe('text');
    expect(String(btn.plaintext)).toBe('Ẩn A');
    expect(btn.visProp.display).toBe('html');
    // the button's own styling is the registry's, and its descriptor is data
    expect(String(btn.visProp.cssstyle)).toContain('border-radius');
    expect(btn.visProp.button).toBeUndefined();
    b.update();
    expect(btn.XEval()).toBeCloseTo(6);
    expect(btn.YEval()).toBeCloseTo(6.5);
  });

  it('reports a button whose target is not on the board', () => {
    const b = newBoard();
    const before = Object.keys(b.objects).length;
    const out = createElement(b, spec({
      type: 'actionbutton', id: 'btn', parents: [6, 6.5, 'Ẩn ghost'],
      attrs: { button: { action: 'hide', name: 'ghost', targets: ['ghost'] } },
    }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/không tồn tại/);
    expect(Object.keys(b.objects).length).toBe(before);
  });

  it('refuses a button that does not say what it does', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'actionbutton', id: 'btn', parents: [6, 6.5, 'nút'],
    }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/mô tả/);
  });

  // Display | Animate Objects… steps two engine properties: a glider's position
  // along its path and a parameter's value in its range. This is those two
  // properties doing what the animation model assumes they do.
  it('moves a glider along its path and a parameter through its range', () => {
    const b = newBoard();
    const r = loader(b, [
      spec({ type: 'point', id: 'A', parents: [0, 0] }),
      spec({ type: 'point', id: 'B', parents: [4, 0] }),
      spec({ type: 'segment', id: 's1', parents: ['A', 'B'] }),
      spec({ type: 'glider', id: 'G', parents: [1, 2, 's1'] }),
      spec({ type: 'slider', id: 'a', parents: [[0, 5], [3, 5], [0, 4, 10]] }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();

    const g = r.elMap.G as any;
    // the glider remembers how far along it was left, which is what a run seeds
    expect(Number(g.position)).toBeCloseTo(0.25);
    g.setGliderPosition(0.5);
    b.update();
    expect(g.X()).toBeCloseTo(2);
    expect(g.Y()).toBeCloseTo(0);
    expect(Number(g.position)).toBeCloseTo(0.5);

    const a = r.elMap.a as any;
    a.setValue(6);
    b.update();
    expect(a.Value()).toBeCloseTo(6);
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

  it('keeps the label text Display | Label Object… writes', () => {
    const b = newBoard();
    const elements = [
      spec({ type: 'point', id: 'A', parents: [2, 3], attrs: { name: 'P' } }),
      spec({ type: 'segment', id: 's1', parents: ['A', [4, 3]], attrs: { name: 'd' } }),
    ];
    const r = loader(b, elements);
    expect(r.errors).toEqual([]);
    expect((r.elMap.A as any).name).toBe('P');
    expect((r.elMap.s1 as any).name).toBe('d');
  });

  // The exporter writes Display | Font as label.fontSize plus the family as a
  // CSS stack in label.fontFamily. JSXGraph has no fontFamily attribute, so the
  // registry has to turn it into the cssStyle its label actually draws from —
  // otherwise every desktop sketch reopens in the engine's Arial at 12pt.
  it('draws a desktop label in the face and size the exporter wrote', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'point', id: 'A', parents: [2, 3],
      attrs: {
        name: 'A',
        label: { fontSize: 20, fontFamily: "'Times New Roman', Georgia, serif" },
      },
    }));
    expect(out.obj).toBeTruthy();
    b.update();
    expect(out.obj.label.visProp.fontsize).toBe(20);
    expect(out.obj.label.rendNode.style.fontFamily).toContain('Times New Roman');
  });

  it('keeps the declarations a label already had beside its new family', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'point', id: 'A', parents: [2, 3],
      attrs: {
        name: 'A',
        label: {
          cssStyle: 'font-style: italic',
          fontFamily: 'Arial, Helvetica, sans-serif',
        },
      },
    }));
    b.update();
    expect(out.obj.label.rendNode.style.fontStyle).toBe('italic');
    expect(out.obj.label.rendNode.style.fontFamily).toContain('Arial');
  });

  it('draws a caption at the size Display | Font stores on it', () => {
    const b = newBoard();
    const out = createElement(b, spec({
      type: 'text', id: 't1', parents: [1, 2, 'AB'],
      attrs: { fontSize: 30 },
    }));
    b.update();
    expect(out.obj.visProp.fontsize).toBe(30);
    expect(out.obj.rendNode.style.fontSize).toBe('30px');
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

// Construct | Arc On Circle authors [centre, start, end] — the same shape the
// desktop exporter writes — with the start a glider on the circle, so the arc
// spans whatever quarter the designer slides it to.
describe('an arc on a circle the designer picks', () => {
  const elements = [
    spec({ type: 'point', id: 'A', parents: [1, 1], attrs: { name: 'A' } }),
    spec({ type: 'point', id: 'B', parents: [3, 1], attrs: { name: 'B' } }),
    spec({ type: 'circle', id: 'c1', parents: ['A', 'B'] }),
    spec({ type: 'glider', id: 'S', parents: [3, 1, 'c1'] }),
    spec({ type: 'point', id: 'E', parents: [1, 3] }),
    spec({ type: 'arc', id: 'ar', parents: ['A', 'S', 'E'] }),
  ];

  it('sweeps counterclockwise from the first point to the second', () => {
    const b = newBoard();
    const r = loader(b, elements);
    expect(r.errors).toEqual([]);
    b.update();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arc = r.elMap.ar as any;
    expect(arc.elType).toBe('arc');
    expect(arc.dataX[0]).toBeCloseTo(3, 6);
    expect(arc.dataY[0]).toBeCloseTo(1, 6);
    expect(arc.dataX[arc.dataX.length - 1]).toBeCloseTo(1, 6);
    expect(arc.dataY[arc.dataY.length - 1]).toBeCloseTo(3, 6);
  });

  it('turns with the glider it starts at', () => {
    const b = newBoard();
    const r = loader(b, elements);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.elMap.S as any).moveTo([1, -1]);
    b.update();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arc = r.elMap.ar as any;
    expect(arc.dataX[0]).toBeCloseTo(1, 6);
    expect(arc.dataY[0]).toBeCloseTo(-1, 6);
    expect(arc.dataX[arc.dataX.length - 1]).toBeCloseTo(1, 6);
    expect(arc.dataY[arc.dataY.length - 1]).toBeCloseTo(3, 6);
  });
});

// Choosing Measure | Area writes its caption beside the shape, through the
// anchor captionAnchor gives the designer. The number has to keep its place over
// the shape as the shape is dragged, because that anchor is the only position
// the document stores.
describe('a caption the designer places', () => {
  const polygon = [
    spec({ type: 'point', id: 'A', parents: [1, 1] }),
    spec({ type: 'point', id: 'B', parents: [4, 1] }),
    spec({ type: 'point', id: 'C', parents: [1, 4] }),
    spec({ type: 'polygon', id: 'poly', parents: ['A', 'B', 'C'] }),
  ];
  const area: MeasureSpec = {
    op: 'area', args: ['poly'], label: 'Area ABC', precision: 2, unit: ' cm\u00b2',
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where = (t: any): [number, number] => [t.XEval(), t.YEval()];

  it('sits on the shape it measures and follows it when the shape moves', () => {
    const b = newBoard();
    const r = loader(b, polygon);
    expect(r.errors).toEqual([]);
    const anchor = captionAnchor(area, []);
    const [x, y] = anchorClosures(b, anchor);
    const cap = loader(b, [
      spec({
        type: 'text', id: 'cap', parents: [x(), y(), 'Area ABC'],
        attrs: { measure: area, anchor },
      }),
    ]);
    expect(cap.errors).toEqual([]);
    b.update();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text: any = cap.elMap.cap;
    // JSXGraph closes a polygon by repeating its first vertex, so its centroid
    // is the average of four points; the caption was placed over that.
    expect(where(text)).toEqual([1.75, 1.75]);
    expect(String(text.plaintext)).toBe('Area ABC = 4.50 cm\u00b2');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r.elMap.C as any).moveTo([1, 7]);
    b.update();
    expect(where(text)).toEqual([1.75, 2.5]);
    expect(String(text.plaintext)).toBe('Area ABC = 9.00 cm\u00b2');
  });

  it('steps clear of a caption already attached to the same shape', () => {
    const b = newBoard();
    const r = loader(b, polygon);
    expect(r.errors).toEqual([]);
    const written = [{ attrs: { measure: area, anchor: captionAnchor(area, []) } }];
    const perimeter: MeasureSpec = {
      op: 'perimeter', args: ['poly'], label: 'Perimeter ABC', precision: 2, unit: ' cm',
    };
    // the area caption already holds the centroid, so the perimeter one goes a
    // line below its own place: half a line for the shape, half for the caption
    const [, y] = anchorClosures(b, captionAnchor(perimeter, written));
    expect(y()).toBeCloseTo(1.75 - 1, 6);
  });
});

// Number | Calculate… writes its descriptor with calculateSpec, over the numbers
// numberSources found in the document. This is the two of them meeting a real
// board: the calculation has to read the length caption and the slider, and keep
// reading them as the figure and the slider move.
describe('a calculation the designer builds', () => {
  const BOARD = [
    spec({ type: 'point', id: 'A', parents: [1, 1] }),
    spec({ type: 'point', id: 'B', parents: [4, 1] }),
    spec({ type: 'segment', id: 'seg', parents: ['A', 'B'] }),
    spec({
      type: 'text', id: 'm1', parents: [0, 6, 'AB'],
      attrs: { measure: { op: 'length', args: ['seg'], label: 'AB', precision: 2, unit: ' cm' } },
    }),
    spec({ type: 'slider', id: 'sl', parents: [[1, 9], [5, 9], [0, 10, 20]], attrs: { name: 'a' } }),
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const shown = (obj: any): string => String(obj?.plaintext ?? '');

  it('reads the caption and the slider it was built from, and goes on reading them', () => {
    const b = newBoard();
    const r = loader(b, BOARD);
    expect(r.errors).toEqual([]);

    const sources = numberSources(BOARD as unknown as HeyGeoElement[]);
    expect(sources).toEqual([
      { id: 'm1', label: 'AB' },
      { id: 'sl', label: 'a' },
    ]);
    const measure = calculateSpec('#0 + 2*#1', ['m1', 'sl'], sources);
    expect(measure.label).toBe('AB + 2*a');

    const cap = loader(b, [
      spec({
        type: 'text', id: 'cap', parents: [5, 5, measure.label],
        attrs: { measure, anchor: captionAnchor(measure, BOARD as unknown as HeyGeoElement[]) },
      }),
    ]);
    expect(cap.errors).toEqual([]);
    b.update();
    expect(shown(cap.elMap.cap)).toBe('AB + 2*a = 23.00');

    r.elMap.B.moveTo([7, 1]);
    b.update();
    expect(shown(cap.elMap.cap)).toBe('AB + 2*a = 26.00');

    r.elMap.sl.setValue(15);
    b.update();
    expect(shown(cap.elMap.cap)).toBe('AB + 2*a = 36.00');
  });
});

// Graph | Define Coordinate System marks a frame on one point and writes four
// more elements beside it; the Measure menu then reads every point through that
// frame instead of through the board. This is the frame and its numbers on a
// real board.
describe('a coordinate system the designer marks', () => {
  const DOC: HeyGeoElement[] = [
    ...frameElements(
      {
        origin: { id: 'O', name: 'O', coords: [2, 3] },
        unit: { id: 'U', name: 'U', coords: [4, 3] },
      },
      []
    ),
    spec({ type: 'point', id: 'P', parents: [5, 4], attrs: { name: 'P' } }) as unknown as HeyGeoElement,
  ];
  const frame = DOC.slice(0, 5);
  const toSpec = (el: HeyGeoElement) =>
    spec({ type: el.type, id: el.id, parents: [...el.parents], attrs: { ...el.attrs } });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = (t: any) => String(t?.plaintext ?? '');

  /** The caption Measure | <row> writes for P, as the menu itself builds it. */
  const row = (id: string): MeasureSpec =>
    measureItems(DOC, ['P']).find((i) => i.id === id)!.specs[0];

  /** The point P and the captions, on a board that already holds the frame. */
  const writeCaptions = (board: any, specs: MeasureSpec[]) =>
    loader(board, [
      toSpec(DOC[5]),
      ...specs.map((s, i) =>
        spec({
          type: 'text', id: `c${i}`, parents: [6, 6, s.label ?? ''],
          attrs: { measure: s, anchor: captionAnchor(s, []) },
        })),
    ]);

  it('stands the y-axis a quarter turn away from the unit point', () => {
    const b = newBoard();
    const r = loader(b, frame.map(toSpec));
    expect(r.errors).toEqual([]);
    b.update();

    // U is two board units right of O, so one axis unit is 2 and the hidden
    // point that gives the y-axis its direction sits two units above O.
    expect(r.elMap.O_v.X()).toBeCloseTo(2, 6);
    expect(r.elMap.O_v.Y()).toBeCloseTo(5, 6);
    expect(r.elMap.O_x.point1).toBe(r.elMap.O);
    expect(r.elMap.O_x.point2).toBe(r.elMap.U);
    expect(r.elMap.O_y.point2).toBe(r.elMap.O_v);
    expect(r.elMap.O_v.visProp.visible).toBe(false);
    // the frame mark is the designer's, never JSXGraph's
    expect(r.elMap.O.visProp.coordsys).toBeUndefined();
  });

  it('reads a point through the frame the document marked', () => {
    const b = newBoard();
    const specs = ['coordinates', 'abscissa', 'ordinate'].map(row);
    expect(specs.map((s) => s.op)).toEqual(['relativeCoordinates', 'relativeAbscissa', 'relativeOrdinate']);
    loader(b, frame.map(toSpec));
    const cap = writeCaptions(b, specs);
    expect(cap.errors).toEqual([]);
    b.update();

    // P is 3 board units right of the origin and 1 above it, in a frame whose
    // unit is 2 board units long.
    expect(text(cap.elMap.c0)).toBe('P = (1.50; 0.50)');
    expect(text(cap.elMap.c1)).toContain('1.50');
    expect(text(cap.elMap.c2)).toContain('0.50');
  });

  it('keeps the numbers when the frame travels and changes them when its unit does', () => {
    const b = newBoard();
    loader(b, frame.map(toSpec));
    const cap = writeCaptions(b, [row('coordinates')]);
    b.update();
    expect(text(cap.elMap.c0)).toBe('P = (1.50; 0.50)');

    // what the canvas does when the origin is dragged: the unit travels with it
    b.objects.O.moveTo([1, 4]);
    b.update();
    b.objects.U.moveTo([3, 4]);
    b.update();
    expect(text(cap.elMap.c0)).toBe('P = (2.00; 0.00)');

    // dragging the unit point alone rescales the frame instead
    b.objects.U.moveTo([3, 3]);
    b.objects.O.moveTo([2, 3]);
    b.update();
    expect(text(cap.elMap.c0)).toBe('P = (3.00; 1.00)');
  });
});

// Graph | Plot Function writes the formula the designer typed together with the
// three points of the frame it was plotted on. The curve is measured through that
// frame — the way Sketchpad's plot is a child of its coordinate system — so it
// lands on the frame's numbers and follows the frame when it is dragged.
describe('a curve plotted on the marked frame', () => {
  const FRAME = frameElements(
    {
      origin: { id: 'O', name: 'O', coords: [2, 3] },
      unit: { id: 'U', name: 'U', coords: [4, 3] },
    },
    []
  ).map((el) => spec({ type: el.type, id: el.id, parents: [...el.parents], attrs: { ...el.attrs } }));

  const plotted = (plot: PlotSpec, id = 'g1') =>
    spec({ type: 'plot', id, parents: ['O', 'U', 'O_v'], attrs: { plot } });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const curveOf = (obj: any): any => obj;

  it('is measured in the frame, not on the page', () => {
    const b = newBoard();
    const r = loader(b, [...FRAME, plotted(functionPlot('x'))]);
    expect(r.errors).toEqual([]);
    b.update();
    const curve = curveOf(r.elMap.g1);
    expect(curve.elType).toBe('curve');
    // the frame's unit point reaches two board numbers, so its 2 is four units out
    expect(curve.X(2)).toBeCloseTo(6, 6);
    expect(curve.Y(2)).toBeCloseTo(7, 6);
    // its domain is the frame's numbers, sampled the desktop's 300 times
    expect(curve.X(-5)).toBeCloseTo(-8, 6);
    expect(curve.X(5)).toBeCloseTo(12, 6);
    expect(curve.visProp.numberpoints).toBe(PLOT_SAMPLES);
    // the descriptor is the designer's, never JSXGraph's
    expect(curve.visProp.plot).toBeUndefined();
  });

  it('re-scales when the designer drags the frame', () => {
    const b = newBoard();
    const r = loader(b, [...FRAME, plotted(functionPlot('x^2-2'))]);
    b.update();
    const curve = curveOf(r.elMap.g1);
    // the vertex is the frame's (0, -2), two board numbers below the origin
    expect(curve.Y(0)).toBeCloseTo(-1, 6);

    // dragging the unit point in to one board number rescales the curve with it
    b.objects.U.moveTo([3, 3]);
    b.update();
    expect(curve.Y(0)).toBeCloseTo(1, 6);
    expect(curve.X(2)).toBeCloseTo(4, 6);
  });

  it('has no point where the expression has none', () => {
    const b = newBoard();
    const r = loader(b, [...FRAME, plotted(functionPlot('sqrt(x)'))]);
    b.update();
    const curve = curveOf(r.elMap.g1);
    // the frame's left half is not part of the curve, and it does not join across
    expect(Number.isFinite(curve.Y(-1))).toBe(false);
    expect(curve.Y(4)).toBeCloseTo(7, 6);
  });

  it('draws a parametric curve with the sampling its dialog was answered with', () => {
    const b = newBoard();
    const circle = parametricPlot('cos(t)', 'sin(t)', [0, 2 * Math.PI], 120);
    const r = loader(b, [...FRAME, plotted(circle, 'g2')]);
    expect(r.errors).toEqual([]);
    b.update();
    const curve = curveOf(r.elMap.g2);
    // the frame's unit point is two board numbers out, so the unit circle has
    // radius 2 around the frame's origin
    expect(curve.X(0)).toBeCloseTo(4, 6);
    expect(curve.Y(0)).toBeCloseTo(3, 6);
    expect(curve.Y(Math.PI / 2)).toBeCloseTo(5, 6);
    expect(curve.X(Math.PI)).toBeCloseTo(0, 6);
    // the count the designer typed replaces the entry's own default
    expect(curve.visProp.numberpoints).toBe(120);
    // and it is still a descriptor, never a jsxgraph property
    expect(curve.visProp.plot).toBeUndefined();
  });

  it('refuses a formula that reads a name the curve does not have', () => {
    const b = newBoard();
    loader(b, FRAME);
    const out = createElement(b, plotted({ x: 'x', y: 'y+1', variable: 'x', from: -5, to: 5 }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/y/);
  });

  it('reports a curve whose frame is not on the board', () => {
    const b = newBoard();
    const r = loader(b, [plotted(functionPlot('x'))]);
    expect(r.loaded).toBe(0);
    expect(r.errors.join(' ')).toMatch(/không tồn tại|cha/);
  });
});

// Graph | Plot as (x, y)… writes a point whose place is two expressions over the
// numbers of the page, measured through the marked frame. This is that descriptor
// meeting a real board: the point is placed by what it reads, follows it, and is
// refused rather than drawn invisible when the document asks for something the
// page cannot answer.
describe('a point plotted from the page’s numbers', () => {
  const FRAME = frameElements(
    {
      origin: { id: 'O', name: 'O', coords: [0, 0] },
      unit: { id: 'U', name: 'U', coords: [1, 0] },
    },
    []
  ).map((el) => spec({ type: el.type, id: el.id, parents: [...el.parents], attrs: { ...el.attrs } }));

  // a parameter and a length caption: the two kinds of number Number | Calculate…
  // reads, and the two a plot point is written from
  const NUMBERS = [
    spec({ type: 'slider', id: 'a', parents: [[-4, 5], [-1, 5], [0, 3, 10]], attrs: { name: 'a' } }),
    spec({ type: 'point', id: 'A', parents: [-2, -1] }),
    spec({ type: 'point', id: 'B', parents: [1, 3] }),
    spec({
      type: 'text', id: 'd', parents: [-4, 4, 'AB'],
      attrs: { measure: { op: 'distance', args: ['A', 'B'], label: 'AB', precision: 2 } },
    }),
  ];

  const plottedPoint = (plotAt: PlotPointSpec, id = 'P') =>
    spec({ type: 'point', id, parents: ['O', 'U', 'O_v'], attrs: { plotAt } });

  it('is placed by the numbers it reads, and follows them', () => {
    const b = newBoard();
    const r = loader(b, [
      ...FRAME,
      ...NUMBERS,
      plottedPoint({ shape: 'rectangular', x: '#0 + #1', y: '#0/3', args: ['a', 'd'] }),
    ]);
    expect(r.errors).toEqual([]);
    b.update();
    // a = 3 and AB = 5 on a frame whose unit is 1: (8, 1), and no root of the page
    expect(r.elMap.P.X()).toBeCloseTo(8, 6);
    expect(r.elMap.P.Y()).toBeCloseTo(1, 6);
    expect(r.elMap.P.visProp.plotAt).toBeUndefined();

    // sliding the parameter moves the point: it reads the number, not a snapshot
    b.objects.a.setValue(6);
    b.update();
    expect(r.elMap.P.X()).toBeCloseTo(11, 6);
    expect(r.elMap.P.Y()).toBeCloseTo(2, 6);

    // and a longer unit on the frame moves it as a change of scale does
    b.objects.U.moveTo([2, 0]);
    b.update();
    expect(r.elMap.P.X()).toBeCloseTo(22, 6);
    expect(r.elMap.P.Y()).toBeCloseTo(4, 6);
  });

  it('takes a polar place in degrees, the unit the desktop measures angles in', () => {
    const b = newBoard();
    const r = loader(b, [
      ...FRAME,
      ...NUMBERS,
      plottedPoint({ shape: 'polar', x: '2', y: '90', args: [] }, 'Q'),
    ]);
    b.update();
    // a radius of 2 turned a quarter turn is (0, 2) in the frame's numbers
    expect(r.elMap.Q.X()).toBeCloseTo(0, 6);
    expect(r.elMap.Q.Y()).toBeCloseTo(2, 6);
  });

  it('refuses a coordinate that reads a name the point does not have', () => {
    const b = newBoard();
    loader(b, [...FRAME, ...NUMBERS]);
    const out = createElement(b, plottedPoint({ shape: 'rectangular', x: 'a', y: '#0', args: ['a'] }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/a/);
  });

  it('refuses a coordinate that reads a number the point was not given', () => {
    const b = newBoard();
    loader(b, [...FRAME, ...NUMBERS]);
    const out = createElement(b, plottedPoint({ shape: 'rectangular', x: '#2', y: '#0', args: ['a'] }));
    expect(out.obj).toBeNull();
    expect(out.error).toMatch(/số thứ 3/);
  });

  it('reports a point whose frame is not on the board', () => {
    const r = loader(newBoard(), [
      plottedPoint({ shape: 'rectangular', x: '1', y: '1', args: [] }),
    ]);
    expect(r.loaded).toBe(0);
    expect(r.errors.join(' ')).toMatch(/không tồn tại|cha/);
  });
});
