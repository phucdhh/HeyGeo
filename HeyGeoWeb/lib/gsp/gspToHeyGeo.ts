/**
 * Convert a parsed binary Sketchpad sketch (".gsp", magic "GSP4") into the
 * HeyGeo designer document format, so a legacy sketch opens as live, editable
 * geometry instead of a picture.
 *
 * Ground truth for every mapping here is one of the 23 paired fixtures in
 * GSP-reference/gsp_examples (X.gsp + official Web Sketchpad X.json export).
 * Objects this app cannot represent yet (measurements, axes, loci, iterate,
 * pictures) are skipped and reported in `warnings` rather than guessed at.
 *
 * Coordinates: GSP stores screen pixels with y down and the page origin at the
 * top-left; the designer document centres its bounding box on the origin with
 * y up, one unit to one pixel.
 */
import type { GspObject, GspSketch } from './gspBinary';
import type { HeyGeoData, HeyGeoElement } from '../../components/designer/designTypes';
import { fontStack, withFontFamily } from '../../components/designer/fontModel';
import type { MeasureSpec } from '../../components/designer/measurement';
import type { ImageSpec } from '../../components/designer/transforms';
import type { ActionButtonAction, MoveSpeed } from '../../components/designer/actionButtonModel';

export interface GspConvertOutcome {
  data: HeyGeoData;
  /** Human-readable (Vietnamese) notes: what was skipped and what degraded. */
  warnings: string[];
}

type E = HeyGeoElement;

const el = (type: string, id: string, parents: E['parents'], attrs: E['attrs'] = {}): E => ({
  type, id, parents, attrs,
});

const hex = (c: { r: number; g: number; b: number }) =>
  '#' + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, '0')).join('');

const WIDTH_BY_PEN = [2, 1, 2, 4];

/** Kinds that wear their Sketchpad name on the page. */
const NAMEABLE = new Set(['point', 'segment', 'line', 'ray', 'circle', 'arc', 'polygon']);

/**
 * Record 2310's Move speed token, read off the fixtures whose official Web
 * Sketchpad export writes the rate beside it: 1 unit a second is slow, 3 normal,
 * 5 fast, and 0 a jump that arrives before it starts.
 */
const MOVE_SPEED_BY_SUBTYPE: MoveSpeed[] = ['slow', 'normal', 'fast', 'jump'];

/**
 * The colours and line the object was drawn with. A point is filled as well as
 * outlined: Sketchpad paints the whole dot in its colour, while JSXGraph fills
 * with its own orange and would leave nothing but a ring of the sketch's.
 */
function styleAttrs(o: GspObject, filled = false): Record<string, unknown> {
  const colour = hex(o.style.color);
  const a: Record<string, unknown> = { strokeColor: colour };
  if (filled) a.fillColor = colour;
  const w = WIDTH_BY_PEN[o.style.lineWidth] ?? 2;
  if (w !== 2) a.strokeWidth = w;
  if (o.style.dashed) a.dash = 2;
  if (o.style.hidden) a.visible = false;
  return a;
}

/**
 * Strip Sketchpad's MFS text markup to readable characters.
 *
 * A run is `<STYLE text>` where the style token is self-delimiting — `VL`, `H`
 * and `?1x1` wrap a following `<`, `T<hex>x`/`F<hex>x…` start a styled run,
 * `0>` is a measure placeholder, `/` closes a box — and a run ends at the
 * matching `>`. So the tags are consumed one at a time and everything else is
 * the text; a blanket `<…>` strip would eat `AB < MN` and every `>>` tail.
 * Box layout (fractions stack numerator over denominator) flattens to one line.
 */
export function stripMfs(raw: string): string {
  const OPENERS = [/^(VL|H|\?\dx\d)</, /^T[0-9A-Fa-f]*x/, /^F[0-9A-Fa-fx]*x/, /^0>/, /^\//];
  let out = '';
  let i = 0;
  while (i < raw.length) {
    const c = raw[i];
    if (c === '>') { i++; continue; }
    if (c === '<') {
      const rest = raw.slice(i + 1);
      const hit = OPENERS.map((re) => re.exec(rest)).find(Boolean);
      if (hit) { i += 1 + hit![0].length - (/</.test(hit![0][hit![0].length - 1]) ? 1 : 0); continue; }
      out += '<';
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out
    .replace(/\\[^\n]/g, (m) => m[1])
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .trim();
}

export function gspToHeyGeo(sketch: GspSketch, title: string): GspConvertOutcome {
  const w = sketch.pageWidth ?? 780;
  const h = sketch.pageHeight ?? 540;
  const X = (px: number) => px - w / 2;
  const Y = (py: number) => h / 2 - py;

  const warnings: string[] = [];
  const skipNote = new Map<string, number>();
  const softNote = new Map<string, number>();
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const byId = new Map<number, GspObject>(sketch.objects.map((o) => [o.id, o]));
  const gid = (id: number) => `e${id}`;

  /**
   * Style 0 of the sketch's own text-style table, which is the face its labels
   * and captions are set in — usually Times New Roman. Without it every imported
   * sketch would draw its letters in the browser's default sans.
   */
  const face = (() => {
    const family = sketch.textStyles.find((s) => s.index === 0)?.family;
    return family ? fontStack(family) : null;
  })();

  /** The label's face and the place it was dragged to, as the designer stores them. */
  const labelAttrs = (o: GspObject): Record<string, unknown> => {
    const label: Record<string, unknown> = {};
    if (face) label.fontFamily = face;
    if (o.labelOffset) label.offset = [o.labelOffset.x, o.labelOffset.y];
    return Object.keys(label).length ? { label } : {};
  };

  /**
   * The name Sketchpad shows beside the object, on whatever attributes it is
   * drawn with. Most labeled objects in a real sketch are constructed ones —
   * intersections, midpoints, points on a path — so this is not only about the
   * free points a click dropped on the page.
   */
  const named = (o: GspObject, base: Record<string, unknown>): Record<string, unknown> =>
    o.label ? { ...base, ...labelAttrs(o), name: o.label, showLabel: true } : base;
  // ids of objects the converter actually emitted, for parent resolution
  const emitted = new Set<string>();
  const elements: E[] = [];
  const byEl = new Map<string, E>();

  const emit = (o: GspObject, e: E) => {
    elements.push(e);
    emitted.add(e.id);
    byEl.set(e.id, e);
  };

  /** Parent ids of o, kept only where the parent itself was emitted. */
  const resolvedParents = (o: GspObject): (string | number)[] | null => {
    if (!o.parents || o.parents.length === 0) return null;
    const out = o.parents.map((p) => gid(p));
    return out.every((p) => emitted.has(p)) ? out : null;
  };

  const coordsOf = (id: number) => byId.get(id)?.coords;

  /** Paths whose stored value is an angle's cos, not a ratio along the path. */
  const onCircleLike = (path: GspObject) => path.classId === 28 || path.classId === 67;

  /**
   * The turn a point on a circle or an arc has taken, in radians from the path's
   * own reference point. The record keeps it as the exact pair (cos, sin) of the
   * angle — the second double is what tells the half of the circle apart, so
   * nothing here is guessed — and a 12-byte record that keeps only the ratio is
   * read as the fraction of the whole turn it is.
   */
  function gliderTurn(o: GspObject): number {
    const cos = o.value;
    if (cos === undefined) return 0;
    const sin = v2003(o, 12);
    if (sin !== null && Math.abs(cos * cos + sin * sin - 1) < 1e-6) return Math.atan2(sin, cos);
    return 2 * Math.PI * cos;
  }

  /** Page pixels in one of the sketch's own length units (a centimetre, by default). */
  const UNIT_PX = 72 / 2.54;
  const UNIT_PX_96 = (72 / 2.54) * (4 / 3);

  /**
   * How many page pixels the sketch counts as one unit.
   *
   * A point on a line or a ray is placed by how far along it sits, in the
   * sketch's own unit — 2.7 or 5.5, not 77 or 158. That unit is the centimetre
   * its distances are typed in, and a sketch written by a 96-pixel-per-inch
   * build measures it a third larger; the typed lengths record 2003 keeps twice
   * (at 32 as drawn, at 40 as typed) say which build wrote the file, exactly as
   * they do for `typedLength`.
   */
  const unitPx = ((): (() => number) => {
    let settled: number | null = null;
    return () => {
      if (settled !== null) return settled;
      settled = UNIT_PX;
      for (const o of sketch.objects) {
        if (o.geomCode !== 21 || !o.valueRaw) continue;
        const px = v2003(o, 32);
        const typed = v2003(o, 40);
        if (px === null || typed === null || typed === 0) continue;
        const ratio = px / typed;
        for (const unit of [1, 72 / 25.4, 720 / 25.4, 72]) {
          if (Math.abs(ratio - unit * (4 / 3)) < unit * 0.002) { settled = UNIT_PX_96; return settled; }
          if (Math.abs(ratio - unit) < unit * 0.002) { settled = UNIT_PX; return settled; }
        }
      }
      return settled;
    };
  })();

  /**
   * Where a point-on-path sits, in user units, or null when the path's own
   * defining points carry no position this file can read.
   *
   * The parameter is the turn from the path's own radius point for a circle or
   * an arc, the ratio along the path for a segment, and a distance in the
   * sketch's unit for a line or a ray — all three read from the same record.
   */
  function gliderPlace(o: GspObject, path: GspObject): [number, number] | null {
    const ps = path.parents ?? [];
    if (!onCircleLike(path)) {
      const a = coordsOf(ps[0]);
      const b = coordsOf(ps[1]);
      if (!a || !b) return null;
      const t = o.value ?? 0;
      if (path.classId === 14) {
        return [X(a.x + t * (b.x - a.x)), Y(a.y + t * (b.y - a.y))];
      }
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < 1e-9) return null;
      const d = (t * unitPx()) / len;
      return [X(a.x + (b.x - a.x) * d), Y(a.y + (b.y - a.y) * d)];
    }
    // centre and radius: a circle names [centre, point-on], an arc names its
    // centre directly or through the circle it was cut from
    let center = path.classId === 28 ? coordsOf(ps[0]) : undefined;
    let rim = path.classId === 28 ? coordsOf(ps[1]) : undefined;
    if (path.classId === 67) {
      if (path.geomCode === 80) { center = coordsOf(ps[0]); rim = coordsOf(ps[1]); }
      else if (path.geomCode === 79) {
        const src = byId.get(ps[0]);
        if (src?.classId === 28) { center = coordsOf(src.parents?.[0] ?? -1); rim = coordsOf(src.parents?.[1] ?? -1); }
      }
    }
    if (!center || !rim) return null;
    // the page's y runs down and the board's up, so the turn is carried round the
    // centre in page space and only then flipped
    const theta = gliderTurn(o);
    const ux = rim.x - center.x;
    const uy = rim.y - center.y;
    const [cos, sin] = [Math.cos(theta), Math.sin(theta)];
    return [X(center.x + ux * cos - uy * sin), Y(center.y + ux * sin + uy * cos)];
  }

  /**
   * The same point as a live image, for a path whose defining points the file
   * places nowhere: a ratio along a segment is a dilate of one end about the
   * other, and a turn round a circle is a rotate of its radius point. Both keep
   * following the figure, which a fixed pair of numbers would not.
   */
  function gliderImage(o: GspObject, pathEl: E): { src: string; spec: ImageSpec } | null {
    const ps = pathEl.parents;
    if (!ps.length || !ps.every(isPointEl)) return null;
    const [a, b] = [String(ps[0]), String(ps[1])];
    if (pathEl.type === 'segment' && ps.length === 2) {
      return { src: b, spec: { op: 'dilate', of: [a], k: o.value ?? 0 } };
    }
    if (pathEl.type === 'circle' && ps.length === 2) {
      return { src: b, spec: { op: 'rotate', of: [a], angle: (-gliderTurn(o) * 180) / Math.PI } };
    }
    return null;
  }

  /**
   * The place along the path, for the paths whose direction only the board can
   * work out: a line's second point is very often built from something else, so
   * the file does not hold the direction a distance would be measured along. The
   * reading itself is still ours — a distance in the sketch's unit, or the turn
   * it keeps — so the document can say it and the registry walks the live path.
   */
  function gliderGlide(o: GspObject, path: GspObject): { ratio: number } | { distance: number } | { turn: number } | null {
    if (onCircleLike(path)) return { turn: gliderTurn(o) };
    const value = o.value ?? 0;
    if (path.classId === 14) return { ratio: value };
    if (path.classId === 12 || path.classId === 13 || path.classId === 46 || path.classId === 47) {
      return { distance: value * unitPx() };
    }
    return null;
  }

  /**
   * The construction codes that put a copy of something elsewhere: translate,
   * rotate, dilate, reflect. GSP writes no position for them — only the map and
   * what it is taken with — so the honest import is the same live thing the
   * sketch is: a point with an `attrs.image` descriptor, which the board places
   * every frame and which carries on moving when its teacher drags the original.
   */
  const TRANSFORM_CODES = new Set([16, 17, 21, 24, 26, 27, 29, 30, 33, 34]);

  const emittedAs = (n: number, kinds: string[]): string | null => {
    const src = byId.get(n);
    return src && kinds.includes(src.kind) && emitted.has(gid(n)) ? gid(n) : null;
  };

  /**
   * One construction number of record 2003, read where this code keeps it. The
   * record opens with the code as a u16, so a rotate's sine sits at 4 and its
   * cosine at 12 while a fixed translate's length sits at 32; a number that is
   * not there, or is not finite, is no number at all.
   */
  const v2003 = (o: GspObject, at: number): number | null => {
    const raw = o.valueRaw;
    if (!raw || raw.length < at + 8) return null;
    const n = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getFloat64(at, true);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * The turn a fixed-angle record stores, as degrees on a y-up board: the
   * doubles at 4 and 12 are the sin and cos of exactly the angle the official
   * export writes in radians (verified on every Rotate and fixed-direction
   * translate of the 23 examples), which settles the sketch's angle unit and
   * its sign for us — the display degrees the record also keeps are flipped.
   */
  const storedAngle = (o: GspObject): number | null => {
    const s = v2003(o, 4);
    const c = v2003(o, 12);
    if (s === null || c === null) return null;
    return (Math.atan2(s, c) * 180) / Math.PI;
  };

  /**
   * The length a fixed translate moves its copy, in page pixels.
   *
   * Record 2003 keeps the same length twice: at 32 as the sketch drew it and at
   * 40 as the teacher typed it. For most sketches the first is already a page
   * pixel, but a sketch written by a 96-pixel-per-inch build stores it at that
   * scale, a third too big for the page it belongs to — the official export of
   * the very same object then names the shorter figure. Comparing the pair
   * against the display scales settles which one this is: a length that is a
   * physical unit at 96 dpi is turned back into page pixels, and anything that
   * already matches a 72 dpi scale is taken as it stands.
   */
  const typedLength = (o: GspObject): number | null => {
    const px = v2003(o, 32);
    const typed = v2003(o, 40);
    if (px === null) return null;
    if (typed === null || typed === 0) return px;
    const scale = px / typed;
    const PT = [1, 72 / 25.4, 720 / 25.4, 72]; // point, mm, cm, inch at 72 px/inch
    for (const unit of PT) {
      if (Math.abs(scale - unit * 4 / 3) < unit * 0.001) return typed * unit;
    }
    return px;
  };

  /** The map record 2003 and the parents describe, or null when its inputs are missing. */
  function imageSpecOf(o: GspObject): ImageSpec | null {
    const ps = o.parents ?? [];
    const centre = emittedAs(ps[1], ['point']);
    switch (o.geomCode) {
      case 16: { // [source, vector from, vector to]
        const from = emittedAs(ps[1], ['point']);
        const to = emittedAs(ps[2], ['point']);
        return from && to ? { op: 'translate', of: [from, to] } : null;
      }
      case 17: { // [source], shifted by a fixed x and y, already y-up in the file
        const dx = v2003(o, 4);
        const dy = v2003(o, 24);
        return dx === null || dy === null ? null : { op: 'translate', of: [], dx, dy };
      }
      case 21: { // [source], moved a fixed length along a fixed direction
        const deg = storedAngle(o);
        const dist = typedLength(o);
        if (deg === null || dist === null) return null;
        const r = (deg * Math.PI) / 180;
        return { op: 'translate', of: [], dx: dist * Math.cos(r), dy: dist * Math.sin(r) };
      }
      case 24: { // [source, length], laid along a fixed direction
        const deg = storedAngle(o);
        const length = emittedAs(ps[1], ['number', 'measurement', 'segment']);
        if (deg === null || !length) return null;
        return { op: 'translate', of: [], angle: deg, distMark: { element: length } };
      }
      case 26: { // [source, angle, length], both read off the page
        const angle = emittedAs(ps[1], ['number', 'measurement', 'segment']);
        const length = emittedAs(ps[2], ['number', 'measurement', 'segment']);
        if (!angle || !length) return null;
        return { op: 'translate', of: [], angleMark: { element: angle }, distMark: { element: length } };
      }
      case 27: { // [source, centre] turned by a fixed angle
        const deg = storedAngle(o);
        return centre && deg !== null ? { op: 'rotate', of: [centre], angle: deg } : null;
      }
      case 29: { // [source, centre, angle]
        const angle = emittedAs(ps[2], ['number', 'measurement', 'segment']);
        return centre && angle ? { op: 'rotate', of: [centre], angleMark: { element: angle } } : null;
      }
      case 30: { // [source, centre] scaled by a fixed factor
        const k = v2003(o, 4);
        return centre && k !== null ? { op: 'dilate', of: [centre], k } : null;
      }
      case 33: { // [source, centre, factor]
        const factor = emittedAs(ps[2], ['number', 'measurement', 'segment']);
        return centre && factor ? { op: 'dilate', of: [centre], ratioMark: { element: factor } } : null;
      }
      case 34: { // [source, mirror]
        const mirror = emittedAs(ps[1], ['line', 'segment', 'ray']);
        return mirror ? { op: 'reflect', of: [mirror] } : null;
      }
      default:
        return null;
    }
  }

  /** The copy of a point a transform code asks for. */
  function transformImage(o: GspObject): { src: string; spec: ImageSpec } | null {
    const src = emittedAs((o.parents ?? [])[0], ['point']);
    const spec = src ? imageSpecOf(o) : null;
    return src && spec ? { src, spec } : null;
  }

  /**
   * The same map applied to a whole object: Translate, Rotate, Dilate and
   * Reflect copy a segment, a circle, an arc or a polygon by carrying every one
   * of its defining points through the map. The sketch stores exactly that —
   * the source object plus the same vector, centre, factor or mirror a point
   * copy would name — so the copy is rebuilt over live image points, and the
   * figure keeps following its original just as it does on the desk.
   */
  const COPYABLE = new Set(['segment', 'line', 'ray', 'circle', 'arc', 'circumcirclearc', 'polygon']);
  const POSITIONED = new Set(['point', 'glider', 'midpoint', 'intersection']);
  /** Paths whose built object the board can walk to place a glider on. */
  const POSITIONED_PATHS = new Set([
    'segment', 'line', 'ray', 'parallel', 'perpendicular', 'bisector',
    'circle', 'arc', 'circumcirclearc',
  ]);
  /** Sketchpad's own kinds that a copy of a figure is ever drawn as. */
  const COPIED_KINDS = new Set(['segment', 'ray', 'line', 'circle', 'arc', 'polygon']);

  /** True when the emitted element this id names is a point the engine can read. */
  const isPointEl = (id: unknown): boolean =>
    typeof id === 'string' && POSITIONED.has(byEl.get(id)?.type ?? '');

  /** True when the emitted path element is one the board can walk. */
  const isPositionedPath = (pathEl: E): boolean => POSITIONED_PATHS.has(pathEl.type);

  function transformCopy(o: GspObject, attrs: Record<string, unknown>): boolean {
    const src = byEl.get(gid((o.parents ?? [])[0]));
    if (!src || !COPYABLE.has(src.type)) return false;
    const spec = imageSpecOf(o);
    if (!spec) return false;
    // A circle about a marked length carries the same radius wherever it is
    // copied to, so only the points it is defined by ride the map; the length it
    // draws with is the source's own and stays as it is.
    let copied = 0;
    const ids: (string | number)[] = src.parents.map((p, i) => {
      if (!isPointEl(p)) return p as string | number;
      copied++;
      const aid = `${gid(o.id)}v${i}`;
      const aux = el('point', aid, [String(p)], {
        ...attrs, visible: false, withLabel: false, showLabel: false, image: spec,
      });
      elements.push(aux);
      byEl.set(aid, aux);
      return aid;
    });
    if (copied === 0) return false;
    emit(o, el(src.type, gid(o.id), ids, { ...attrs }));
    return true;
  }

  /** The binary operators of a compiled formula, by token value. */
  const CALC_OPERATORS = ['+', '-', '*', '/', '^'];
  /** The functions of a compiled formula, by token value. */
  const CALC_FUNCTIONS = [
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'abs', 'sqrt', 'ln', 'log', 'sgn', 'round', 'trunc',
  ];
  /** Unit tags: class 0x01 is the angle unit, 0x02 the length unit. */
  const CALC_UNITS: [Record<number, string>, Record<number, string>] = [
    { 0: 'rad', 1: 'deg' },
    { 1: 'cm' },
  ];

  /**
   * The formula a Calculation carries, as infix text over `#0`, `#1` … — the
   * same shape `evalExpression` reads, and the same one the desktop's own
   * export prints beside the object.
   *
   * The tokens are the typed formula, two bytes each: the first is the value,
   * the second says what it is — 0x00 a character (a digit, the decimal point,
   * a bracket, π), 0x10 an operator, 0x20 a function, 0x60 the operand @N,
   * 0x01/0x02 a unit. A number is spelled out digit by digit, so the digits and
   * the point are gathered back into one literal.
   */
  function calcExpression(tokens: [number, number][]): string | null {
    let out = '';
    let number = '';
    const flush = () => { out += number; number = ''; };
    for (const [value, cls] of tokens) {
      if (cls === 0x00) {
        if (value <= 9) number += String(value);
        else if (value === 10) number += '.';
        else if (value === 11) { flush(); out += '('; }
        else if (value === 12) { flush(); out += ')'; }
        else if (value === 13) { flush(); out += 'pi'; }
        else return null;
        continue;
      }
      flush();
      if (cls === 0x60) out += `#${value}`;
      else if (cls === 0x10) { const op = CALC_OPERATORS[value]; if (!op) return null; out += op; }
      else if (cls === 0x20) { const fn = CALC_FUNCTIONS[value]; if (!fn) return null; out += `${fn}(`; }
      else if (cls === 0x01 || cls === 0x02) {
        const unit = CALC_UNITS[cls - 1][value];
        if (!unit) return null;
        out += ` ${unit}`;
      } else return null; // 0x70 calls a function held by an operand — no syntax here
    }
    flush();
    return out || null;
  }

  /**
   * The descriptor a Calculation becomes: the formula over its own parents, in
   * the order the file lists them, so `#0` is the first one. A parent the
   * document does not hold leaves the formula unreadable, so the whole object
   * is dropped rather than shown as a caption of "…".
   */
  function calculationSpec(o: GspObject): MeasureSpec | null {
    if (!o.calc) return null;
    const args: string[] = [];
    for (const p of o.parents ?? []) {
      if (!emitted.has(gid(p))) return null;
      args.push(gid(p));
    }
    const expr = calcExpression(o.calc.tokens);
    if (!expr) return null;
    return {
      op: 'calculate',
      args,
      expr,
      precision: o.calc.precision,
      ...(o.label ? { label: o.label } : {}),
    };
  }

  /**
   * What a Measure/* object computes, said in the descriptors this app already
   * knows how to recompute on its own board.
   *
   * The construction code names the measurement — 36 the length of a segment,
   * 37 the distance between two points, 38 from a point to a segment, 41 the
   * angle through three points, 43 the angle an arc covers, 46 the radius of a
   * circle, 47 the ratio of two segments or of three collinear points — and the
   * parents are kept in the order they were picked, which is the order their
   * distances are read in. Every code of the 23 examples was checked against the
   * kinds its own parents have; a code whose parents do not match what it is
   * supposed to measure is left unconverted rather than guessed at.
   *
   * The number itself the file never writes: it is what the geometry works out
   * to, exactly as it is here. Only the rounding is stored (record 2307).
   */
  function measureSpecOf(o: GspObject): MeasureSpec | null {
    const ps = o.parents ?? [];
    const at = (i: number, kinds: string[]) => emittedAs(ps[i], kinds);
    const straight = ['segment', 'line', 'ray'];
    switch (o.geomCode) {
      case 36: {
        const s = ps.length === 1 ? at(0, straight) : null;
        return s ? { op: 'length', args: [s] } : null;
      }
      case 37: {
        const a = ps.length === 2 ? at(0, ['point']) : null;
        const b = ps.length === 2 ? at(1, ['point']) : null;
        return a && b ? { op: 'distance', args: [a, b] } : null;
      }
      case 38: {
        const p = ps.length === 2 ? at(0, ['point']) : null;
        const s = ps.length === 2 ? at(1, straight) : null;
        return p && s ? { op: 'pointSegmentDistance', args: [p, s] } : null;
      }
      case 41: {
        const [a, b, c] = ps.length === 3 ? [at(0, ['point']), at(1, ['point']), at(2, ['point'])] : [];
        // the middle point is the vertex, which is how the app reads an angle too
        return a && b && c ? { op: 'angle', args: [a, b, c], unit: '°' } : null;
      }
      case 43: {
        const a = ps.length === 1 ? at(0, ['arc']) : null;
        return a ? { op: 'arcAngle', args: [a], unit: '°' } : null;
      }
      case 46: {
        const c = ps.length === 1 ? at(0, ['circle']) : null;
        return c ? { op: 'radius', args: [c] } : null;
      }
      case 47: {
        if (ps.length === 2) {
          const a = at(0, straight);
          const b = at(1, straight);
          return a && b ? { op: 'ratio', args: [a, b] } : null;
        }
        if (ps.length === 3) {
          const [a, b, c] = [at(0, ['point']), at(1, ['point']), at(2, ['point'])];
          return a && b && c ? { op: 'threePointRatio', args: [a, b, c] } : null;
        }
        return null;
      }
      default:
        return null;
    }
  }

  for (const o of sketch.objects) {
    const id = gid(o.id);
    const drawn = styleAttrs(o, o.kind === 'point');
    // A parameter and a button carry a name of their own, which Sketchpad shows
    // nowhere near the object; only drawn things take their label from it.
    const attrs = NAMEABLE.has(o.kind) ? named(o, drawn) : drawn;

    if (o.kind === 'point') {
      if (TRANSFORM_CODES.has(o.geomCode)) {
        // no position in the file, by design: the map is the definition
        const made = transformImage(o);
        if (made) {
          emit(o, el('point', id, [made.src], { ...attrs, image: made.spec }));
          continue;
        }
        if (!o.coords) {
          bump(skipNote, 'diem bien hinh (thieu doi tuong duoc bien theo)');
          continue;
        }
      }
      if (o.classId === 11 && o.parents?.length === 1) {
        // GSP's midpoint names the segment (or, in older builds, its two points).
        // Read the segment back from what was actually drawn: a copy of one is
        // built over image points of its own, and those — not the source object's
        // parents, which name its centre of rotation — are the two it halves.
        const src = byId.get(o.parents[0]);
        const srcEl = src ? byEl.get(gid(src.id)) : undefined;
        if (srcEl && srcEl.parents.length === 2 && srcEl.parents.every(isPointEl)) {
          emit(o, el('midpoint', id, srcEl.parents, attrs));
          continue;
        }
        const ps = src ? resolvedParents(src) : null;
        if (ps && ps.length >= 2 && ps[0] !== undefined && ps[1] !== undefined
            && isPointEl(ps[0]) && isPointEl(ps[1])) {
          emit(o, el('midpoint', id, [ps[0], ps[1]], attrs));
          continue;
        }
        bump(skipNote, 'diem trung hoa (cha khong hoat dong)');
        continue;
      }
      if (o.classId === 45 && o.parents && o.parents.length >= 2) {
        // geomCode names the parent pair's shape (9 line∩line, 11/12 and
        // 13/14 the two slots of circle∩circle and line∩circle)
        const slot = o.geomCode === 12 || o.geomCode === 14 ? 1 : 0;
        const ps = resolvedParents(o);
        if (ps) emit(o, el('intersection', id, [ps[0], ps[1], slot], attrs));
        else bump(skipNote, 'giao diem (cha khong hoat dong)');
        continue;
      }
      if (o.classId === 10 && o.parents?.length === 1 && o.value !== undefined) {
        // the single parent names the path itself: the segment, circle or arc
        const pathObj = byId.get(o.parents[0]);
        const pathId = pathObj ? gid(pathObj.id) : '';
        const pathEl = pathObj ? byEl.get(pathId) : undefined;
        if (pathObj && pathEl) {
          // the designer's glider names a place, and the engine snaps it onto the path
          const at = gliderPlace(o, pathObj);
          if (at) {
            emit(o, el('glider', id, [at[0], at[1], pathId], attrs));
            continue;
          }
          const live = gliderImage(o, pathEl);
          if (live) {
            emit(o, el('point', id, [live.src], { ...attrs, image: live.spec }));
            continue;
          }
          // the path's own direction is not in the file, so hand the reading to
          // the board: it walks the line or the circle it has just built
          const glide = gliderGlide(o, pathObj);
          if (glide && isPositionedPath(pathEl)) {
            emit(o, el('glider', id, [0, 0, pathId], { ...attrs, glide }));
            continue;
          }
          bump(skipNote, 'diem tren duong (khong xac dinh duoc vi tri)');
          continue;
        }
        bump(skipNote, 'diem tren duong (cha khong hoat dong)');
        continue;
      }
      if (o.coords) {
        // free points, and transformed/constructed points whose construction
        // this app cannot express yet: they land where they were drawn
        if (o.classId !== 4 || o.geomCode !== 0) {
          if (o.classId === 4) bump(softNote, 'diem bien hinh thanh diem tu do');
          else if (o.classId === 56) bump(softNote, 'diem ve thanh diem tu do');
          else if (o.classId === 40 || o.classId === 41) { bump(skipNote, 'diem don vi cua he truc'); continue; }
        }
        emit(o, el('point', id, [X(o.coords.x), Y(o.coords.y)], attrs));
        continue;
      }
      bump(skipNote, 'diem khong doc duoc');
      continue;
    }

    if (COPIED_KINDS.has(o.kind) && TRANSFORM_CODES.has(o.geomCode)) {
      // A copy of a whole figure. Its parents name the source rather than two
      // points, so handing them to the engine as they came would ask it to draw
      // a segment out of a segment; the copy has to be rebuilt over its own.
      if (transformCopy(o, attrs)) continue;
      bump(skipNote, 'ban sao bien hinh (khong dung lai duoc)');
      continue;
    }

    if (o.kind === 'segment' || o.kind === 'ray') {
      const ps = resolvedParents(o);
      if (ps?.length === 2) emit(o, el(o.kind, id, ps, attrs));
      else bump(skipNote, 'doan thang (cha khong hoat dong)');
      continue;
    }

    if (o.kind === 'line') {
      const ps = resolvedParents(o);
      if (!ps) { bump(skipNote, 'duong thang (cha khong hoat dong)'); continue; }
      if (o.classId === 46 && ps.length === 2) { emit(o, el('parallel', id, ps, attrs)); continue; }
      if (o.classId === 47 && ps.length === 2) { emit(o, el('perpendicular', id, ps, attrs)); continue; }
      if (o.classId === 44 && ps.length === 3) { emit(o, el('bisector', id, ps, attrs)); continue; }
      if (ps.length === 2) { emit(o, el('line', id, ps, attrs)); continue; }
      bump(skipNote, 'duong thang (cha khong hoat dong)');
      continue;
    }

    if (o.kind === 'circle') {
      const ps = resolvedParents(o);
      if (ps?.length === 2) emit(o, el('circle', id, ps, attrs));
      else bump(skipNote, 'duong tron (cha khong hoat dong)');
      continue;
    }

    if (o.kind === 'arc') {
      const ps = resolvedParents(o);
      if (!ps || ps.length < 3) { bump(skipNote, 'cung tron (cha khong hoat dong)'); continue; }
      if (o.geomCode === 81) { emit(o, el('circumcirclearc', id, ps.slice(0, 3), attrs)); continue; }
      if (o.geomCode === 79) {
        // arc on a circle: JSX wants a centre point, so borrow the circle's
        const src = byId.get(o.parents![0]);
        const centerId = src?.parents?.[0] !== undefined ? gid(src.parents[0]) : null;
        if (centerId && emitted.has(centerId)) {
          emit(o, el('arc', id, [centerId, ps[1], ps[2]], attrs));
          continue;
        }
      }
      emit(o, el('arc', id, ps.slice(0, 3), attrs));
      continue;
    }

    if (o.kind === 'polygon') {
      const ps = resolvedParents(o);
      if (ps && ps.length >= 3) emit(o, el('polygon', id, ps, attrs));
      else bump(skipNote, 'da giac (cha khong hoat dong)');
      continue;
    }

    if (o.kind === 'interior') {
      const src = o.parents?.length === 1 ? byId.get(o.parents[0]) : undefined;
      // The inside of a shape is painted onto the shape itself: the app draws a
      // polygon or a circle with a fill, and an extra element would only sit on
      // top of it.
      if (src && (src.kind === 'polygon' || src.kind === 'circle') && o.parents) {
        const host = elements.find((e) => e.id === gid(o.parents![0]));
        if (host) {
          host.attrs = { ...host.attrs, fillColor: hex(o.style.color), fillOpacity: 0.3 };
          continue;
        }
      }
      bump(skipNote, 'phan ben trong (cha khong hoat dong)');
      continue;
    }

    if (o.kind === 'text' && o.text !== undefined && o.textPos) {
      // An HTML caption draws with its own CSS, where strokeColor no longer
      // reaches: the sketch's colour is written into the style beside the face.
      const style: Record<string, unknown> = { ...attrs, fontSize: 14 };
      if (face) {
        style.display = 'html';
        style.cssStyle = withFontFamily(`color:${hex(o.style.color)}`, face);
      }
      emit(o, el('text', id, [X(o.textPos.x), Y(o.textPos.y), stripMfs(o.text)], style));
      continue;
    }

    if (o.kind === 'number' && o.numberRange) {
      const r = o.numberRange;
      emit(o, el('slider', id, [[X(r.x), Y(r.y)], [X(r.x + 120), Y(r.y)], [r.min, r.defaultValue, r.max]], attrs));
      bump(softNote, 'gia tri hien tai cua tham so co the la gia tri mac dinh');
      continue;
    }

    if (o.kind === 'button' && o.button) {
      const b = o.button;
      const ps = resolvedParents(o);
      if (!ps || ps.length === 0) { bump(skipNote, 'nut (khong co doi tuong dich)'); continue; }
      const nameOf = (ids: (string | number)[]) => ids.map((t) => {
        const src = sketch.objects.find((s) => gid(s.id) === t);
        return src?.label ?? String(t);
      }).join(', ');
      // a button shows its own record-2005 label; its text field stays empty
      const caption = (o.label ?? '').trim() || stripMfs(o.text ?? '');
      const emitButton = (
        action: ActionButtonAction,
        targets: (string | number)[],
        extra: Record<string, unknown> = {},
      ) => emit(o, el('actionbutton', id, [X(b.x), Y(b.y), caption || `Nút ${action}`], {
        ...attrs,
        button: { action, name: nameOf(targets), targets, ...extra },
      }));

      if (b.actionKind === 0 || b.actionKind === 1) {
        // bit 2 tells Sketchpad's Hide/Show flip apart from the one-shot Show and
        // Hide a Presentation sequence is built out of; the action kind only says
        // which way the flip was left standing when the button was made.
        emitButton((b.subtype & 4) ? 'toggle' : (b.actionKind === 1 ? 'show' : 'hide'), ps);
        continue;
      }
      if (b.actionKind === 2) {
        // only a point on a path and a parameter have somewhere to travel; a
        // button over a free point would be a caption promising a motion that
        // never starts
        const movable = ps.filter((t) => {
          const e = elements.find((x) => x.id === t);
          return e !== undefined && (e.type === 'glider' || e.type === 'slider');
        });
        if (!movable.length) { bump(skipNote, 'nut Animate (khong co diem troi hay tham so)'); continue; }
        const anim = o.animation;
        emitButton('animate', movable, {
          animation: {
            direction: anim && (anim.flags & 0x20000000) ? 'both' : 'forward',
            speed: ANIMATION_SPEED_FROM_GSP,
          },
        });
        continue;
      }
      if (b.actionKind === 3) {
        // the parents alternate mover and destination, so an odd last one is a
        // point with nowhere to go and is left out of the run
        const pairs = ps.slice(0, ps.length - (ps.length % 2));
        const movers = pairs.filter((_, i) => i % 2 === 0);
        const destinations = pairs.filter((_, i) => i % 2 === 1);
        if (!movers.length) { bump(skipNote, 'nut Move (khong co noi den)'); continue; }
        emitButton('move', movers, {
          move: { destinations, speed: MOVE_SPEED_BY_SUBTYPE[b.subtype] ?? 'normal' },
        });
        continue;
      }
      if (b.actionKind === 7) {
        // bit 0 separates the sequence, whose wait time the u32 holds in tenths of
        // a second, from the buttons all pressed on one press
        const sequential = (b.subtype & 1) === 1;
        emitButton('present', ps, {
          present: { sequential, pause: sequential ? Math.max(0, b.param / 10) : 0 },
        });
        continue;
      }
      bump(skipNote, `nut (loai ${b.actionKind} chua ho tro)`);
      continue;
    }

    if (o.kind === 'measurement') {
      // A Calculation is a formula over other objects: the caption is recomputed
      // from the same descriptors those objects carry, so the sketch stays live.
      const calc = calculationSpec(o);
      if (calc && o.textPos) {
        const px = X(o.textPos.x);
        const py = Y(o.textPos.y);
        const style: Record<string, unknown> = {
          ...attrs, fontSize: 13, measure: calc, anchor: { of: calc.args, at: [px, py] },
        };
        if (face) {
          style.display = 'html';
          style.cssStyle = withFontFamily(`color:${hex(o.style.color)}`, face);
        }
        emit(o, el('text', id, [px, py, ''], style));
        bump(softNote, 'cong thuc tinh theo don vi cua trang vi GSP khong luu don vi trong file');
        continue;
      }
      if (o.calc) { bump(skipNote, 'phep tinh (cha khong hoat dong)'); continue; }
      // A measure with no display block is a Function or a Derivative, whose
      // definition is compiled and has no number of ours to show.
      if (o.text === undefined || !o.textPos) {
        bump(skipNote, 'phep tinh (cong thuc luu dang da bien dich)');
        continue;
      }
      const measure = measureSpecOf(o);
      if (!measure) { bump(skipNote, `ket qua do (loai ${o.classId}/${o.geomCode})`); continue; }
      const px = X(o.textPos.x);
      const py = Y(o.textPos.y);
      // The caption stays where the sketch dropped it, wearing the sketch's own
      // face and colour, and rounds to the precision the file keeps.
      const spec: MeasureSpec = { ...measure, precision: o.measurePrecision ?? 2 };
      const style: Record<string, unknown> = { ...attrs, fontSize: 13, measure: spec, anchor: { of: spec.args, at: [px, py] } };
      if (face) {
        style.display = 'html';
        style.cssStyle = withFontFamily(`color:${hex(o.style.color)}`, face);
      }
      emit(o, el('text', id, [px, py, ''], style));
      bump(softNote, 'ket qua do hien thi theo don vi cua trang vi GSP khong luu don vi trong file');
      continue;
    }
    if (o.kind === 'other') { bump(skipNote, 'doi tuong khac (truc, quy tich, ham, Iterate, anh)'); continue; }
    bump(skipNote, `loai doi tuong chua biet (${o.kind})`);
  }

  const parts: string[] = [];
  for (const [what, n] of skipNote) parts.push(`${what}: ${n}`);
  for (const [what, n] of softNote) parts.push(`${what} (${n})`);
  if (parts.length) warnings.push(`Chuyen tro thanh ${elements.length} doi tuong; chua chuyen duoc hoac bi gia mun: ${parts.join('; ')}.`);

  const data: HeyGeoData = {
    version: '1.0',
    title,
    boundingbox: [-w / 2, h / 2, w / 2, -h / 2],
    axis: false,
    grid: false,
    elements,
  };
  return { data, warnings };
}

/** GSP rates are px/s on a path length; the designer's spec is laps/s and the
 *  Sketchpad default run (rate 3, 24 px/s) matches its own 0.25 laps/s. */
const ANIMATION_SPEED_FROM_GSP = 0.25;
