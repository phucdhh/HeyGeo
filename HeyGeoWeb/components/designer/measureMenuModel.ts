/**
 * What the Measure menu can offer for the current selection.
 *
 * Sketchpad greys out the measurements a selection does not define, and HeyGeo
 * desktop does the same in `cans.cpp` with its `canMeasure…()` predicates. This
 * module is that rule for the web, and it writes the captions too: the text
 * before " = " follows `G_measureObject::updatelhs()`, so measuring a segment
 * here reads "AB" the way it does on the desktop, not "length of segment4".
 *
 * It is given the document's elements rather than board objects, so it stays
 * pure and so a shape can be named by the points it was built from.
 */
import { parentIds } from './sceneModel';
import { coordsysOf } from './coordsysModel';
import type { HeyGeoElement } from './designTypes';
import { RELATIVE_OPS, type MeasureOp, type MeasureSpec } from './measurement';

/**
 * One row of the Measure menu. `specs` is what choosing it writes — one caption
 * per measured object, because the desktop loops over the selection — and an
 * empty list means the selection does not define this measurement, so the row
 * is greyed.
 */
export interface MeasureItem {
  id: string;
  label: string;
  specs: MeasureSpec[];
}

const POINT_TYPES = ['point', 'glider', 'midpoint', 'circumcenter', 'intersection'];
const LINE_TYPES = ['line', 'ray', 'perpendicular', 'parallel', 'bisector'];
const ARC_TYPES = ['arc', 'circumcirclearc'];

const CM = ' cm';
const CM2 = ' cm\u00b2';
const DEG = '\u00b0';

interface Ctx {
  /** The name a caption uses for one element id. */
  name: (id: string) => string;
  /** The name a caption uses for a shape: its own, or the points it stands on. */
  shapeName: (id: string) => string;
}

function isPoint(e?: HeyGeoElement) { return !!e && POINT_TYPES.includes(e.type); }
function isSegment(e?: HeyGeoElement) { return e?.type === 'segment'; }
function isLine(e?: HeyGeoElement) { return !!e && LINE_TYPES.includes(e.type); }
function isArc(e?: HeyGeoElement) { return !!e && ARC_TYPES.includes(e.type); }
function isType(type: string) { return (e?: HeyGeoElement) => e?.type === type; }

/** A measurement the desktop only takes from a single object. */
function one(picked: (HeyGeoElement | undefined)[], of: (e?: HeyGeoElement) => boolean) {
  return picked.length === 1 && of(picked[0]);
}

/** The caption's left-hand text, one template per op, as the desktop writes it. */
function lhs(op: MeasureOp, args: string[], ctx: Ctx): string {
  // a caption taken in the sketch's frame is named for what it measures, and the
  // frame's own two points are not part of the name
  const plain = RELATIVE_OPS[op];
  if (plain) return lhs(plain, args.slice(2), ctx);
  const [p0, p1, p2] = args.map(ctx.name);
  const s0 = ctx.shapeName(args[0]);
  switch (op) {
    // two names run together, with no word in front of them
    case 'distance':
    case 'pointSegmentDistance':
      return `${p0}${p1 ?? ''}`;
    // a segment the designer never renamed is still "AB"
    case 'length':
    case 'arcLength':
      return s0;
    case 'angle':
      return `m\u2220${p0}${p1}${p2}`;
    case 'arcAngle':
      return `m\u2220${s0}`;
    case 'ratio':
      return `${s0}/${ctx.shapeName(args[1])}`;
    case 'circumference':
      return `Circumference ${s0}`;
    case 'perimeter':
      return `Perimeter ${s0}`;
    case 'radius':
      return `Radius ${s0}`;
    case 'area':
    case 'segmentArea':
      return `Area ${s0}`;
    case 'slope':
      return `Slope ${s0}`;
    case 'equationLine':
    case 'equationCircle':
      return `Equation ${s0}`;
    case 'abscissa':
      return `x<sub>${p0}</sub>`;
    case 'ordinate':
      return `y<sub>${p0}</sub>`;
    case 'coordinates':
      return p0;
    default:
      return s0;
  }
}

/**
 * The Measure menu, in the order HeyGeo desktop lists it. `selection` is in the
 * order the objects were picked, which is what makes the middle point of an
 * angle the vertex and the first segment of a ratio the numerator.
 */
export function measureItems(
  elements: HeyGeoElement[],
  selection: string[],
): MeasureItem[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const name = (id: string) => {
    const el = byId.get(id);
    return ((el?.attrs?.name as string | undefined) ?? '') || el?.id || id;
  };
  const shapeName = (id: string) => {
    const el = byId.get(id);
    if (!el) return id;
    const own = (el.attrs?.name as string | undefined) ?? '';
    return own || parentIds(el).map(name).join('') || el.id;
  };
  const ctx: Ctx = { name, shapeName };

  const picked = selection.map((id) => byId.get(id));
  const [a, b, c] = picked;
  const id = (e?: HeyGeoElement) => e?.id ?? '';

  /**
   * Whether a value can still be worked out: geometry deleted from behind an
   * element leaves it with no position, however much it is itself still listed
   * in the document.
   */
  const measurable = (of: string) => {
    const seen = new Set<string>();
    const stack = [of];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      if (!byId.has(cur)) return false;
      seen.add(cur);
      stack.push(...parentIds(byId.get(cur)!));
    }
    return true;
  };

  /**
   * One menu row. `groups` are the ids each caption is read from, and a group
   * that has lost its geometry is dropped instead of left to print "…".
   */
  const row = (
    itemId: string,
    label: string,
    groups: [MeasureOp, string[]][],
    unit: string,
    offered: boolean,
  ): MeasureItem => ({
    id: itemId,
    label,
    specs: offered
      ? groups
          .filter(([, args]) => args.length > 0 && args.every(measurable))
          .map(([op, args]) => ({
            op,
            args,
            label: lhs(op, args, ctx),
            precision: 2,
            ...(unit ? { unit } : {}),
          }))
      : [],
  });

  const all = (ids: string[]) => ids.length > 0 && ids.length === picked.length;
  const points = picked.filter(isPoint).map(id);
  const segments = picked.filter(isSegment).map(id);
  const straight = picked.filter((e) => isLine(e) || isSegment(e)).map(id);

  /**
   * Where a point's coordinates are read from. Sketchpad measures in the frame
   * the designer defines; until one is marked, the only frame the board has is
   * its own, and a caption then shows the board numbers.
   */
  const sys = coordsysOf(elements);
  const frame = sys ? [sys.origin, sys.unit] : [];
  const pairOp = sys ? 'relativeCoordinates' : 'coordinates';
  const xOp = sys ? 'relativeAbscissa' : 'abscissa';
  const yOp = sys ? 'relativeOrdinate' : 'ordinate';

  // A point and the straight thing beside it: Sketchpad measures the shortest
  // distance to it, two points measure between themselves.
  const distance: [MeasureOp, string[]][] =
    picked.length === 2 && isPoint(a) && isPoint(b)
      ? [['distance', [id(a), id(b)]]]
      : picked.length === 2 && isPoint(a) && (isSegment(b) || isLine(b))
        ? [['pointSegmentDistance', [id(a), id(b)]]]
        : picked.length === 2 && isPoint(b) && (isSegment(a) || isLine(a))
          ? [['pointSegmentDistance', [id(b), id(a)]]]
          : [];

  return [
    row('length', 'Length', segments.map((s) => ['length', [s]]), CM, all(segments)),
    row('distance', 'Distance', distance, CM, distance.length > 0),
    row('perimeter', 'Perimeter', [['perimeter', [id(a)]]], CM, one(picked, isType('polygon'))),
    row('circumference', 'Circumference', [['circumference', [id(a)]]], CM,
      one(picked, isType('circle'))),
    row('angle', 'Angle', [['angle', [id(a), id(b), id(c)]]], DEG,
      picked.length === 3 && isPoint(a) && isPoint(b) && isPoint(c)),
    // an arc has no area of its own, so it gives the bow between it and its chord
    row('area', 'Area', [[isArc(a) ? 'segmentArea' : 'area', [id(a)]]], CM2,
      one(picked, (e) => ['polygon', 'circle', 'sector', 'circumcirclesector'].includes(e?.type ?? '') || isArc(e))),
    row('arcAngle', 'Arc Angle', [['arcAngle', [id(a)]]], DEG, one(picked, isArc)),
    row('arcLength', 'Arc Length', [['arcLength', [id(a)]]], CM, one(picked, isArc)),
    row('radius', 'Radius', [['radius', [id(a)]]], CM,
      one(picked, (e) => isType('circle')(e) || isArc(e))),
    row('ratio', 'Ratio', [['ratio', [id(a), id(b)]]], '',
      picked.length === 2 && isSegment(a) && isSegment(b)),
    row('value', 'Value', [['value', [id(a)]]], '', one(picked, isType('slider'))),
    row('coordinates', 'Coordinates', points.map((p) => [pairOp, [...frame, p]]), '', all(points)),
    row('abscissa', 'Abscissa (x)', points.map((p) => [xOp, [...frame, p]]), '', all(points)),
    row('ordinate', 'Ordinate (y)', points.map((p) => [yOp, [...frame, p]]), '', all(points)),
    row('slope', 'Slope', straight.map((s) => ['slope', [s]]), '', all(straight)),
    // desktop's canMeasureEquation: the equation of a line or of a circle
    row('equation', 'Equation',
      picked.map((e) => [isType('circle')(e) ? 'equationCircle' : 'equationLine', [id(e)]]),
      '',
      picked.length > 0 && picked.every((e) => isLine(e) || isType('circle')(e))),
  ];
}
