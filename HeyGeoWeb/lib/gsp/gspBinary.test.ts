import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseGsp, type GspObject, type GspObjectKind } from './gspBinary';

/*
 * Ground truth: GSP-reference/gsp_examples holds 23 paired fixtures —
 * X.gsp saved by Sketchpad and X.json exported from the same sketch by the
 * Web Sketchpad exporter (5.11 build 3060). Object ids in the binary equal
 * the JSON object keys 1..N (verified for every pair; see gspFormatProbe).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', '..', 'GSP-reference', 'gsp_examples');
const suite = existsSync(FIXTURES) ? describe : describe.skip;

interface JsonFixture {
  metadata: { width: number; height: number };
  pages: { objects: Record<string, Record<string, unknown>> }[];
}

function load(name: string) {
  const buf = readFileSync(join(FIXTURES, `${name}.gsp`));
  const sketch = parseGsp(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  const json: JsonFixture = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));
  return { sketch, json };
}

function obj(sketch: ReturnType<typeof parseGsp>, id: number): GspObject {
  const o = sketch.objects.find((x) => x.id === id);
  if (!o) throw new Error(`object #${id} missing`);
  return o;
}

/** Map a JSON-exporter kind/genus onto the parser's kind vocabulary. */
function expectedKind(j: Record<string, unknown>): GspObjectKind {
  const kind = String(j.kind);
  const genus = String(j.genus);
  if (kind === 'Point') return 'point';
  if (kind === 'Straight') {
    if (genus === 'Segment') return 'segment';
    if (genus === 'Ray') return 'ray';
    return 'line'; // Line, Parallel, Perpendicular, Bisector
  }
  if (kind === 'Circle') return 'circle';
  if (kind === 'Arc') return 'arc';
  if (kind === 'Polygon') return 'polygon';
  if (kind === 'CircleInterior' || kind === 'ArcInterior') return 'interior';
  if (kind === 'Text') return 'text';
  if (kind === 'Button') return 'button';
  if (kind === 'Measure') return 'measurement';
  if (kind === 'Expression') {
    return genus.includes('Parameter') ? 'number' : 'measurement';
  }
  return 'other'; // Axis, CoordSys, Sampler, Map, Picture, IterateImage
}

function jsonParentIds(j: Record<string, unknown>): number[] {
  const p = j.parents as Record<string, string> | undefined;
  return p ? Object.values(p).map(Number).sort((a, b) => a - b) : [];
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

suite('t1_free_points: three labelled free points', () => {
  const { sketch, json } = load('t1_free_points');

  it('exposes page geometry and build stamp', () => {
    expect(sketch.pageWidth).toBe(json.metadata.width); // 780 @ 0x1e
    expect(sketch.pageHeight).toBe(json.metadata.height); // 540 @ 0x20
    expect(sketch.buildStamp).toMatch(/^GSP5_m_3060N/);
  });

  it('finds exactly 3 point objects with ids 1..3', () => {
    expect(sketch.objects.length).toBe(3);
    sketch.objects.forEach((o, i) => {
      expect(o.id).toBe(i + 1);
      expect(o.kind).toBe('point');
    });
  });

  it('decodes coordinates within ±1 of the JSON export', () => {
    const jobjs = json.pages[0].objects;
    for (const id of ['1', '2', '3']) {
      const loc = (jobjs[id].geom as { loc: { x: number; y: number } }).loc;
      const o = obj(sketch, Number(id));
      expect(o.coords).toBeDefined();
      expect(Math.abs(o.coords!.x - loc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(o.coords!.y - loc.y)).toBeLessThanOrEqual(1);
    }
    // Spot-check the exact values (record 2201 stores screen f64 doubles).
    expect(obj(sketch, 1).coords).toEqual({ x: 119, y: 54 });
    expect(obj(sketch, 2).coords).toEqual({ x: 106, y: 139 });
    expect(obj(sketch, 3).coords).toEqual({ x: 217, y: 127 });
  });

  it('decodes labels A/B/C with auto-label offsets', () => {
    expect([obj(sketch, 1).label, obj(sketch, 2).label, obj(sketch, 3).label]).toEqual([
      'A',
      'B',
      'C',
    ]);
    expect(obj(sketch, 1).labelOffset).toEqual({ x: 8, y: 5 });
  });

  it('decodes default point style (red, thin, solid, visible)', () => {
    const o = obj(sketch, 1);
    expect(o.style.color).toEqual({ r: 255, g: 0, b: 0 });
    expect(o.style.hidden).toBe(false);
    expect(o.style.dashed).toBe(false);
    expect(o.style.pointStyle).toBe(2); // family byte in the 2000 header
  });
});

suite('t2_lines_circles: segment/line/ray/circle/arc + points on circle', () => {
  const { sketch, json } = load('t2_lines_circles');
  const jobjs = json.pages[0].objects;

  it('object count and per-object kinds match the JSON export', () => {
    const ids = Object.keys(jobjs);
    expect(sketch.objects.length).toBe(ids.length); // 18
    ids.forEach((id, i) => {
      expect(obj(sketch, i + 1).kind).toBe(expectedKind(jobjs[id]));
    });
    expect(obj(sketch, 3).kind).toBe('segment');
    expect(obj(sketch, 6).kind).toBe('line');
    expect(obj(sketch, 9).kind).toBe('ray');
    expect(obj(sketch, 12).kind).toBe('circle');
    expect(obj(sketch, 18).kind).toBe('arc');
  });

  it('verifies parent id sets (record 2002) against JSON parents', () => {
    Object.keys(jobjs).forEach((id) => {
      const o = obj(sketch, Number(id));
      expect([...(o.parents ?? [])].sort((a, b) => a - b)).toEqual(jsonParentIds(jobjs[id]));
    });
    expect(obj(sketch, 18).parents).toEqual([13, 16, 17]); // arc: center first
  });

  it('decodes point-on-circle parameters (record 2003 stores cos(2*PI*ratio))', () => {
    const t16 = 0.94879180882521885;
    const t17 = 0.088121119326900074;
    expect(obj(sketch, 16).value).toBeCloseTo(Math.cos(2 * Math.PI * t16), 12);
    expect(obj(sketch, 17).value).toBeCloseTo(Math.cos(2 * Math.PI * t17), 12);
    expect(obj(sketch, 16).parents).toEqual([15]);
  });

  it('decodes dashed vs solid circle styles (pen code nibble)', () => {
    expect(obj(sketch, 15).style.dashed).toBe(true);
    expect(obj(sketch, 12).style.dashed).toBe(false);
  });
});

suite('t3_constructed: midpoint, intersection, parallel, perpendicular', () => {
  const { sketch, json } = load('t3_constructed');
  const jobjs = json.pages[0].objects;

  it('all kinds and parent sets match', () => {
    Object.keys(jobjs).forEach((id) => {
      const o = obj(sketch, Number(id));
      expect(o.kind).toBe(expectedKind(jobjs[id]));
      expect([...(o.parents ?? [])].sort((a, b) => a - b)).toEqual(jsonParentIds(jobjs[id]));
    });
  });

  it('midpoint has one segment parent (class 11, geom 1)', () => {
    const o = obj(sketch, 4);
    expect(o.kind).toBe('point');
    expect(o.classId).toBe(11);
    expect(o.geomCode).toBe(1);
    expect(o.parents).toEqual([3]);
  });

  it('intersection is a point with both segments as parents (class 45)', () => {
    const o = obj(sketch, 11);
    expect(o.kind).toBe('point');
    expect(o.classId).toBe(45);
    expect(o.geomCode).toBe(9); // first intersection slot
    expect([...o.parents!].sort((a, b) => a - b)).toEqual([7, 10]);
  });

  it('parallel and perpendicular resolve as lines with point+line parents (classes 46/47)', () => {
    const par = obj(sketch, 16);
    const per = obj(sketch, 18);
    expect(par.kind).toBe('line');
    expect(per.kind).toBe('line');
    expect(par.classId).toBe(46);
    expect(par.geomCode).toBe(6);
    expect(per.classId).toBe(47);
    expect(per.geomCode).toBe(5);
    expect([...par.parents!].sort((a, b) => a - b)).toEqual([14, 15]);
    expect([...per.parents!].sort((a, b) => a - b)).toEqual([14, 17]);
  });
});

suite('t4_text_param: text blocks, parameters, measurements, axes', () => {
  const { sketch, json } = load('t4_text_param');
  const jobjs = json.pages[0].objects;

  it('decodes both caption strings incl. Vietnamese UTF-8 (record 2300)', () => {
    const t1 = obj(sketch, 1);
    expect(t1.kind).toBe('text');
    expect(t1.text).toContain('this is text');
    expect(t1.textPos).toEqual({ x: 101, y: 69 });

    const t2 = obj(sketch, 2);
    expect(t2.text).toContain('Đây là chữ tiếng Việt');
    expect(t2.textPos).toEqual({ x: 67, y: 122 });
  });

  it('decodes parameter labels and value metadata (records 2005 + 2311)', () => {
    const p1 = obj(sketch, 3);
    expect(p1.kind).toBe('number');
    expect(p1.label).toBe('parameter');
    expect(p1.numberRange!.min).toBe(-100);
    expect(p1.numberRange!.max).toBe(100);
    expect(p1.numberRange!.step).toBeCloseTo(0.01, 12);
    expect(p1.numberRange!.defaultValue).toBe(1);

    // Angle parameters are stored in radians; default bubble is 45°, range 0..360°.
    const p2 = obj(sketch, 4);
    expect(p2.label).toBe('parameter2');
    expect(p2.numberRange!.min).toBe(0);
    expect(p2.numberRange!.max).toBeCloseTo(Math.PI * 2, 9);
    expect(p2.numberRange!.step).toBeCloseTo((5 * Math.PI) / 180, 9);
    expect(p2.numberRange!.defaultValue).toBeCloseTo(Math.PI / 4, 9);

    // Distance parameters are stored in screen units (1 cm = 28.3465 px).
    const p3 = obj(sketch, 5);
    expect(p3.label).toBe('parameter3');
    expect(p3.numberRange!.min).toBe(0);
    expect(p3.numberRange!.max).toBeCloseTo(100 * 28.346456692913385, 6);
    expect(p3.numberRange!.step).toBeCloseTo(28.346456692913385, 9);
  });

  it('decodes point labels B/A with negative offsets and the segment', () => {
    expect(obj(sketch, 6).label).toBe('B');
    expect(obj(sketch, 7).label).toBe('A');
    expect(obj(sketch, 7).labelOffset).toEqual({ x: -15, y: 3 });
    expect(obj(sketch, 8).kind).toBe('segment');
  });

  it('decodes measurement display position and precision (record 2307)', () => {
    for (const id of [9, 10, 17]) {
      const o = obj(sketch, id);
      expect(o.kind).toBe('measurement');
      expect(o.measurePrecision).toBe(2);
    }
    expect(obj(sketch, 9).textPos).toEqual({ x: 73, y: 266 });
    expect(obj(sketch, 10).textPos).toEqual({ x: 73, y: 288 });
    expect([...obj(sketch, 9).parents!].sort((a, b) => a - b)).toEqual([6, 7]);
    expect(obj(sketch, 10).parents).toEqual([8]);
  });

  it('decodes axis orientation (record 2309) and hidden unit point (flags2)', () => {
    expect(obj(sketch, 13).axisOrientation).toBe('horizontal');
    expect(obj(sketch, 15).axisOrientation).toBe('vertical');
    expect(obj(sketch, 14).style.hidden).toBe(true); // JSON style.hidden
    expect(obj(sketch, 16).kind).toBe('other'); // CoordSys (class 39)
  });

  it.skip('current non-integer parameter values (30°, 3 cm) — unknown storage', () => {
    // BLOCKING UNKNOWN: 2311 stores step/min/max/default but not edited
    // non-integer current values; tail u16s after the f64 block (e.g. 03 00
    // 00 00 01 01) not yet decoded.
  });
});

suite('t5_button_anim: action buttons', () => {
  const { sketch, json } = load('t5_button_anim');
  const jobjs = json.pages[0].objects;

  it('button kinds, labels, positions and parents match', () => {
    for (const id of [5, 6, 7, 8]) {
      const o = obj(sketch, id);
      expect(o.kind).toBe('button');
      expect([...(o.parents ?? [])].sort((a, b) => a - b)).toEqual(jsonParentIds(jobjs[String(id)]));
    }
    expect(obj(sketch, 5).label).toBe('Animate Point');
    expect(obj(sketch, 5).coords).toEqual({ x: 10, y: 5 }); // from 2310
    expect(obj(sketch, 8).coords).toEqual({ x: 10, y: 74 });
  });

  it('decodes action kinds from record 2310 (2=animate, 3=move, 0=hide-toggle, 7=present)', () => {
    expect(obj(sketch, 5).button!.actionKind).toBe(2);
    expect(obj(sketch, 6).button!.actionKind).toBe(3);
    expect(obj(sketch, 7).button!.actionKind).toBe(0);
    expect(obj(sketch, 8).button!.actionKind).toBe(7);
    expect(obj(sketch, 8).button!.param).toBe(600);
  });

  it('partially decodes the animate state blob (2003 on button #5)', () => {
    const a = obj(sketch, 5).animation!;
    expect(a.speed).toBeCloseTo(24.0, 5); // rate 3 px/s
    expect(a.flags).toBe(0x20000000); // motionType "both" + repeat
  });

  it('point-on-segment value #4 (record 2003)', () => {
    expect(obj(sketch, 4).value).toBeCloseTo(0.30670011456563823, 9);
  });

  it.skip('full animation semantics — unknown constants in 2003 blob', () => {
    // BLOCKING UNKNOWN: f32@20 = 25600.0 (≈ width << 8) and the meaning of
    // f32@12/@16 for timeInterval > 0 are not confirmed; move-button rate
    // subtype (2310 @14 = 1 vs JSON rate 3) unresolved.
  });
});
