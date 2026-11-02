import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseGsp, type GspObjectKind } from './gspBinary';

/*
 * Cross-fixture probes over all 23 paired examples in
 * GSP-reference/gsp_examples: X.gsp (Sketchpad binary) + X.json (Web
 * Sketchpad export of the same sketch). These encode the invariants that
 * made the format research reproducible; they also pin down which features
 * remain undecoded (see skips at the bottom).
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(HERE, '..', '..', '..', 'GSP-reference', 'gsp_examples');

const KINDS: GspObjectKind[] = [
  'point',
  'segment',
  'line',
  'ray',
  'circle',
  'arc',
  'polygon',
  'interior',
  'text',
  'number',
  'measurement',
  'button',
  'other',
];

interface JsonFixture {
  metadata: { width: number; height: number };
  pages: { objects: Record<string, Record<string, unknown>> }[];
}

// The fixtures are Sketchpad's own sample sketches and stay out of the
// repository; without them there is nothing to probe.
const suite = existsSync(FIXTURES) ? describe : describe.skip;
const names = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
    .filter((f) => f.endsWith('.gsp') && readdirSync(FIXTURES).includes(f.replace(/\.gsp$/, '.json')))
    .map((f) => f.slice(0, -'.gsp'.length))
    .sort()
  : [];

function load(name: string) {
  const buf = readFileSync(join(FIXTURES, `${name}.gsp`));
  const sketch = parseGsp(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  const json: JsonFixture = JSON.parse(readFileSync(join(FIXTURES, `${name}.json`), 'utf8'));
  return { sketch, json };
}

function expectedKind(j: Record<string, unknown>): GspObjectKind {
  const kind = String(j.kind);
  const genus = String(j.genus);
  if (kind === 'Point') return 'point';
  if (kind === 'Straight') {
    if (genus === 'Segment') return 'segment';
    if (genus === 'Ray') return 'ray';
    return 'line';
  }
  if (kind === 'Circle') return 'circle';
  if (kind === 'Arc') return 'arc';
  if (kind === 'Polygon') return 'polygon';
  if (kind === 'CircleInterior' || kind === 'ArcInterior') return 'interior';
  if (kind === 'Text') return 'text';
  if (kind === 'Button') return 'button';
  if (kind === 'Measure') return 'measurement';
  if (kind === 'Expression') return genus.includes('Parameter') ? 'number' : 'measurement';
  return 'other';
}

suite('all fixtures: framing + object-count + id invariants', () => {
  it(`has ${23} paired fixtures`, () => {
    expect(names.length).toBeGreaterThanOrEqual(23);
  });

  for (const name of names) {
    it(`${name}: never throws, ids are 1..N, count == JSON export`, () => {
      const { sketch, json } = load(name);
      const ids = Object.keys(json.pages[0].objects).map(Number).sort((a, b) => a - b);
      expect(sketch.objects.length).toBe(ids.length);
      sketch.objects.forEach((o, i) => {
        expect(o.id).toBe(ids[i]);
        expect(KINDS).toContain(o.kind);
        expect(o.length).toBeGreaterThan(0);
        expect(o.unknownTypes.every((t) => Number.isInteger(t) && t >= 0)).toBe(true);
      });
    });
  }
});

suite('all fixtures: cross-checked field semantics', () => {
  for (const name of names) {
    it(`${name}: page size, kinds, parents multisets, free coords`, () => {
      const { sketch, json } = load(name);
      expect(sketch.pageWidth).toBe(json.metadata.width);
      expect(sketch.pageHeight).toBe(json.metadata.height);
      const jobjs = json.pages[0].objects;
      for (const o of sketch.objects) {
        const j = jobjs[String(o.id)];
        expect(o.kind).toBe(expectedKind(j));
        const jp = (j.parents ?? {}) as Record<string, string>;
        const want = Object.values(jp).map(Number).sort((a, b) => a - b);
        const got = [...(o.parents ?? [])].sort((a, b) => a - b);
        expect(got).toEqual(want);
        const geom = j.geom as { loc?: { x: number; y: number } } | undefined;
        if (o.coords && geom?.loc) {
          expect(Math.abs(o.coords.x - geom.loc.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(o.coords.y - geom.loc.y)).toBeLessThanOrEqual(1);
        }
      }
    });
  }
});

suite('undecoded features (blocking unknowns)', () => {
  it.skip('locus / function-plot sampler payload (record 2306)', () => {
    // BLOCKING UNKNOWN: 2306 holds sampled curve points for Samplers
    // (classes 42/43/58) but its internal layout is not decoded; the parser
    // keeps the raw span and reports type 2306 in unknownTypes.
  });
  it.skip('picture payloads (records 2216 / 2316 / 8004 on class 78)', () => {
    // BLOCKING UNKNOWN: embedded image data (JPEG?) framing; raw span kept.
  });
  it.skip('iterate maps (record 2314 on class 64)', () => {
    // BLOCKING UNKNOWN: IterateMap parent/definition encoding.
  });
  it.skip('trace data and record 9006', () => {
    // BLOCKING UNKNOWN: 9006 appears inside unrelated objects and NOT on
    // traced ones; trace itself seems to be session-only. Spans preserved.
  });
  it.skip('record 2008 semantics (label flag? point radius?)', () => {
    // BLOCKING UNKNOWN: 2008 (u16 0..3) correlates with label presence, not
    // with JSON point radius/labelOffset (e.g. Compa #1 vs t4 #6).
  });
});
