// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseGsp } from './gspBinary';
import type { GspButtonAction, GspObject, GspSketch, GspStyle } from './gspBinary';
import { gspToHeyGeo, stripMfs } from './gspToHeyGeo';
import { applyScene, takeScene } from '../../components/designer/sceneModel';
import { createButtonRuntime, type ButtonRuntime } from '../../components/designer/buttonRuntime';
import {
  buttonProblem,
  isActionButtonSpec,
  type ActionButtonSpec,
} from '../../components/designer/actionButtonModel';
import type { HeyGeoElement } from '../../components/designer/designTypes';
import { measureCaption, type MeasureSpec } from '../../components/designer/measurement';

/*
 * The converter must produce a document the real JSXGraph engine can build
 * without errors, and every point it places must land where Sketchpad's own
 * Web-export JSON says the object sits. Screen px -> user units: x-w/2, h/2-y.
 */

let JXG: any;

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', '..', 'GSP-reference', 'gsp_examples');
const suite = existsSync(FIXTURES) ? describe : describe.skip;

interface JsonPage {
  metadata?: { sketchRect?: { top: number; left: number; bottom: number; right: number } };
  objects: Record<string, Record<string, unknown>>;
}

function load(name: string) {
  const buf = readFileSync(join(FIXTURES, `${name}.gsp`));
  const sketch = parseGsp(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  const json = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8')) as { pages: JsonPage[] };
  return { sketch, json };
}

function convert(name: string) {
  const { sketch, json } = load(name);
  const { data, warnings } = gspToHeyGeo(sketch, name);
  return { sketch, json, data, warnings };
}

function newBoard(boundingbox: number[]) {
  const div = document.createElement('div');
  div.style.width = '800px';
  div.style.height = '600px';
  document.body.appendChild(div);
  return JXG.JSXGraph.initBoard(div, {
    boundingbox,
    showCopyright: false,
    showNavigation: false,
  });
}

/** JSON loc is px on the page; the designer centres its box on the origin. */
function expectedLoc(loc: { x: number; y: number }, w: number, h: number): [number, number] {
  return [loc.x - w / 2, h / 2 - loc.y];
}

function jsonLoc(page: JsonPage, el: HeyGeoElement): { x: number; y: number } | null {
  const o = page.objects[el.id.slice(1)]; // "e12" -> JSON key "12"
  const loc = (o?.geom as { loc?: { x?: number; y?: number } } | undefined)?.loc;
  return loc && typeof loc.x === 'number' && typeof loc.y === 'number' ? { x: loc.x, y: loc.y } : null;
}

beforeAll(() => {
  const src = readFileSync(join(HERE, '..', '..', 'public', 'vendor', 'jsxgraph', 'jsxgraphcore.js'), 'utf8');
  new Function(src)();
  JXG = (globalThis as any).JXG;
  (window as any).matchMedia = vi.fn(() => ({
    matches: false, addEventListener: () => {}, removeEventListener: () => {},
  }));
});

suite('converted sketches build on the real engine', () => {
  const names = [
    't1_free_points',
    't2_lines_circles',
    't3_constructed',
    't4_text_param',
    't5_button_anim',
    'Dung_ngu_giac_deu',
    'Free_points_in_triangles',
  ];

  for (const name of names) {
    it(`${name}: the engine builds every converted object`, () => {
      const { data } = convert(name);
      expect(data.elements.length).toBeGreaterThan(0);
      const board = newBoard(data.boundingbox);
      const out = applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
      expect(out.errors).toEqual([]);
      expect(out.createdIds).toHaveLength(data.elements.length);
    });
  }
});

suite('converted positions match Sketchpad\'s own export', () => {
  it('t1: free points land at their exported page locations', () => {
    const { data, json } = convert('t1_free_points');
    const page = json.pages[0];
    const [w, h] = [
      page.metadata?.sketchRect?.right ?? 780,
      page.metadata?.sketchRect?.bottom ?? 540,
    ];
    const board = newBoard(data.boundingbox);
    applyScene(board, takeScene(data.elements, { axis: false, grid: false }));

    const points = data.elements.filter((e) => e.type === 'point');
    expect(points).toHaveLength(3);
    for (const p of points) {
      const loc = jsonLoc(page, p);
      expect(loc, `no JSON loc for ${p.id}`).not.toBeNull();
      const [ex, ey] = expectedLoc(loc!, w, h);
      expect(board.objects[p.id].X()).toBeCloseTo(ex, 6);
      expect(board.objects[p.id].Y()).toBeCloseTo(ey, 6);
    }
  });

  it('t3: constructed points (midpoint, intersection) match within the engine', () => {
    const { data, json } = convert('t3_constructed');
    const page = json.pages[0];
    const [w, h] = [
      page.metadata?.sketchRect?.right ?? 780,
      page.metadata?.sketchRect?.bottom ?? 540,
    ];
    const board = newBoard(data.boundingbox);
    applyScene(board, takeScene(data.elements, { axis: false, grid: false }));

    // every converted point whose JSON export carries a plain loc: free points
    // exactly, derived points within the pixel the exporter rounds to.
    const points = data.elements.filter((e) => e.type === 'point' || e.type === 'midpoint' || e.type === 'intersection');
    let checked = 0;
    for (const p of points) {
      const loc = jsonLoc(page, p);
      if (!loc) continue;
      const [ex, ey] = expectedLoc(loc, w, h);
      expect(board.objects[p.id].X(), `${p.id} x`).toBeCloseTo(ex, 0);
      expect(board.objects[p.id].Y(), `${p.id} y`).toBeCloseTo(ey, 0);
      checked++;
    }
    expect(checked).toBeGreaterThanOrEqual(3);
  });
});

suite('a transformed point follows the map Sketchpad exported', () => {
  /*
   * A transform point has no stored position anywhere — the map is its whole
   * definition — so the only ground truth left is the map itself: the official
   * web export writes the angle, the distance, the factor and the offset as
   * plain numbers. Feeding THOSE into the same board position the converter
   * reads must reproduce what the engine puts on the page, object by object,
   * however deep the chain of copies goes.
   */
  const names = readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.gsp'))
    .map((f) => f.slice(0, -4))
    // A .gsp without the web export beside it has no ground truth to compare.
    .filter((name) => existsSync(join(FIXTURES, `${name}.json`)));
  const image = (el: HeyGeoElement) => el.attrs.image as
    { op: string; of: string[]; dx?: number; dy?: number; angle?: number; k?: number } | undefined;

  let totalChecked = 0;

  for (const name of names) {
    it(`${name}: every exported map lands its copy where the engine puts it`, () => {
      const { data, json, sketch } = convert(name);
      const page = json.pages[0];
      let checked = 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const objOf = (key: unknown): any => page.objects[String(key)];
      const withImage = data.elements.filter((e) => image(e));
      if (!withImage.length) return;
      const board = newBoard(data.boundingbox);
      const out = applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
      expect(out.errors).toEqual([]);

      const at = (id: string): [number, number] => {
        const o = board.objects[id];
        expect(o, `${name}: ${id} is not on the board`).toBeTruthy();
        return [o.X(), o.Y()];
      };
      const w = sketch.pageWidth ?? 780;
      const h = sketch.pageHeight ?? 540;
      /** a JSON page point in board units, or null when the export wrote none */
      const pageLoc = (key: unknown): [number, number] | null => {
        const loc = objOf(key)?.geom?.loc;
        return loc && typeof loc.x === 'number' && typeof loc.y === 'number'
          ? [loc.x - w / 2, h / 2 - loc.y] : null;
      };
      for (const el of withImage) {
        const spec = image(el)!;
        // An auxiliary point of a copied figure is placed by its parent object's
        // map, which the export writes beside that object, not beside the point.
        const jo = objOf(el.id.slice(1).replace(/v\d+$/, ''));
        if (!jo) continue;
        const src = at(String(el.parents[0]));
        const pivot = spec.of.length && typeof board.objects[spec.of[0]]?.X === 'function'
          ? at(spec.of[0]) : [0, 0];
        const [c, cc] = [pivot[0], pivot[1]];
        // A point built on something the sketch itself leaves undefined is just
        // as undefined here, and the export writes no place for it either.
        if (!Number.isFinite(src[0]) || !Number.isFinite(src[1]) || !Number.isFinite(pivot[0])) continue;
        let want: [number, number] | null = null;
        if (spec.op === 'rotate' && typeof jo?.angle === 'number') {
          const [cos, sin] = [Math.cos(jo.angle), Math.sin(jo.angle)];
          want = [c + (src[0] - c) * cos - (src[1] - cc) * sin,
            cc + (src[0] - c) * sin + (src[1] - cc) * cos];
        } else if (spec.op === 'dilate' && typeof jo?.scaleFactor === 'number') {
          want = [c + jo.scaleFactor * (src[0] - c), cc + jo.scaleFactor * (src[1] - cc)];
        } else if (spec.op === 'translate' && typeof jo?.distance === 'number' && typeof jo?.angle === 'number') {
          want = [src[0] + jo.distance * Math.cos(jo.angle), src[1] + jo.distance * Math.sin(jo.angle)];
        } else if (spec.op === 'translate' && typeof jo?.offset?.x === 'number') {
          // the export writes the shift with the page's y running down
          want = [src[0] + jo.offset.x, src[1] - jo.offset.y];
        } else if (spec.op === 'translate' && jo?.constraint === 'TranslateVector') {
          const a = pageLoc(jo.parents?.p0);
          const b = pageLoc(jo.parents?.p1);
          if (a && b) want = [src[0] + (b[0] - a[0]), src[1] + (b[1] - a[1])];
        } else if (spec.op === 'reflect') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const mirror = objOf(jo.parents?.mirror);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ends = Object.values(mirror?.parents ?? {}).map((i) => pageLoc(i));
          if (ends.length === 2 && ends[0] && ends[1]) {
            const [ax, ay] = ends[0]!;
            const vx = ends[1]![0] - ax;
            const vy = ends[1]![1] - ay;
            const t = ((src[0] - ax) * vx + (src[1] - ay) * vy) / (vx * vx + vy * vy);
            want = [2 * (ax + t * vx) - src[0], 2 * (ay + t * vy) - src[1]];
          }
        }
        // A vector whose own ends the export places nowhere can be checked only
        // against the same formula, which would prove nothing.
        if (!want) continue;
        checked++;
        const [x, y] = at(el.id);
        expect(x, `${name} ${el.id} (${jo?.constraint}) x`).toBeCloseTo(want[0], 4);
        expect(y, `${name} ${el.id} (${jo?.constraint}) y`).toBeCloseTo(want[1], 4);
      }
      totalChecked += checked;
      JXG.JSXGraph.freeBoard(board);
    });
  }

  it('the library really holds transformed points to test', () => {
    expect(totalChecked).toBeGreaterThan(140);
  });
});

suite('every point the export places lands where it says', () => {
  /*
   * The strongest ground truth the corpus offers: the official export writes a
   * page location for most of the points it could work out, including the ones
   * built on a point that rides a line. Whatever the converter did to get there
   * — a ratio, a turn, a distance in the sketch's own unit, a map carried along
   * a chain of copies — the engine must end up on that pixel.
   */
  const POINTLIKE = new Set(['point', 'glider', 'midpoint', 'intersection']);
  it('holds for every fixture, point by point', () => {
    let compared = 0;
    for (const file of readdirSync(FIXTURES).filter((n) => n.endsWith('.gsp'))) {
      const name = file.slice(0, -4);
      if (!existsSync(join(FIXTURES, `${name}.json`))) continue;
      const { data, json, sketch } = convert(name);
      const [w, h] = [sketch.pageWidth ?? 780, sketch.pageHeight ?? 540];
      const board = newBoard(data.boundingbox);
      const out = applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
      expect(out.errors, name).toEqual([]);
      const objects = (json.pages[0] as unknown as { objects: Record<string, Record<string, unknown>> }).objects;
      for (const el of data.elements) {
        if (!POINTLIKE.has(el.type)) continue;
        const loc = (objects[el.id.slice(1)]?.geom as { loc?: { x: number; y: number } } | undefined)?.loc;
        if (!loc) continue;
        const o = board.objects[el.id];
        if (!o || !Number.isFinite(o.X())) continue;
        expect(o.X(), `${name} ${el.id} x`).toBeCloseTo(loc.x - w / 2, 0);
        expect(o.Y(), `${name} ${el.id} y`).toBeCloseTo(h / 2 - loc.y, 0);
        compared++;
      }
      JXG.JSXGraph.freeBoard(board);
    }
    expect(compared).toBeGreaterThan(120);
  }, 30_000);
});

suite('a measured object the sketch drew becomes a live caption', () => {
  /*
   * A Measure/* object carries no number: what it shows is whatever the geometry
   * works out to, read off the parents in the order they were picked. So the
   * only honest check is on a real board, against numbers the export states on
   * its own — where it places the points an imported measurement reads.
   */
  function opened(name: string) {
    const { data } = convert(name);
    const board = newBoard(data.boundingbox);
    const out = applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
    expect(out.errors).toEqual([]);
    const captionOf = (id: string) => measureCaption(board, data.elements.find((e) => e.id === id)!.attrs.measure as MeasureSpec);
    return { data, board, captionOf };
  }

  it('Dung_ngu_giac_deu: the vertex angle of the regular pentagon reads 108°', () => {
    const { data, captionOf } = opened('Dung_ngu_giac_deu');
    const angles = data.elements.filter((e) => (e.attrs.measure as MeasureSpec | undefined)?.op === 'angle');
    expect(angles).toHaveLength(2);
    expect(angles.map((e) => captionOf(e.id))).toContain('108.00°');
  });

  it('Trai_duong_tron: the distances read what the export places, and follow a drag', () => {
    const { data, board, captionOf } = opened('Trai_duong_tron');
    // A at (144, 284) and C at (682, 284) on the page — 538 px apart — and B
    // rides that segment at the fraction the file keeps for it
    const measure = data.elements.filter((e) => e.attrs.measure).map((e) => e.id);
    expect(measure).toHaveLength(2);
    expect(captionOf('e6')).toBe('538.00');
    expect(captionOf('e5')).toBe((0.2430483271376447 * 538).toFixed(2));

    const a = board.objects.e1;
    a.setPosition(JXG.COORDS_BY_USER, [a.X() - 100, a.Y()]);
    board.update();
    expect(captionOf('e6')).toBe('638.00');
    expect(captionOf('e5')).toBe((0.2430483271376447 * 638).toFixed(2));
  });
});

suite('a Calculation keeps the formula Sketchpad compiled', () => {
  /*
   * A Calculation's formula is bytecode, not text (record 2311: two bytes a
   * token). The official export prints the formula it was built from, so the
   * export is the ground truth for the decoder: same operands in the same
   * order, same number, same brackets — modulo the spelling of a unit.
   */
  const norm = (s: string) => s
    .replace(/\s+/g, '')
    .replace(/@/g, '#')
    .replace(/π/g, 'pi')
    .replace(/°/g, 'deg')
    .replace(/radians?/g, 'rad')
    .replace(/degrees?/g, 'deg');

  it('rebuilds every formula of the examples exactly as the export writes it', () => {
    let checked = 0;
    let converted = 0;
    for (const file of readdirSync(FIXTURES).filter((n) => n.endsWith('.gsp'))) {
      const name = file.slice(0, -4);
      if (!existsSync(join(FIXTURES, `${name}.json`))) continue;
      const { data, json, sketch } = convert(name);
      const [w, h] = [sketch.pageWidth ?? 780, sketch.pageHeight ?? 540];
      const made = new Map(data.elements.map((e) => [e.id, e]));
      const objects = (json.pages[0] as unknown as { objects: Record<string, Record<string, unknown>> }).objects;
      for (const [id, o] of Object.entries(objects)) {
        if (!/Calculation/.test(String(o.constraint))) continue;
        checked++;
        const el = made.get(`e${id}`);
        if (!el) continue; // a parent of its own did not convert
        converted++;
        const spec = el.attrs.measure as MeasureSpec & { expr: string };
        expect(norm(spec.expr), `${name} #${id}`).toBe(norm(String(o.expression)));
        expect(spec.args, `${name} #${id} operands`).toEqual(
          Object.values(o.parents as Record<string, string>).map((p) => `e${p}`),
        );
        const loc = (o.geom as { loc?: { x: number; y: number } } | undefined)?.loc;
        if (loc) {
          expect(el.parents[0]).toBeCloseTo(loc.x - w / 2, 6);
          expect(el.parents[1]).toBeCloseTo(h / 2 - loc.y, 6);
        }
      }
    }
    expect(converted).toBeGreaterThan(550);
    expect(checked).toBeGreaterThan(1000);
  });

  it('computes, live, on the board the sketch draws', () => {
    const { data } = convert('The_tich_vat_the_tron_xoay');
    const board = newBoard(data.boundingbox);
    applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
    // a length over itself is one, whatever the length turns out to be
    const self = data.elements.find((e) => (e.attrs.measure as MeasureSpec | undefined)?.expr === '#0/#0');
    expect(self, 'no x/x calculation survived').toBeDefined();
    expect(measureCaption(board, self!.attrs.measure as MeasureSpec)).toBe('m[10] = 1.00');
  });
});

suite('MFS text markup strips to readable text', () => {
  const cases: [string, string][] = [
    ['<VL<TCxthis is text>>', 'this is text'],
    ['<VL<T1ExĐây là chữ tiếng Việt>>', 'Đây là chữ tiếng Việt'],
    ['<VL<T7xAB < MN>>', 'AB < MN'],
    ['<0>', ''],
    ['<?1x2<H<T10xVô trong rồi!>>>', 'Vô trong rồi!'],
    ['<VL<H<T1x=></<T3x{1}><T3x{2}>><T3x : ></<T3x{3}><T3x{4}>>>>', '={1}{2} : {3}{4}'],
  ];
  for (const [raw, want] of cases) {
    it(`${raw.slice(0, 30)} -> ${want}`, () => {
      expect(stripMfs(raw)).toBe(want);
    });
  }

  it('joins styled runs without leaving markup', () => {
    const out = stripMfs('<T1AxNguyễn Đăng Minh Phúc><T13xhttp://mathworld.us><F1Axx101x20x8x>>');
    expect(out).not.toMatch(/[<>]/);
    expect(out.endsWith('http://mathworld.us')).toBe(true);
  });
});

suite('the sketch keeps its own colours and faces', () => {
  it('reads the text-style table the sketch was drawn with', () => {
    const { sketch } = load('t1_free_points');
    expect(sketch.textStyles[0]).toEqual({ index: 0, family: 'Times New Roman' });
    expect(sketch.textStyles).toHaveLength(6);
  });

  it('a point is filled with its colour, not JSXGraph\'s orange', () => {
    const { data } = convert('t1_free_points');
    expect(data.elements[0].attrs.fillColor).toBe('#ff0000');
    expect(data.elements[0].attrs.strokeColor).toBe('#ff0000');
  });

  it('labels are set in the sketch\'s font', () => {
    const { data } = convert('Dung_ngu_giac_deu');
    const label = data.elements[0].attrs.label as { fontFamily: string };
    expect(label.fontFamily).toContain('Times New Roman');
    // a caption too, which draws with CSS rather than a stroke colour
    const text = convert('t4_text_param').data.elements.find((e) => e.type === 'text');
    expect((text!.attrs.cssStyle as string)).toContain('Times New Roman');
  });

  it('every label sits where it was dragged to, as the export says', () => {
    for (const name of ['t1_free_points', 't4_text_param', 'Dung_ngu_giac_deu']) {
      const { data, json } = convert(name);
      const page = json.pages[0];
      let checked = 0;
      for (const el of data.elements) {
        const style = page.objects[el.id.slice(1)]?.style as
          { label?: { labelOffsetX?: number; labelOffsetY?: number } } | undefined;
        const off = style?.label;
        if (typeof off?.labelOffsetX !== 'number') continue;
        expect(el.attrs.label, `${name} ${el.id} lost its offset`).toMatchObject({
          offset: [off.labelOffsetX, off.labelOffsetY],
        });
        checked++;
      }
      expect(checked, `${name}: no label offsets were checked`).toBeGreaterThan(0);
    }
  });

  it('a constructed point keeps the letter it was given', () => {
    const { data } = convert('Dung_ngu_giac_deu');
    const built = data.elements.find((e) => e.type === 'intersection');
    expect(built?.attrs.name).toBeTruthy();
    expect(built?.attrs.showLabel).toBe(true);
  });
});

suite('document shell', () => {
  it('t1: bounding box, ids and vertex coordinates follow the page size', () => {
    const { data } = convert('t1_free_points');
    expect(data.boundingbox).toEqual([-390, 270, 390, -270]);
    expect(data.elements.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    // A was drawn at px (119, 54) on a 780x540 page
    expect(data.elements[0].parents).toEqual([119 - 390, 270 - 54]);
    expect(data.elements[0].attrs.name).toBe('A');
  });

  it('t5: each button behaviour the sketch holds survives conversion', () => {
    const { data, warnings } = convert('t5_button_anim');
    const buttons = data.elements.filter((e) => e.type === 'actionbutton');
    expect(buttons.map((b) => (b.attrs.button as ActionButtonSpec).action).sort())
      .toEqual(['animate', 'move', 'present', 'toggle']);
    for (const b of buttons) {
      const spec = b.attrs.button as ActionButtonSpec;
      expect(spec.targets.length).toBeGreaterThan(0);
      expect(spec.targets.every((t) => data.elements.some((e) => e.id === t))).toBe(true);
    }
    expect(warnings.join(' ')).not.toContain('không tồn tại');
  });

  it('moves the point the Sketchpad caption names first', () => {
    // Two files say the pairing out loud, and they settle the one order the
    // binary and the official JSON disagree about: a Move button's parents
    // alternate mover, destination in the file, reversed in the export.
    const cases = [
      { file: 'Bieu_do_Ven', caption: 'Move A', from: 'A', to: 'B' },
      { file: 'Hinh_chop_cut', caption: 'Move R', from: 'R', to: 'O' },
    ];
    for (const c of cases) {
      const { data } = convert(c.file);
      const nameOf = (id: string) => data.elements.find((e) => e.id === id)?.attrs.name;
      const button = data.elements.find((e) => {
        const spec = e.attrs.button as ActionButtonSpec | undefined;
        return spec?.action === 'move' && String(e.parents[2]).startsWith(c.caption);
      });
      expect(button, `${c.file}: ${c.caption} was not converted`).toBeDefined();
      const spec = button!.attrs.button as ActionButtonSpec;
      expect(nameOf(spec.targets[0]), `${c.file}: who moves`).toBe(c.from);
      expect(nameOf(spec.move!.destinations[0]), `${c.file}: to where`).toBe(c.to);
    }
  });
});

/*
 * Record 2310 read on a hand-written sketch. The fixtures decide what the bytes
 * mean; a synthetic object is the only way to pin each bit and the shapes the
 * files happen not to contain, without waiting for a sketch to draw one.
 */

const STYLE: GspStyle = {
  color: { r: 0, g: 0, b: 0 }, lineWidth: 0, dashed: false, hidden: false, pointStyle: 2,
};

function obj(partial: Partial<GspObject> & Pick<GspObject, 'id' | 'kind'>): GspObject {
  return {
    classId: 0, geomCode: 0, offset: 0, length: 0,
    style: STYLE, unknownTypes: [], rawSpans: [],
    ...partial,
  };
}

/** A free point, at page pixels with y running down the way Sketchpad stores it. */
const freePoint = (id: number, label: string, x: number, y: number): GspObject =>
  obj({ id, kind: 'point', classId: 4, label, coords: { x, y } });

const segmentOf = (id: number, a: number, b: number): GspObject =>
  obj({ id, kind: 'segment', classId: 5, parents: [a, b] });

/** A point on a path, which is what GSP animates and what a glider is. */
const onPath = (id: number, path: number, ratio: number): GspObject =>
  obj({ id, kind: 'point', classId: 10, geomCode: 15, parents: [path], value: ratio });

const buttonOf = (
  id: number,
  parents: number[],
  action: Partial<GspButtonAction>,
  label = 'Nút',
): GspObject =>
  obj({
    id, kind: 'button', label, parents,
    button: { actionKind: 0, subtype: 0, param: 0, x: 400, y: 120, ...action },
  });

/** The button a sketch ends with, with the document it was written into. */
function convertOne(...objects: GspObject[]) {
  const sketch: GspSketch = { pageWidth: 780, pageHeight: 540, textStyles: [], objects };
  const { data, warnings } = gspToHeyGeo(sketch, 'synthetic');
  const buttons = data.elements.filter((e) => e.type === 'actionbutton');
  const el = buttons[buttons.length - 1];
  return { spec: (el?.attrs.button as ActionButtonSpec) ?? null, el, data, warnings };
}

const AB = [freePoint(1, 'A', 100, 100), freePoint(2, 'B', 300, 100)];

suite('the button record converts to the behaviour Sketchpad meant', () => {
  it('tells a Hide/Show flip from the one-shot Show and Hide', () => {
    const hide = convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 0, subtype: 3 }));
    expect(hide.spec?.action).toBe('hide');
    expect(convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 1, subtype: 2 })).spec?.action).toBe('show');
    expect(convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 0, subtype: 6 })).spec?.action).toBe('toggle');
    expect(convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 1, subtype: 7 })).spec?.action).toBe('toggle');
  });

  it('names the button for the objects it acts on', () => {
    const { spec } = convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 0, subtype: 6 }, 'Ẩn hiện'));
    expect(spec?.targets).toEqual(['e1', 'e2']);
    expect(spec?.name).toBe('A, B');
  });

  it('takes the button box to the place the sketch drew it', () => {
    const { el } = convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 0, subtype: 6 }, 'Nút'));
    expect(el?.parents).toEqual([400 - 390, 270 - 120, 'Nút']);
  });

  it('reads the four Move speeds off the rate token', () => {
    const speeds = [0, 1, 2, 3].map((subtype) =>
      convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 3, subtype })).spec?.move?.speed);
    expect(speeds).toEqual(['slow', 'normal', 'fast', 'jump']);
  });

  it('pairs each mover with the destination written after it', () => {
    const { spec } = convertOne(
      ...AB, freePoint(3, 'C', 200, 300), freePoint(4, 'D', 400, 300),
      buttonOf(5, [1, 3, 2, 4], { actionKind: 3, subtype: 1 }),
    );
    expect(spec?.targets).toEqual(['e1', 'e2']);
    expect(spec?.move?.destinations).toEqual(['e3', 'e4']);
  });

  it('leaves out a third mover with no destination to run to', () => {
    const { spec } = convertOne(
      ...AB, freePoint(3, 'C', 200, 300),
      buttonOf(4, [1, 2, 3], { actionKind: 3, subtype: 1 }),
    );
    expect(spec?.targets).toEqual(['e1']);
    expect(spec?.move?.destinations).toEqual(['e2']);
  });

  it('animates a point on a path, and says which way its clock runs', () => {
    const path = [AB[0], AB[1], segmentOf(3, 1, 2), onPath(4, 3, 0.4)];
    const forward = convertOne(...path, buttonOf(5, [4], { actionKind: 2 }));
    expect(forward.spec?.action).toBe('animate');
    expect(forward.spec?.targets).toEqual(['e4']);
    expect(forward.spec?.animation).toEqual({ direction: 'forward', speed: 0.25 });

    const both = convertOne(
      ...path,
      obj({
        id: 5, kind: 'button', label: 'Chạy', parents: [4],
        button: { actionKind: 2, subtype: 0, param: 0, x: 400, y: 120 },
        animation: { flags: 0x20000000, speed: 24, extent: 0 },
      }),
    );
    expect(both.spec?.animation?.direction).toBe('both');
  });

  it('drops an Animate button with nothing on a path to run', () => {
    const { spec, warnings } = convertOne(...AB, buttonOf(3, [1, 2], { actionKind: 2 }));
    expect(spec).toBeNull();
    expect(warnings.join(' ')).toContain('nut Animate');
  });

  it('keeps a Presentation sequence apart from one press of all its buttons', () => {
    const two = [
      ...AB,
      buttonOf(3, [1], { actionKind: 0, subtype: 6 }, 'Ẩn A'),
      buttonOf(4, [2], { actionKind: 0, subtype: 6 }, 'Ẩn B'),
    ];
    const sequential = convertOne(...two, buttonOf(5, [3, 4], { actionKind: 7, subtype: 9, param: 30 }));
    expect(sequential.spec?.present).toEqual({ sequential: true, pause: 3 });
    expect(sequential.spec?.targets).toEqual(['e3', 'e4']);

    const atOnce = convertOne(...two, buttonOf(5, [3, 4], { actionKind: 7, subtype: 0, param: 600 }));
    expect(atOnce.spec?.present).toEqual({ sequential: false, pause: 0 });
  });

  it('leaves out a button whose objects the sketch could not carry over', () => {
    const { spec, warnings } = convertOne(
      ...AB, obj({ id: 3, kind: 'measurement' }),
      buttonOf(4, [3], { actionKind: 0, subtype: 6 }),
    );
    expect(spec).toBeNull();
    expect(warnings.join(' ')).toContain('nut (khong co doi tuong dich)');
  });
});

suite('every button the real sketches hold can be pressed', () => {
  it('converts to a spec the designer accepts', () => {
    let checked = 0;
    for (const file of readdirSync(FIXTURES).filter((n) => n.endsWith('.gsp'))) {
      const name = file.slice(0, -4);
      if (!existsSync(join(FIXTURES, `${name}.json`))) continue;
      const { data } = convert(name);
      for (const el of data.elements.filter((e) => e.type === 'actionbutton')) {
        const spec = el.attrs.button;
        expect(isActionButtonSpec(spec), `${name} ${el.id}`).toBe(true);
        expect(buttonProblem(spec as ActionButtonSpec, data.elements), `${name} ${el.id}`).toBeNull();
        checked++;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(20);
  });
});

suite('an imported button presses on the real board', () => {
  /** The converted document, opened the way the designer and the viewer open it. */
  function opened(name: string) {
    const { data } = convert(name);
    const board = newBoard(data.boundingbox);
    applyScene(board, takeScene(data.elements, { axis: false, grid: false }));
    const runtime = createButtonRuntime({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      board: () => board as any,
      elements: () => data.elements,
    });
    const buttonWith = (action: string) => data.elements.find(
      (e) => (e.attrs.button as ActionButtonSpec | undefined)?.action === action,
    );
    return { data, board, runtime, buttonWith };
  }

  it('hides the point a Hide/Show was made over, and offers to show it again', () => {
    const { board, runtime, buttonWith } = opened('t5_button_anim');
    const btn = buttonWith('toggle')!;
    const spec = btn.attrs.button as ActionButtonSpec;
    const target = spec.targets[0];
    expect(board.objects[target].visProp.visible).toBe(true);

    expect(runtime.press(btn)).toBe(true);
    expect(board.objects[target].visProp.visible).toBe(false);
    expect(String(board.objects[btn.id].plaintext)).toContain('Hiện');

    expect(runtime.press(btn)).toBe(true);
    expect(board.objects[target].visProp.visible).toBe(true);
    expect(String(board.objects[btn.id].plaintext)).toContain('Ẩn');
  });

  /** Press a button that needs the frame clock, and run that clock to the end. */
  function pressToTheEnd(runtime: ButtonRuntime, el: HeyGeoElement): boolean {
    const clock: { step: ((now: number) => void) | null } = { step: null };
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => { clock.step = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', () => { clock.step = null; });
    try {
      const pressed = runtime.press(el);
      // a time well past the run, so the last frame writes the resting place
      let guard = 0;
      while (clock.step && guard++ < 30) {
        const next = clock.step;
        clock.step = null;
        next(performance.now() + 60_000);
      }
      return pressed;
    } finally {
      vi.unstubAllGlobals();
    }
  }

  it('runs a Move button to its destination, along the path it rides', () => {
    const { board, runtime, buttonWith } = opened('t5_button_anim');
    const btn = buttonWith('move')!;
    const spec = btn.attrs.button as ActionButtonSpec;
    const mover = board.objects[spec.targets[0]];
    const dest = board.objects[spec.move!.destinations[0]];
    const far = Math.hypot(mover.X() - dest.X(), mover.Y() - dest.Y());
    expect(far).toBeGreaterThan(1);

    expect(pressToTheEnd(runtime, btn)).toBe(true);
    // the mover is a glider, so it lands where its path runs nearest the goal
    const near = Math.hypot(mover.X() - dest.X(), mover.Y() - dest.Y());
    expect(near).toBeLessThan(far);
  });

  it('presses the buttons a Presentation names', () => {
    const { board, runtime, buttonWith } = opened('t5_button_anim');
    const present = buttonWith('present')!;
    const move = buttonWith('move')!;
    const spec = present.attrs.button as ActionButtonSpec;
    expect(spec.present?.sequential).toBe(false);
    expect(spec.targets.every((t) => board.objects[t])).toBe(true);

    const run = move.attrs.button as ActionButtonSpec;
    const mover = board.objects[run.targets[0]];
    const dest = board.objects[run.move!.destinations[0]];
    const far = Math.hypot(mover.X() - dest.X(), mover.Y() - dest.Y());

    expect(pressToTheEnd(runtime, present)).toBe(true);
    expect(Math.hypot(mover.X() - dest.X(), mover.Y() - dest.Y())).toBeLessThan(far);
  });
});
