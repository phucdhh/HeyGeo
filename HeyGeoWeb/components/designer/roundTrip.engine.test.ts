// @vitest-environment jsdom
/**
 * P0.6 — the baseline that says a document survives its own storage.
 *
 * Everything else in this folder tests one mechanism. This file asks the
 * question the user actually experiences: build a construction, save it, open
 * it again, and is the picture the same? The comparison is made on what the
 * engine drew — every node in the board container, its geometry attributes and
 * the text it renders — because two boards whose markup agrees really are the
 * same drawing, while comparing element lists only proves the JSON survived.
 *
 * A model that fails here is not a display bug: it means the document does not
 * contain enough to rebuild the construction, which is what P0 was for.
 */
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyScene, coordParents, gatherSelectionPoints, syncPositions, takeScene } from './sceneModel';
import { coordsysOf, verticalElement } from './coordsysModel';
import { arrowDragMap } from './transforms';
import { functionPlot, parametricPlot, PLOT_SAMPLES } from './plotModel';
import { withSliderValue } from './animationModel';
import type { HeyGeoElement } from './designTypes';

/* eslint-disable @typescript-eslint/no-explicit-any */
let JXG: any;

/**
 * A board with a size. jsdom lays nothing out, so a container left unstyled
 * reports 0x0, JSXGraph maps every user coordinate to pixel 0 and the drawing
 * below would compare a board full of zeroes. The inline style is what the
 * engine reads to decide its pixel size.
 */
function newBoard(): any {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '600px';
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, {
    boundingbox: [-8, 8, 8, -8],
    showCopyright: false,
    showNavigation: false,
    axis: false,
    grid: false,
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

/**
 * One of each thing the designer can put on a board, in construction order.
 * Deliberately includes the two kinds of stored data that used to be code:
 * a measurement caption with an anchor, and transformed points.
 */
const kitchenSink = (): HeyGeoElement[] => [
  // free points, a vector and a mirror to transform with
  el({ type: 'point', id: 'A', parents: [-3, 1], attrs: { name: 'A' } }),
  el({ type: 'point', id: 'B', parents: [2, 4], attrs: { name: 'B' } }),
  el({ type: 'point', id: 'O', parents: [0, 0], attrs: { name: 'O', coordsys: { unit: 'U' } } }),
  // the coordinate system Graph marked on O: its unit point, the y-direction
  // that follows from it, and the two axes drawn through them
  el({ type: 'point', id: 'U', parents: [2, 0], attrs: { name: 'U' } }),
  el({ type: 'point', id: 'O_v', parents: ['U'], attrs: { name: '', visible: false, image: { op: 'rotate', of: ['O'], angle: 90 } } }),
  el({ type: 'line', id: 'O_x', parents: ['O', 'U'], attrs: { name: 'x' } }),
  el({ type: 'line', id: 'O_y', parents: ['O', 'O_v'], attrs: { name: 'y' } }),
  el({ type: 'point', id: 'V', parents: [3, -2], attrs: { name: 'V' } }),
  el({ type: 'segment', id: 'vec', parents: ['O', 'V'], attrs: { strokeColor: '#888888' } }),
  el({ type: 'line', id: 'mirror', parents: ['A', 'B'], attrs: { dash: 1 } }),
  // images of A: translate by the marked vector, rotate about O, dilate, reflect
  el({ type: 'point', id: 'At', parents: ['A'], attrs: { name: "A'", image: { op: 'translate', of: ['O', 'V'] } } }),
  el({ type: 'point', id: 'Ar', parents: ['A'], attrs: { name: "A''", image: { op: 'rotate', of: ['O'], angle: 90 } } }),
  el({ type: 'point', id: 'Ad', parents: ['A'], attrs: { name: 'A~', image: { op: 'dilate', of: ['O'], k: 0.5 } } }),
  el({ type: 'point', id: 'Am', parents: ['A'], attrs: { name: "A'", image: { op: 'reflect', of: ['mirror'] } } }),
  // derived points
  el({ type: 'midpoint', id: 'M', parents: ['A', 'B'], attrs: { name: 'M' } }),
  el({ type: 'circle', id: 'c1', parents: ['O', 'B'], attrs: { strokeColor: '#1e3c96' } }),
  el({ type: 'glider', id: 'G', parents: [1, 1, 'c1'], attrs: { name: 'G' } }),
  // curves and areas
  el({ type: 'segment', id: 's1', parents: ['O', 'M'], attrs: { strokeColor: '#c83c3c', strokeWidth: 2 } }),  el({ type: 'arc', id: 'arc1', parents: ['O', 'B', 'G'], attrs: {} }),
  el({ type: 'sector', id: 'sec1', parents: ['O', 'B', 'G'], attrs: { fillOpacity: 0.1 } }),
  el({ type: 'angle', id: 'ang1', parents: ['B', 'O', 'M'], attrs: { name: 'α' } }),
  el({ type: 'polygon', id: 'pg1', parents: ['A', 'B', 'O'], attrs: { fillOpacity: 0.2 } }),
  // constructions from the Construct menu
  el({ type: 'perpendicular', id: 'perp1', parents: ['M', 's1'], attrs: {} }),
  el({ type: 'parallel', id: 'par1', parents: ['G', 's1'], attrs: {} }),
  el({ type: 'bisector', id: 'bis1', parents: ['B', 'O', 'M'], attrs: { dash: 2 } }),
  // functions, a slider and a locus
  el({ type: 'functiongraph', id: 'f1', parents: ['x*x/3-2', -4, 4], attrs: { strokeColor: '#16a34a' } }),
  el({ type: 'curve', id: 'para1', parents: ['3*cos(x)', '3*sin(x)', 0, 6.28], attrs: { dash: 2 } }),
  // and the curve the designer typed onto the marked frame: the expression is
  // data, the frame is its parent, so the page never runs what the file says
  el({
    type: 'plot', id: 'plot1', parents: ['O', 'U', 'O_v'],
    attrs: { plot: functionPlot('x^2-2'), strokeColor: '#800080' },
  }),
  // and the parametric curve Graph | Plot Curve… typed: two formulas in t, the
  // domain they are read over and the sampling its dialog was answered with
  el({
    type: 'plot', id: 'plot2', parents: ['O', 'U', 'O_v'],
    attrs: {
      plot: parametricPlot('2*cos(t)', '2*sin(t)', [0, 6.2832], 240),
      strokeColor: '#800080',
    },
  }),
  // and the definition the curve was plotted from: the formula as the designer
  // typed it, shown on the page the way Sketchpad shows it
  el({
    type: 'text', id: 'fn1', parents: [-7, 6.5, 'f(x) = x^2-2'],
    attrs: { fontSize: 14, strokeColor: '#333333', func: { expr: 'x^2-2', variable: 'x', from: -5, to: 5 } },
  }),
  el({ type: 'slider', id: 'sl1', parents: [[-6, -6], [-2, -6], [0, 10, 4]], attrs: {} }),
  // The locus needs a traced point that really depends on the driver: JSXGraph
  // recurses until the stack dies when it does not.
  el({ type: 'midpoint', id: 'MG', parents: ['B', 'G'], attrs: { name: 'N' } }),
  el({ type: 'tracecurve', id: 'loc1', parents: ['G', 'MG'], attrs: { strokeColor: '#9333ea', numberpoints: 40 } }),
  // measurements as data, with a caption that follows its geometry
  el({
    type: 'text', id: 'mDist', parents: [0, 6, 'AB'],
    attrs: {
      fontSize: 13,
      measure: { op: 'distance', args: ['A', 'B'], label: 'AB', precision: 2, unit: ' cm' },
      anchor: { of: ['sAB'], dx: 0, dy: 0.4 },
    },
  }),
  el({
    type: 'text', id: 'mAng', parents: [4, -6, 'α'],
    attrs: { fontSize: 13, measure: { op: 'angle', args: ['B', 'O', 'M'], label: 'α', precision: 1, unit: '°' } },
  }),
  el({ type: 'segment', id: 'sAB', parents: ['A', 'B'], attrs: { strokeColor: '#1e3c96' } }),
  el({
    type: 'text', id: 'mCoord', parents: [-7, 7, 'G'],
    attrs: { fontSize: 13, measure: { op: 'coordinates', args: ['G'], label: 'G', precision: 2 } },
  }),
  // what a desktop file writes for an arc, a sector and a filled shape: the
  // curve measured along itself, its sweep, and an area in square centimetres
  el({ type: 'circumcirclearc', id: 'ccarc', parents: ['A', 'B', 'O'], attrs: {} }),
  el({
    type: 'text', id: 'mArc', parents: [-8, -3, 'cung AB'],
    attrs: { fontSize: 13, measure: { op: 'arcLength', args: ['arc1'], label: 'cung AB', precision: 2, unit: ' cm' } },
  }),
  el({
    type: 'text', id: 'mArcAng', parents: [-8, -4, 'β'],
    attrs: { fontSize: 13, measure: { op: 'arcAngle', args: ['ccarc'], label: 'β', precision: 1, unit: '°' } },
  }),
  el({
    type: 'text', id: 'mArea', parents: [-8, -5, 'ABO'],
    attrs: { fontSize: 13, measure: { op: 'area', args: ['pg1'], label: 'ABO', precision: 2, unit: ' cm²', scale: 2 } },
  }),
  // and the number the Number menu calculates out of the numbers above
  el({
    type: 'text', id: 'mCalc', parents: [-8, -6, 'AB + a'],
    attrs: {
      fontSize: 13,
      measure: { op: 'calculate', args: ['mDist', 'sl1'], expr: '#0 + #1', label: 'AB + a', precision: 2 },
    },
  }),
  // and the point Graph | Plot as (x, y)… wrote rather than a point dragged: its
  // place is two expressions measured on the frame, reading the board's numbers
  el({
    type: 'point', id: 'pt1', parents: ['O', 'U', 'O_v'],
    attrs: { name: 'P', plotAt: { shape: 'rectangular', x: '#0', y: '1', args: ['sl1'] } },
  }),
];

/**
 * What the engine drew, as data: every node's tag plus the attributes that place
 * geometry. Generated ids are rewritten because JSXGraph numbers them per board,
 * and numbers are rounded because a rebuild accumulates float noise.
 *
 * Text is included because a measurement caption is part of the drawing: the
 * engine renders it as an absolutely positioned div beside the svg, so where it
 * sits and what it says both belong in the comparison.
 */
const GEOMETRY = ['cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'font-size'];
const PAINT = ['d', 'points', 'transform', 'visibility', 'display', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'opacity'];

function flattenNumbers(value: string): string {
  return value
    .replace(/[-\d]*\.?\d+(?:e[-+]?\d+)?/gi, (m) => {
      const n = Number(m);
      return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Only the declarations that say where a node sits. JSXGraph writes the same
 * transition boilerplate on every element, and keeping it would make a
 * difference unreadable without saying anything about the drawing.
 */
const PLACED = ['left', 'top', 'width', 'height', 'font-size', 'visibility'];

function placement(style: string): string {
  return PLACED.map((key) => {
    const m = new RegExp(`(?:^|;)\\s*${key}:\\s*([^;]+)`).exec(style);
    return m ? `${key}=${flattenNumbers(m[1])}` : null;
  })
    .filter(Boolean)
    .join(' ');
}

function drawing(board: any): string[] {
  const out: string[] = [];
  const walk = (node: Element) => {
    const parts: string[] = [node.tagName];
    for (const attr of GEOMETRY) {
      const raw = node.getAttribute(attr);
      if (raw !== null) parts.push(`${attr}=${flattenNumbers(raw)}`);
    }
    for (const attr of PAINT) {
      const raw = node.getAttribute(attr);
      if (raw !== null) parts.push(`${attr}=${flattenNumbers(raw.replace(/jsxgraph_\d+/g, 'board'))}`);
    }
    const style = node.getAttribute('style');
    if (style !== null) {
      const placed = placement(style);
      if (placed) parts.push(placed);
    }
    const text = (node.textContent ?? '').trim();
    if (text && (node.tagName === 'text' || node.tagName === 'tspan' || node.classList.contains('JXGtext'))) {
      parts.push(`text:${text}`);
    }
    out.push(parts.join(' '));
    for (const child of Array.from(node.children)) walk(child);
  };
  // The engine draws geometry into an svg but renders text as absolutely
  // positioned divs next to it, so the whole container is the picture.
  walk(board.containerObj);
  return out;
}

/** Load a document into a board the way the designer does, and assert it works. */
function load(board: any, elements: HeyGeoElement[]) {
  const out = applyScene(board, takeScene(elements, { axis: false, grid: false }));
  expect(out.errors).toEqual([]);
  return out;
}

describe('a saved document rebuilds the same drawing', () => {
  it('survives save → reload for every element type the designer writes', () => {
    const first = newBoard();
    load(first, kitchenSink());
    first.update();

    // What the designer hands the server after a load: the document applyScene
    // accepted, with migration already applied.
    const saved = JSON.parse(JSON.stringify(load(newBoard(), kitchenSink()).elements));

    const second = newBoard();
    const reloaded = load(second, saved);
    second.update();

    expect(reloaded.elements.map((e: HeyGeoElement) => e.id)).toEqual(saved.map((e: HeyGeoElement) => e.id));

    // The equality below only means something if the signature is a real
    // drawing, so pin down that geometry is laid out and a caption is rendered.
    const drawn = drawing(first);
    expect(drawn.length).toBeGreaterThan(60);
    expect(drawn.join('\n')).toMatch(/AB = \d+\.\d+ cm/);
    expect(drawn.join('\n')).toMatch(/left=\d{2,3}px/);
    // the arc and area descriptors really compute; none of them is the '…' a
    // descriptor the engine could not read would leave behind
    expect(drawn.join('\n')).toMatch(/cung AB = \d+\.\d+ cm/);
    expect(drawn.join('\n')).toMatch(/β = \d+\.\d+°/);
    expect(drawn.join('\n')).toMatch(/ABO = 14\.00 cm²/);

    expect(drawing(second)).toEqual(drawing(first));
  });

  it('keeps the coordinate system the designer marked', () => {
    const b = newBoard();
    const saved = load(b, kitchenSink()).elements;
    b.update();
    // the frame is a mark on its origin, so the document carries it as data
    expect(saved.find((e: HeyGeoElement) => e.id === 'O')!.attrs.coordsys).toEqual({ unit: 'U' });

    const again = newBoard();
    load(again, JSON.parse(JSON.stringify(saved)));
    again.update();
    // and the frame it marks is rebuilt from that mark: the y-direction is the
    // unit point turned a quarter turn about the origin, so the axes are at right
    // angles wherever the designer puts the two points
    expect(again.objects.O_v.X()).toBeCloseTo(0, 6);
    expect(again.objects.O_v.Y()).toBeCloseTo(2, 6);
    // JSXGraph never sees the mark: it is stripped like a measurement descriptor
    expect(again.objects.O.visProp?.coordsys).toBeUndefined();
  });

  it('keeps the grid the designer chose for that frame', () => {
    // A rectangular frame is the one form whose y-direction is a point of its own:
    // its spacing is set by dragging that point, so the document has to carry both
    // the settings and the point they turned the derived one into.
    const framed = kitchenSink().map((e: HeyGeoElement) => {
      if (e.id === 'O') {
        return { ...e, attrs: { ...e.attrs, coordsys: { unit: 'U', grid: 'rectangular', showGrid: true, snap: true } } };
      }
      return e.id === 'O_v' ? verticalElement('O', 'U', 'rectangular', [0, 2]) : e;
    });
    const b = newBoard();
    const saved = load(b, framed).elements;
    b.update();

    const again = newBoard();
    load(again, JSON.parse(JSON.stringify(saved)));
    again.update();

    expect(saved.find((e: HeyGeoElement) => e.id === 'O')!.attrs.coordsys)
      .toEqual({ unit: 'U', grid: 'rectangular', showGrid: true, snap: true });
    expect(coordsysOf(saved)).toEqual({
      origin: 'O', unit: 'U', grid: 'rectangular', showGrid: true, snap: true,
    });
    // the y point stayed a free point of the document, not a derived one
    expect(again.objects.O_v.X()).toBeCloseTo(0, 6);
    expect(again.objects.O_v.Y()).toBeCloseTo(2, 6);
    expect(again.objects.O_y.point2.id).toBe('O_v');
  });

  it('keeps the curve the designer plotted on the frame', () => {
    const b = newBoard();
    const saved = load(b, kitchenSink()).elements;
    b.update();

    // The document holds the typed arithmetic and the three points it is measured
    // against — never a function to run.
    const stored = saved.find((e: HeyGeoElement) => e.id === 'plot1')!;
    expect(stored.parents).toEqual(['O', 'U', 'O_v']);
    expect(stored.attrs.plot).toEqual({ x: 'x', y: 'x^2-2', variable: 'x', from: -5, to: 5 });
    expect(JSON.stringify(saved)).not.toMatch(/function\(/);
    // JSXGraph is handed the curve, not the descriptor
    expect(b.objects.plot1.visProp.plot).toBeUndefined();

    const again = newBoard();
    load(again, JSON.parse(JSON.stringify(saved)));
    again.update();
    // this frame is O(0,0) with unit U(2,0) and y-direction O_v(0,2), so its x = 2
    // is board 4 on both axes: the curve reloads measured in the frame, not the page
    expect(again.objects.plot1.X(2)).toBeCloseTo(4);
    expect(again.objects.plot1.Y(2)).toBeCloseTo(4);
    expect(again.objects.plot1.Y(0)).toBeCloseTo(-4);
    expect(again.objects.plot1.visProp.numberpoints).toBe(PLOT_SAMPLES);
    expect(String(again.objects.plot1.visProp.strokecolor)).toBe('#800080');
    // the definition it was plotted from reloads as the caption the designer read.
    // JSXGraph sets a power as a superscript of its own, so the two boards are
    // compared on what they render rather than on the text that was typed
    expect(String(b.objects.fn1.plaintext)).toMatch(/^f\(x\) = x/);
    expect(String(again.objects.fn1.plaintext)).toBe(String(b.objects.fn1.plaintext));
    expect(saved.find((e: HeyGeoElement) => e.id === 'fn1')!.attrs.func)
      .toEqual({ expr: 'x^2-2', variable: 'x', from: -5, to: 5 });
    // and JSXGraph never sees it, so the page has nothing of the formula to run
    expect(again.objects.fn1.visProp?.func).toBeUndefined();
    expect(drawing(again)).toEqual(drawing(b));
  });

  it('keeps the parametric curve and the sampling it was drawn with', () => {
    const b = newBoard();
    const saved = load(b, kitchenSink()).elements;
    b.update();

    // the pair, the domain and the sample count are all data in the document
    const stored = saved.find((e: HeyGeoElement) => e.id === 'plot2')!;
    expect(stored.parents).toEqual(['O', 'U', 'O_v']);
    expect(stored.attrs.plot).toEqual({
      x: '2*cos(t)', y: '2*sin(t)', variable: 't', from: 0, to: 6.2832, samples: 240,
    });
    // JSXGraph is handed the curve and the count, never the descriptor
    expect(b.objects.plot2.visProp.plot).toBeUndefined();
    expect(b.objects.plot2.visProp.numberpoints).toBe(240);

    const again = newBoard();
    expect(load(again, JSON.parse(JSON.stringify(saved))).errors).toEqual([]);
    again.update();
    // this frame's x = 2 is board 4 on both axes, so a radius of 2 is 4 out
    expect(again.objects.plot2.X(0)).toBeCloseTo(4);
    expect(again.objects.plot2.Y(0)).toBeCloseTo(0);
    expect(again.objects.plot2.Y(Math.PI / 2)).toBeCloseTo(4);
    expect(again.objects.plot2.visProp.numberpoints).toBe(240);
    expect(drawing(again)).toEqual(drawing(b));
  });

  it('keeps a plotted curve a child of its frame across a drag and a save', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    // dragging the unit point is a move of the frame, so nothing about the curve
    // is a position that syncPositions could freeze into the document
    b.objects.U.moveTo([4, 0]);
    b.update();
    expect(syncPositions(elements, b)).toBe(true);
    expect(elements.find((e: HeyGeoElement) => e.id === 'plot1')!.parents).toEqual(['O', 'U', 'O_v']);
    // x = 2 now lands on board 8
    expect(b.objects.plot1.X(2)).toBeCloseTo(8);

    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(reloaded.objects.plot1.X(2)).toBeCloseTo(8);
    expect(reloaded.objects.plot1.Y(2)).toBeCloseTo(8);
  });

  it('keeps the point the designer plotted onto that frame', () => {
    const b = newBoard();
    const saved = load(b, kitchenSink()).elements;
    b.update();

    // The document holds two expressions, the numbers they read and the frame they
    // are measured on — the same three pieces a curve is stored from, and no more.
    const stored = saved.find((e: HeyGeoElement) => e.id === 'pt1')!;
    expect(stored.parents).toEqual(['O', 'U', 'O_v']);
    expect(stored.attrs.plotAt).toEqual({ shape: 'rectangular', x: '#0', y: '1', args: ['sl1'] });
    expect(JSON.stringify(saved)).not.toMatch(/function\(/);
    // JSXGraph is handed the coordinates, never the descriptor
    expect(b.objects.pt1.visProp.plotAt).toBeUndefined();

    // the slider reads 4 and the frame's unit is 2 board units, so (4, 1) lands on
    // (8, 2): the point reloads measured in the frame, not the page
    expect(b.objects.pt1.X()).toBeCloseTo(8, 6);
    expect(b.objects.pt1.Y()).toBeCloseTo(2, 6);

    const again = newBoard();
    load(again, JSON.parse(JSON.stringify(saved)));
    again.update();
    expect(again.objects.pt1.X()).toBeCloseTo(8, 6);
    expect(again.objects.pt1.Y()).toBeCloseTo(2, 6);
    expect(drawing(again)).toEqual(drawing(b));
  });

  it('keeps a plotted point a child of its frame across a drag and a save', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();

    // dragging the unit point is a move of the frame, so the point's own place is
    // still its descriptor and syncPositions has no position to freeze into it
    b.objects.U.moveTo([4, 0]);
    b.update();
    expect(syncPositions(elements, b)).toBe(true);
    const point = elements.find((e: HeyGeoElement) => e.id === 'pt1')!;
    expect(point.parents).toEqual(['O', 'U', 'O_v']);
    expect(point.attrs.plotAt).toEqual({ shape: 'rectangular', x: '#0', y: '1', args: ['sl1'] });
    // the frame's unit is 4 board units now, and its y-direction turned with it
    expect(b.objects.pt1.X()).toBeCloseTo(16, 6);
    expect(b.objects.pt1.Y()).toBeCloseTo(4, 6);

    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(reloaded.objects.pt1.X()).toBeCloseTo(16, 6);
    expect(reloaded.objects.pt1.Y()).toBeCloseTo(4, 6);
  });

  it('is unchanged by a second reload, so a save cannot drift', () => {    const b1 = newBoard();
    const pass1 = load(b1, kitchenSink()).elements;
    b1.update();
    const after1 = drawing(b1);

    const b2 = newBoard();
    const pass2 = load(b2, JSON.parse(JSON.stringify(pass1)));
    b2.update();
    expect(drawing(b2)).toEqual(after1);

    const b3 = newBoard();
    load(b3, JSON.parse(JSON.stringify(pass2.elements)));
    b3.update();
    expect(drawing(b3)).toEqual(after1);
  });

  it('keeps a dragged point where it was dragged after a reload', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    const beforeDrag = drawing(b);
    b.objects.A.moveTo([5, -2]);
    b.update();
    expect(syncPositions(elements, b)).toBe(true);
    // the transform images and the distance caption follow the drag
    const moved = drawing(b);
    expect(moved).not.toEqual(beforeDrag);

    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(drawing(reloaded)).toEqual(moved);
    expect(reloaded.objects.At.X()).toBeCloseTo(8);
    expect(String(reloaded.objects.mDist.plaintext)).toBe(String(b.objects.mDist.plaintext));
  });

  it('migrates a legacy document once, so the second save is already data', () => {
    const legacy: HeyGeoElement[] = [
      el({ type: 'point', id: 'A', parents: [1, 1] }),
      el({ type: 'point', id: 'B', parents: [4, 5] }),
      el({
        type: 'text', id: 'm1', parents: [
          "function(){return (board.objects['A'].X()+board.objects['B'].X())/2}",
          "function(){return (board.objects['A'].Y()+board.objects['B'].Y())/2+0.5}",
          "function(){return 'd = '+Math.sqrt(Math.pow(board.objects['B'].X()-board.objects['A'].X(),2)+Math.pow(board.objects['B'].Y()-board.objects['A'].Y(),2)).toFixed(2)}",
        ],
        attrs: {},
      }),
      el({
        type: 'point', id: 'A2', parents: [
          "function(board){var P=board.objects['A'], A=board.objects['A'], B=board.objects['B']; return P.X()+(B.X()-A.X())}",
          "function(board){var P=board.objects['A'], A=board.objects['A'], B=board.objects['B']; return P.Y()+(B.Y()-A.Y())}",
        ],
        attrs: {},
      }),
    ];
    const b = newBoard();
    const saved = load(b, legacy).elements;
    expect(JSON.stringify(saved)).not.toMatch(/function\(/);

    const again = newBoard();
    const second = load(again, saved).elements;
    expect(JSON.stringify(second)).not.toMatch(/function\(/);
    expect(second.find((e) => e.id === 'm1')!.attrs.measure).toBeDefined();
    expect(second.find((e) => e.id === 'A2')!.attrs.image).toEqual({ op: 'translate', of: ['A', 'B'] });
    again.update();
    // A translated by A→B lands on B
    expect(again.objects.A2.X()).toBeCloseTo(4);
    expect(again.objects.A2.Y()).toBeCloseTo(5);
    // and the migrated caption is still drawn, so the model is usable, not just
    // free of code
    expect(drawing(again).join('\n')).toMatch(/text:d = \d+\.\d+/);
  });
});

/**
 * The shapes src/app/HeyGeoWebExporter.cpp writes for a desktop document. The
 * exporter used to hand over JavaScript source; it now emits the same
 * descriptors the designer saves, so these fixtures are the contract between
 * the two apps and changing either one has to show up here.
 */
describe('a document exported from the desktop app', () => {
  it('draws a measured distance from its descriptor at the desktop scale', () => {
    const b = newBoard();
    load(b, [
      el({ type: 'point', id: 'p0', parents: [0, 0], attrs: { name: 'O' } }),
      el({ type: 'point', id: 'p2', parents: [2, 3], attrs: { name: 'C' } }),
      // the hidden y-direction point of a coordinate system: U rotated 90° about O
      el({ type: 'point', id: 'p1', parents: [1, 0], attrs: { name: 'I' } }),
      el({
        type: 'point', id: 'cs0_v', parents: ['p1'],
        attrs: { visible: false, withLabel: false, image: { op: 'rotate', of: ['p0'], angle: 90 } },
      }),
      // scale is the desktop centimetres-per-unit factor, not a redrawn number
      el({
        type: 'text', id: 'mea0', parents: [0.6, 1.4, 'OC'],
        attrs: {
          fontSize: 14, strokeColor: '#333333',
          measure: { op: 'distance', args: ['p0', 'p2'], label: 'OC', precision: 2, unit: ' cm', scale: 2 },
        },
      }),
      // a Calculate has no declarative op yet: the desktop exports its caption
      el({ type: 'text', id: 'cal0', parents: [-2, 2, 'AB + BC = 7.21'], attrs: { fontSize: 14 } }),
    ]);
    b.update();

    expect(String(b.objects.mea0.plaintext)).toBe(`OC = ${(Math.hypot(2, 3) * 2).toFixed(2)} cm`);
    expect(b.objects.cs0_v.X()).toBeCloseTo(0);
    expect(b.objects.cs0_v.Y()).toBeCloseTo(1);
    expect(String(b.objects.cal0.plaintext)).toBe('AB + BC = 7.21');
    expect(drawing(b).join('\n')).toMatch(/OC = \d+\.\d+ cm/);
  });

  it('places a caption in the document coordinate system the exporter names', () => {
    const b = newBoard();
    load(b, [
      el({ type: 'point', id: 'p0', parents: [0, 0], attrs: { visible: false } }),
      // the unit point is two board units away, so the frame is half-scale
      el({ type: 'point', id: 'p1', parents: [2, 0], attrs: { visible: false } }),
      el({ type: 'point', id: 'p2', parents: [3, 1], attrs: { name: 'A' } }),
      el({
        type: 'text', id: 'mea0', parents: [1, 2, 'x<sub>A</sub>'],
        attrs: { measure: { op: 'relativeAbscissa', args: ['p0', 'p1', 'p2'], label: 'x<sub>A</sub>', precision: 2 } },
      }),
      el({
        type: 'text', id: 'mea1', parents: [1, 3, 'A'],
        attrs: { measure: { op: 'relativeCoordinates', args: ['p0', 'p1', 'p2'], label: 'A', precision: 2 } },
      }),
    ]);
    b.update();

    expect(String(b.objects.mea0.plaintext)).toContain('= 1.50');
    expect(String(b.objects.mea1.plaintext)).toContain('(1.50; 0.50)');
  });
});

/**
 * P1.4 — what the rotate and dilate arrows do to a document.
 *
 * The arrows freeze the free points of the selection when the pointer goes down,
 * move those through one map every frame and let JSXGraph recompute everything
 * built on them. This is the part of the drag that reaches the saved file: which
 * points get frozen, and whether the turned construction is what reloads.
 */
describe('an arrow drag on the selection', () => {
  type Frozen = { id: string; x: number; y: number };

  /** The points the canvas would freeze, exactly as beginArrowDrag collects them. */
  const freeze = (b: any, elements: HeyGeoElement[], sel: any[]): Frozen[] => {
    const free = new Set(
      elements.filter((e) => coordParents(e) !== null).map((e) => e.id),
    );
    return gatherSelectionPoints(sel)
      .filter((p: any) => free.has(p.id))
      .map((p: any) => ({ id: p.id, x: p.X(), y: p.Y() }));
  };

  const drag = (b: any, base: Frozen[], map: (x: number, y: number) => [number, number]) => {
    for (const p of base) b.objects[p.id].moveTo(map(p.x, p.y));
    b.update();
  };

  it('freezes the free points of a selection, not the ones built on them', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    // the line through A and B: A and B move, the midpoint M follows on its own
    expect(freeze(b, elements, [b.objects.mirror, b.objects.M]).map((p) => p.id).sort())
      .toEqual(['A', 'B']);
  });

  it('turns the selection about the marked centre and saves the turn', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    const A0 = { x: b.objects.A.X(), y: b.objects.A.Y() };
    const len0 = Math.hypot(b.objects.B.X() - A0.x, b.objects.B.Y() - A0.y);
    const base = freeze(b, elements, [b.objects.mirror]);

    // pointer travelled a quarter turn counter-clockwise about the origin
    drag(b, base, arrowDragMap('rotate', [0, 0], [3, 0], [0, 3]));

    expect(b.objects.A.X()).toBeCloseTo(-A0.y);
    expect(b.objects.A.Y()).toBeCloseTo(A0.x);
    expect(Math.hypot(b.objects.B.X() - b.objects.A.X(), b.objects.B.Y() - b.objects.A.Y()))
      .toBeCloseTo(len0);
    // the midpoint was never touched, and is still the midpoint
    expect(b.objects.M.X()).toBeCloseTo((b.objects.A.X() + b.objects.B.X()) / 2);

    expect(syncPositions(elements, b)).toBe(true);
    const after = drawing(b);
    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(drawing(reloaded)).toEqual(after);
  });

  it('scales the selection away from the centre and keeps the ratio on reload', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    const A0 = { x: b.objects.A.X(), y: b.objects.A.Y() };
    const base = freeze(b, elements, [b.objects.sAB]);

    // pointer moved from distance 1 to distance 3: k = 3
    drag(b, base, arrowDragMap('dilate', [0, 0], [1, 0], [3, 0]));

    expect(b.objects.A.X()).toBeCloseTo(3 * A0.x);
    expect(b.objects.A.Y()).toBeCloseTo(3 * A0.y);
    const direction0 = Math.atan2(A0.y, A0.x);
    expect(Math.atan2(b.objects.A.Y(), b.objects.A.X())).toBeCloseTo(direction0);

    expect(syncPositions(elements, b)).toBe(true);
    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(reloaded.objects.A.X()).toBeCloseTo(b.objects.A.X());
    expect(reloaded.objects.A.Y()).toBeCloseTo(b.objects.A.Y());
  });

  it('carries the whole group with the translate arrow, not only what was grabbed', () => {
    const b = newBoard();
    const elements = load(b, kitchenSink()).elements;
    b.update();
    const A0 = { x: b.objects.A.X(), y: b.objects.A.Y() };
    const B0 = { x: b.objects.B.X(), y: b.objects.B.Y() };
    // the group Sketchpad moves: a segment and a midpoint picked with Shift+click
    const base = freeze(b, elements, [b.objects.sAB, b.objects.M]);

    drag(b, base, arrowDragMap('translate', null, [0, 0], [1.5, -2]));

    expect(b.objects.A.X()).toBeCloseTo(A0.x + 1.5);
    expect(b.objects.A.Y()).toBeCloseTo(A0.y - 2);
    expect(b.objects.B.X()).toBeCloseTo(B0.x + 1.5);
    // the midpoint kept its role while both endpoints travelled together
    expect(b.objects.M.X()).toBeCloseTo((b.objects.A.X() + b.objects.B.X()) / 2);

    expect(syncPositions(elements, b)).toBe(true);
    const after = drawing(b);
    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    expect(drawing(reloaded)).toEqual(after);
  });
});

// Graph | Plot as (x, y)… makes a point out of the numbers the page already has.
// Sketchpad keeps that point a child of the numbers it was plotted from; this is
// what the dependency costs and buys on a real board: the parameters stay the
// point's place, so moving one moves the point, and a save keeps both.
describe('a point plotted from the board’s numbers', () => {
  const DOC: HeyGeoElement[] = [
    el({ type: 'point', id: 'O', parents: [-4, -6], attrs: { name: 'O', coordsys: { unit: 'U' } } }),
    el({ type: 'point', id: 'U', parents: [-3, -6], attrs: { name: 'U' } }),
    el({ type: 'point', id: 'O_v', parents: ['U'], attrs: { name: '', visible: false, image: { op: 'rotate', of: ['O'], angle: 90 } } }),
    // two of Number | New Parameter…, so the point is plotted from numbers the
    // designer can slide
    el({ type: 'slider', id: 'a', parents: [[-7, 7], [-4, 7], [0, 4, 10]], attrs: { name: 'a' } }),
    el({ type: 'slider', id: 'b', parents: [[-7, 5.5], [-4, 5.5], [0, 6, 10]], attrs: { name: 'b' } }),
    el({
      type: 'point', id: 'P', parents: ['O', 'U', 'O_v'],
      attrs: { name: 'P', plotAt: { shape: 'rectangular', x: '#0', y: '#1', args: ['a', 'b'] } },
    }),
  ];

  it('follows the numbers it was plotted from, and goes on following them after a save', () => {
    const b = newBoard();
    const elements = load(b, DOC).elements;
    b.update();

    // the frame is O(-4,-6) with a unit of 1: a = 4 and b = 6 put P on the origin
    expect(b.objects.P.X()).toBeCloseTo(0, 6);
    expect(b.objects.P.Y()).toBeCloseTo(0, 6);
    // the point has no place of its own to be dragged to
    expect(b.objects.P.isDraggable).toBe(false);

    b.objects.a.setValue(8);
    b.update();
    expect(b.objects.P.X()).toBeCloseTo(4, 6);
    expect(b.objects.P.Y()).toBeCloseTo(0, 6);
    // a move of the numbers is not a move of the point: its descriptor stays its
    // only place, so nothing is frozen into the document
    expect(syncPositions(elements, b)).toBe(false);
    expect(elements.find((e: HeyGeoElement) => e.id === 'P')!.attrs.plotAt)
      .toEqual({ shape: 'rectangular', x: '#0', y: '#1', args: ['a', 'b'] });

    const reloaded = newBoard();
    load(reloaded, JSON.parse(JSON.stringify(elements)));
    reloaded.update();
    // the slider comes back at the value its document declared …
    expect(reloaded.objects.P.X()).toBeCloseTo(0, 6);
    // … and the point still follows it, which is the dependency a one-time
    // placement would have thrown away
    reloaded.objects.a.setValue(8);
    reloaded.update();
    expect(reloaded.objects.P.X()).toBeCloseTo(4, 6);
    expect(reloaded.objects.P.Y()).toBeCloseTo(0, 6);
  });
});

// Edit | Action Buttons | Hide/Show writes a button as a caption in the document
// plus a descriptor naming what a press works on. The press changes those
// objects and the caption, never the descriptor, so a save has to carry both the
// state the press left and the button that can undo it.
describe('an action button the designer makes', () => {
  const DOC = (): HeyGeoElement[] => [
    el({ type: 'point', id: 'A', parents: [-2, 2], attrs: { name: 'A' } }),
    el({ type: 'point', id: 'B', parents: [2, 2], attrs: { name: 'B' } }),
    el({
      type: 'actionbutton', id: 'btn', parents: [6, 6.5, 'Ẩn A, B'],
      attrs: { button: { action: 'hide', name: 'A, B', targets: ['A', 'B'] } },
    }),
  ];

  it('saves the descriptor and the caption, and draws the caption', () => {
    const b = newBoard();
    const saved = load(b, DOC()).elements;
    b.update();

    const stored = saved.find((e) => e.id === 'btn')!;
    expect(stored.parents).toEqual([6, 6.5, 'Ẩn A, B']);
    expect(stored.attrs.button).toEqual({ action: 'hide', name: 'A, B', targets: ['A', 'B'] });
    // JSXGraph is handed the caption, never the descriptor
    expect(b.objects.btn.visProp.button).toBeUndefined();
    expect(String(b.objects.btn.plaintext)).toBe('Ẩn A, B');

    const again = newBoard();
    expect(load(again, JSON.parse(JSON.stringify(saved))).errors).toEqual([]);
    again.update();
    expect(String(again.objects.btn.plaintext)).toBe('Ẩn A, B');
    expect(drawing(again)).toEqual(drawing(b));
  });

  it('keeps what a press left behind: hidden points and a caption offering them', () => {
    const b = newBoard();
    const elements = load(b, DOC()).elements;
    b.update();

    // what pressActionButton writes: the targets' visibility and the caption
    for (const id of ['A', 'B']) {
      const target = elements.find((e) => e.id === id)!;
      target.attrs = { ...target.attrs, visible: false };
      b.objects[id].setAttribute({ visible: false });
    }
    const btn = elements.find((e) => e.id === 'btn')!;
    btn.parents = [btn.parents[0], btn.parents[1], 'Hiện A, B'];
    b.objects.btn.setText('Hiện A, B');
    b.update();

    const reloaded = newBoard();
    expect(load(reloaded, JSON.parse(JSON.stringify(elements))).errors).toEqual([]);
    reloaded.update();
    expect(reloaded.objects.A.visProp.visible).toBe(false);
    expect(reloaded.objects.B.visProp.visible).toBe(false);
    expect(String(reloaded.objects.btn.plaintext)).toBe('Hiện A, B');
    // the button still knows what it acts on, so a second press can show them
    expect(reloaded.objects.btn.visProp.button).toBeUndefined();
    expect(elements.find((e: HeyGeoElement) => e.id === 'btn')!.attrs.button)
      .toEqual({ action: 'hide', name: 'A, B', targets: ['A', 'B'] });
  });
});

// Display | Animate Objects… sets objects in motion whose place the document
// already records: a glider is a path parameter, a parameter is a value between
// its ends. Nothing about the run is saved — Stop Animation leaves the objects
// where they stand, and where they stand is what the document holds.
describe('an animation the designer stops', () => {
  const DOC = (): HeyGeoElement[] => [
    el({ type: 'point', id: 'A', parents: [0, 0], attrs: { name: 'A' } }),
    el({ type: 'point', id: 'B', parents: [4, 0], attrs: { name: 'B' } }),
    el({ type: 'segment', id: 's', parents: ['A', 'B'], attrs: {} }),
    el({ type: 'glider', id: 'G', parents: [1, 2, 's'], attrs: { name: 'G' } }),
    el({ type: 'slider', id: 'a', parents: [[-7, 7], [-4, 7], [0, 4, 10]], attrs: { name: 'a' } }),
  ];

  it('leaves the glider halfway and the parameter at its new value', () => {
    const b = newBoard();
    const elements = load(b, DOC()).elements;
    b.update();

    // the glider starts a quarter of the way along the segment, the parameter at 4
    expect(b.objects.G.position).toBeCloseTo(0.25, 6);
    expect(b.objects.a.Value()).toBeCloseTo(4, 6);

    // what the runner does each frame, and what Stop Animation then writes down
    b.objects.G.setGliderPosition(0.5);
    b.objects.a.setValue(6);
    b.update();
    // a glider is a point of the document, so its place is frozen like a drag's
    expect(syncPositions(elements, b)).toBe(true);
    expect(elements.find((e: HeyGeoElement) => e.id === 'G')!.parents).toEqual([2, 0, 's']);
    // a parameter's value is not a coordinate, so the stop writes it itself
    const slider = elements.find((e: HeyGeoElement) => e.id === 'a')!;
    slider.parents = withSliderValue(slider, b.objects.a.Value()) as HeyGeoElement['parents'];

    const reloaded = newBoard();
    expect(load(reloaded, JSON.parse(JSON.stringify(elements))).errors).toEqual([]);
    reloaded.update();
    expect(reloaded.objects.G.position).toBeCloseTo(0.5, 6);
    expect(reloaded.objects.G.X()).toBeCloseTo(2, 6);
    expect(reloaded.objects.G.Y()).toBeCloseTo(0, 6);
    expect(reloaded.objects.a.Value()).toBeCloseTo(6, 6);
    // no part of the run itself reached the file
    expect(JSON.stringify(elements)).not.toMatch(/animation|direction|running/);
  });
});
