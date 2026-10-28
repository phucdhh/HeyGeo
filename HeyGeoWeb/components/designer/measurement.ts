/**
 * Declarative measurements.
 *
 * A HeyGeo measurement is a text element whose caption — and sometimes whose
 * position — is derived from other elements. Before this module the JSON stored
 * those as JavaScript source ("function(){return 'd = '+Math.sqrt(...)}") and
 * the loader compiled them with new Function + eval, so opening a model from the
 * database, from a share link or from the desktop app executed arbitrary code
 * out of a data file.
 *
 * The declarative replacement keeps the document as data:
 *   attrs.measure = { op, args, label, precision, unit }
 *   attrs.anchor  = { of, dx, dy, radiusFactor }
 * This file turns a descriptor into the closure JSXGraph wants, over the live
 * board objects. It is the only place that knows how each measurement is
 * computed, so the desktop exporter can be pointed at the same descriptors.
 */
import { evalExpression } from './expression';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export type MeasureOp =
  | 'distance'        // args: [point, point]
  | 'pointSegmentDistance' // args: [point, segment]
  | 'length'          // args: [segment | line | ray]
  | 'radius'          // args: [circle | arc]
  | 'circumference'   // args: [circle]
  | 'arcLength'       // args: [arc] — the curved part, not the chord
  | 'arcAngle'        // args: [arc] — the sweep it covers
  | 'segmentArea'     // args: [arc] — the bow between the arc and its chord
  | 'area'            // args: [polygon | circle | sector]
  | 'perimeter'       // args: [polygon]
  | 'angle'           // args: [point, vertex, point]
  | 'ratio'           // args: [segment, segment]
  | 'slope'           // args: [line | segment | ray]
  | 'coordinates'     // args: [point]
  | 'abscissa'        // args: [point]
  | 'ordinate'        // args: [point]
  | 'equationLine'    // args: [line | segment | ray]
  | 'equationCircle'  // args: [circle]
  | 'relativeCoordinates' // args: [origin, unit, point] — a document coordinate system
  | 'relativeAbscissa'    // args: [origin, unit, point]
  | 'relativeOrdinate'    // args: [origin, unit, point]
  | 'relativeDistance'    // args: [origin, unit, point, point]
  | 'calculate'       // args: the measurements and sliders `expr` reads
  | 'value';          // args: [slider]

export interface MeasureSpec {
  op: MeasureOp;
  /** Element ids the value is computed from. */
  args: string[];
  /**
   * The infix expression a `calculate` shows, with `#0`, `#1` … standing for
   * the args, and nothing else — see expression.ts, which evaluates it.
   */
  expr?: string;
  /** Text before " = ". Omitted means the caption is the value alone. */
  label?: string;
  /** Decimals shown; matches the two or three the previous sources used. */
  precision?: number;
  /** Appended to the number, e.g. " cm" or "°". */
  unit?: string;
  /**
   * Multiplied into the board value before formatting. Desktop-exported
   * measurements carry centimetres-per-unit baked into their source, so the
   * migration writes the factor here instead of changing the displayed number.
   */
  scale?: number;
}

/**
 * A relative measurement is its plain counterpart read in the sketch's own
 * frame, so it names and sits like it: args are [origin, unit, …], the first two
 * are the frame rather than what is being measured, and the subject comes after
 * them.
 */
export const RELATIVE_OPS: Partial<Record<MeasureOp, MeasureOp>> = {
  relativeCoordinates: 'coordinates',
  relativeAbscissa: 'abscissa',
  relativeOrdinate: 'ordinate',
  relativeDistance: 'distance',
};

/**
 * Where a caption sits. `of` names the elements it follows:
 * two ids → their midpoint, a circle/arc → its centre, a segment or line → its
 * midpoint, a polygon → its centroid, one point → that point. `radiusFactor`
 * pushes the caption out by a multiple of a circle's radius.
 * With no anchor the element keeps the literal coordinates in its parents.
 */
export interface AnchorSpec {
  of: string[];
  dx?: number;
  dy?: number;
  radiusFactor?: number;
}

export const DEFAULT_PRECISION = 2;

/** The element ids a measurement depends on, for the dependency graph. */
export function measureDeps(el: { attrs?: Record<string, unknown> }): string[] {
  const m = el.attrs?.measure as MeasureSpec | undefined;
  const a = el.attrs?.anchor as AnchorSpec | undefined;
  return [...(m?.args ?? []), ...(a?.of ?? [])];
}

export function isMeasureSpec(value: unknown): value is MeasureSpec {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return typeof m.op === 'string' && Array.isArray(m.args);
}

export function isAnchorSpec(value: unknown): value is AnchorSpec {
  if (!value || typeof value !== 'object') return false;
  return Array.isArray((value as Record<string, unknown>).of);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function live(board: Any, id: string): Any {
  return board?.objects?.[id];
}

// ─── What each board is measuring ────────────────────────────────────────────
// A calculation reads the numbers other measurements display, and those numbers
// come from *their* descriptors. The descriptors live in the document, so every
// board keeps the ones it was built from here, keyed by element id.
//
// A descriptor change rebuilds the element — attrs.measure is part of its
// construction key — so this map can never hold one the board is not using.
const boardDescriptors = new WeakMap<object, Map<string, MeasureSpec>>();

/** Remember a descriptor while its element lives on this board. */
export function registerMeasure(board: Any, id: string, spec: MeasureSpec): void {
  if (!board) return;
  let byId = boardDescriptors.get(board);
  if (!byId) { byId = new Map(); boardDescriptors.set(board, byId); }
  byId.set(id, spec);
}

/** The descriptor a board element measures, when it measures anything. */
export function descriptorOf(board: Any, id: string): MeasureSpec | null {
  return boardDescriptors.get(board)?.get(id) ?? null;
}

/**
 * The number `#i` stands for: what the referenced measurement displays,
 * centimetres-per-unit and all, because that is the number the desktop's own
 * formula evaluator pulled out of its parent. A slider is its value; anything
 * with no descriptor the web can recompute has no number to offer.
 *
 * `seen` carries the ids already being evaluated, so a document whose
 * calculations reference each other stops at a missing operand instead of
 * recursing until the tab dies.
 */
function operandValue(board: Any, id: string | undefined, seen: Set<string>): number | null {
  if (!id || seen.has(id)) return null;
  const spec = descriptorOf(board, id);
  if (spec) return measureValue(board, spec, new Set([...seen, id]));
  const obj = live(board, id);
  if (!obj) return null;
  const raw = obj.Value ? obj.Value() : obj.X?.();
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

/**
 * The number an element of the page shows right now, or null when it shows none.
 * This is what a `#i` answers to, whether the expression reading it is a
 * calculation's caption or the coordinates of a plotted point.
 */
export function numberValueOf(board: Any, id: string): number | null {
  return operandValue(board, id, new Set());
}

/** The measurements the desktop's isLengthMeasure accepts as a circle's radius. */
const LENGTH_OPS: MeasureOp[] = ['distance', 'pointSegmentDistance', 'length', 'radius'];

/** True when this element is a length a circle may be built about a centre from. */
export function isLengthSource(board: Any, id: string): boolean {
  const spec = descriptorOf(board, id);
  if (spec) return LENGTH_OPS.includes(spec.op);
  return live(board, id)?.elType === 'segment';
}

/**
 * The length that element stands for, in the numbers the sketch shows: a
 * measurement's value, or the distance between a segment's two end points.
 */
export function lengthValueOf(board: Any, id: string): number | null {
  const spec = descriptorOf(board, id);
  if (spec) return LENGTH_OPS.includes(spec.op) ? measureValue(board, spec, new Set([id])) : null;
  const obj = live(board, id);
  if (!obj || obj.elType !== 'segment' || !obj.point1 || !obj.point2) return null;
  return sep(obj.point1, obj.point2);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sep(a: Any, b: Any): number {
  const dx = a.X() - b.X();
  const dy = a.Y() - b.Y();
  return Math.sqrt(dx * dx + dy * dy);
}

/** Shortest distance from a point to a segment, used by point-to-segment measures. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function pointToSegment(p: Any, a: Any, b: Any): number {
  const vx = b.X() - a.X();
  const vy = b.Y() - a.Y();
  const lsq = vx * vx + vy * vy;
  const t = lsq < 1e-12 ? 0 : Math.max(0, Math.min(1, ((p.X() - a.X()) * vx + (p.Y() - a.Y()) * vy) / lsq));
  return Math.hypot(p.X() - (a.X() + t * vx), p.Y() - (a.Y() + t * vy));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * What an arc element covers: its radius and the sweep in radians. JSXGraph
 * draws an arc counterclockwise from its first point to its second, whatever
 * order the three defining points came in, so the sweep is that turn.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function arcGeometry(o: Any): { r: number; sweep: number } | null {
  const centre = o?.center;
  const start = o?.radiuspoint ?? o?.point2;
  const end = o?.anglepoint ?? o?.point3;
  if (!(centre?.X && start?.X && end?.X && o?.Radius)) return null;
  const r = num(o.Radius());
  if (r === null) return null;
  const a0 = Math.atan2(start.Y() - centre.Y(), start.X() - centre.X());
  const a1 = Math.atan2(end.Y() - centre.Y(), end.X() - centre.X());
  return { r, sweep: ((a1 - a0) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) };
}

/**
 * The value a measurement shows, or null when it is a text-shaped op
 * (coordinates and equations) or a parent is missing from the board.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function measureValue(board: Any, spec: MeasureSpec, seen: Set<string> = new Set()): number | null {
  const raw = geometricValue(board, spec, seen);
  if (raw === null || spec.scale === undefined) return raw;
  return raw * spec.scale;
}

/** The number a point has in the sketch's own frame, axis by axis. */
function relativeAxis(board: Any, spec: MeasureSpec): number | null {
  const rel = relativeCoords(board, spec);
  if (!rel) return null;
  return num(spec.op === 'relativeOrdinate' ? rel[1] : rel[0]);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function geometricValue(board: Any, spec: MeasureSpec, seen: Set<string>): number | null {
  const { op, args } = spec;
  const [a, b, c] = args.map((id) => live(board, id));

  switch (op) {
    case 'calculate':
      return spec.expr ? evalExpression(spec.expr, (i) => operandValue(board, args[i], seen)) : null;
    case 'distance':
      return a && b ? sep(a, b) : null;
    case 'pointSegmentDistance': {
      const e = b?.point1 && b?.point2 ? [b.point1, b.point2] : null;
      return a && e ? pointToSegment(a, e[0], e[1]) : null;
    }
    case 'length':
      return a?.point1 && a?.point2 ? sep(a.point1, a.point2) : null;
    case 'radius':
      return a?.Radius ? num(a.Radius()) : null;
    case 'circumference':
      return a?.Radius ? num(2 * Math.PI * a.Radius()) : null;
    case 'arcLength': {
      const arc = arcGeometry(a);
      return arc === null ? null : num(arc.r * arc.sweep);
    }
    case 'arcAngle': {
      const arc = arcGeometry(a);
      return arc === null ? null : num(arc.sweep * (180 / Math.PI));
    }
    case 'segmentArea': {
      // The desktop's G_arcSegment: the sector the arc sweeps minus the
      // triangle its chord closes.
      const arc = arcGeometry(a);
      return arc === null ? null : num(0.5 * arc.r * arc.r * (arc.sweep - Math.sin(arc.sweep)));
    }
    case 'area':
      return a?.Area ? num(Math.abs(a.Area())) : null;
    case 'perimeter':
      return a?.Perimeter ? num(a.Perimeter()) : null;
    case 'angle': {
      if (!a || !b || !c) return null;
      // JSXGraph is y-up; the desktop measures the angle clockwise on screen.
      const a0 = Math.atan2(-(a.Y() - b.Y()), a.X() - b.X());
      const a2 = Math.atan2(-(c.Y() - b.Y()), c.X() - b.X());
      return ((-(a2 - a0) + 4 * Math.PI) % (2 * Math.PI)) * (180 / Math.PI);
    }
    case 'ratio': {
      if (!(a?.point1 && a?.point2 && b?.point1 && b?.point2)) return null;
      const l0 = sep(a.point1, a.point2);
      const l1 = sep(b.point1, b.point2);
      return l1 < 1e-12 ? 0 : l0 / l1;
    }
    case 'slope': {
      const p1 = a?.point1;
      const p2 = a?.point2;
      if (!p1 || !p2) return null;
      const dx = p2.X() - p1.X();
      // A vertical line has no slope to print; ∞ is what the caption shows.
      return Math.abs(dx) < 1e-6 ? Infinity : (p2.Y() - p1.Y()) / dx;
    }
    case 'abscissa':
      return a?.X ? num(a.X()) : null;
    case 'ordinate':
      return a?.Y ? num(a.Y()) : null;
    case 'relativeAbscissa':
    case 'relativeOrdinate':
      return relativeAxis(board, spec);
    case 'value':
      return a?.Value ? num(a.Value()) : num(a?.X?.());
    default:
      return null;
  }
}

/**
 * Coordinates of a point in a document coordinate system: args are
 * [origin, unit, point] and, for a distance, a fourth point. The unit point is
 * one axis unit away from the origin, so the scale is its distance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function relativeCoords(board: Any, spec: MeasureSpec): [number, number, number, number] | null {
  const [origin, unit, p1, p2] = spec.args.map((id) => live(board, id));
  if (!(origin?.X && unit?.X && p1?.X)) return null;
  const sf = sep(origin, unit);
  if (sf < 1e-12) return null;
  const x1 = (p1.X() - origin.X()) / sf;
  const y1 = (p1.Y() - origin.Y()) / sf;
  if (!p2) return [x1, y1, x1, y1];
  return [x1, y1, (p2.X() - origin.X()) / sf, (p2.Y() - origin.Y()) / sf];
}

/**
 * The caption a measurement shows. Equations and coordinate pairs are text
 * shapes; everything else is `label = number unit`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function measureCaption(board: Any, spec: MeasureSpec): string {
  const p = spec.precision ?? DEFAULT_PRECISION;
  const head = spec.label ? `${spec.label} = ` : '';
  const [a] = spec.args.map((id) => live(board, id));

  if (spec.op === 'coordinates') {
    if (!a?.X) return '…';
    return `${spec.label ?? ''}: (${a.X().toFixed(p)}, ${a.Y().toFixed(p)})`;
  }
  if (spec.op.startsWith('relative')) {
    const rel = relativeCoords(board, spec);
    if (!rel) return '…';
    if (spec.op === 'relativeCoordinates') return `${head}(${rel[0].toFixed(p)}; ${rel[1].toFixed(p)})`;
    if (spec.op === 'relativeDistance') return `${head}${Math.hypot(rel[0] - rel[2], rel[1] - rel[3]).toFixed(p)}${spec.unit ?? ''}`;
    return `${head}${(spec.op === 'relativeOrdinate' ? rel[1] : rel[0]).toFixed(p)}${spec.unit ?? ''}`;
  }
  if (spec.op === 'equationLine') {
    const p1 = a?.point1;
    const p2 = a?.point2;
    if (!p1 || !p2) return '…';
    const A = p1.Y() - p2.Y();
    const B = p2.X() - p1.X();
    const C = p1.X() * p2.Y() - p2.X() * p1.Y();
    return `${A.toFixed(1)}x + ${B.toFixed(1)}y + ${C.toFixed(1)} = 0`;
  }
  if (spec.op === 'equationCircle') {
    const centre = a?.center ?? a?.point1;
    if (!centre?.X) return '…';
    const r = a.Radius ? a.Radius() : 1;
    return `(x - ${centre.X().toFixed(1)})² + (y - ${centre.Y().toFixed(1)})² = ${(r * r).toFixed(1)}`;
  }

  const v = measureValue(board, spec);
  if (v === null) return '…';
  if (v === Infinity) return `${head}∞`;
  return `${head}${v.toFixed(p)}${spec.unit ?? ''}`;
}

/** A JSXGraph text parent: a closure that keeps the caption live. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function measureClosure(board: Any, spec: MeasureSpec): () => string {
  return () => {
    try {
      return measureCaption(board, spec);
    } catch {
      return '…';
    }
  };
}

/**
 * The point a caption is measured from: a point is itself, a circle is its
 * centre, a segment or line is its midpoint, a polygon is its centroid.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function positionOf(o: Any): [number, number] | null {
  if (!o) return null;
  if (o.center?.X) return [o.center.X(), o.center.Y()];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const verts: any[] | undefined = o.vertices;
  if (verts?.length) {
    let x = 0;
    let y = 0;
    for (const v of verts) { x += v.X(); y += v.Y(); }
    return [x / verts.length, y / verts.length];
  }
  if (o.point1?.X && o.point2?.X) return [(o.point1.X() + o.point2.X()) / 2, (o.point1.Y() + o.point2.Y()) / 2];
  return o.X ? [o.X(), o.Y()] : null;
}

/**
 * JSXGraph parents 0 and 1 of a caption, as closures that keep following the
 * geometry they are attached to.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function anchorClosures(board: Any, anchor: AnchorSpec): [() => number, () => number] {
  const dx = anchor.dx ?? 0;
  const dy = anchor.dy ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base = (): [number, number] | null => {
    const pts = anchor.of.map((id) => positionOf(live(board, id))).filter(Boolean) as [number, number][];
    if (pts.length === 0) return null;
    return [
      pts.reduce((s, p) => s + p[0], 0) / pts.length,
      pts.reduce((s, p) => s + p[1], 0) / pts.length,
    ];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const circle = (): Any | null => {
    const o = live(board, anchor.of[0]);
    return anchor.radiusFactor && o?.Radius ? o : null;
  };
  const x = () => {
    try {
      const c = circle();
      if (c) return c.center.X() + c.Radius() * (anchor.radiusFactor ?? 0) + dx;
      const p = base();
      return p ? p[0] + dx : 0;
    } catch { return 0; }
  };
  const y = () => {
    try {
      const c = circle();
      if (c) return c.center.Y() + dy;
      const p = base();
      return p ? p[1] + dy : 0;
    } catch { return 0; }
  };
  return [x, y];
}

/** A line of 13 px caption text, in board units. */
const CAPTION_LINE = 0.5;

/**
 * Where each kind of measurement is dropped relative to its geometry: a length
 * under the middle of the thing it was taken from, an area in the shape itself,
 * a circle's radius out past its edge. Anything not listed goes on the shape.
 */
const CAPTION_PLACES: Partial<Record<MeasureOp, { dx?: number; dy?: number; radiusFactor?: number }>> = {
  distance: { dy: -CAPTION_LINE },
  pointSegmentDistance: { dy: -CAPTION_LINE },
  length: { dy: -CAPTION_LINE },
  arcLength: { dy: -CAPTION_LINE },
  perimeter: { dy: -CAPTION_LINE },
  ratio: { dy: -CAPTION_LINE },
  value: { dy: -CAPTION_LINE },
  radius: { radiusFactor: 1.1 },
  circumference: { radiusFactor: 1.1 },
  coordinates: { dx: 0.3, dy: -0.3 },
  abscissa: { dx: 0.3, dy: -0.3 },
  ordinate: { dx: 0.3, dy: -0.3 },
  slope: { dy: 0.4 },
  equationLine: { dy: 0.4 },
  equationCircle: { dx: 0.5, dy: -0.5 },
};

/**
 * The anchor for a caption the designer is about to write.
 *
 * Sketchpad drops the value beside the geometry it was taken from, and a second
 * measurement of the same thing lands below the first rather than printed over
 * it, so `existing` — the elements already in the document — is counted for
 * captions that follow the same ids.
 */
export function captionAnchor(
  spec: MeasureSpec,
  existing: { attrs?: Record<string, unknown> }[],
): AnchorSpec {
  const plain = RELATIVE_OPS[spec.op];
  // a ratio is read from both segments but belongs under the numerator, and a
  // caption taken in the sketch's frame belongs under the point it measures
  // rather than somewhere between its origin and its unit point
  const of = spec.op === 'ratio'
    ? [spec.args[0]]
    : plain
      ? spec.args.slice(2)
      : spec.args;
  const key = of.join(',');
  const taken = existing.filter(
    (el) => (el.attrs?.anchor as AnchorSpec | undefined)?.of.join(',') === key,
  ).length;
  const place = CAPTION_PLACES[plain ?? spec.op] ?? {};
  return { of, ...place, dy: (place.dy ?? 0) - taken * CAPTION_LINE };
}
