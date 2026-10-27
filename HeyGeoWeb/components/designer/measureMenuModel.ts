/**
 * What the Measure menu can offer for the current selection.
 *
 * Sketchpad greys out the measurements a selection does not define, and HeyGeo
 * desktop does the same in `cans.cpp` with its `canMeasure…()` predicates. This
 * module is that rule for the web, and it also writes the caption: the text
 * before " = " follows `G_measureObject::updatelhs()` so that measuring a
 * segment here reads the same as measuring it on the desktop — "AB", not
 * "length of segment4".
 *
 * It is given the document's elements rather than board objects, so it stays
 * pure and so a shape can be named by the points it was built from.
 */
import { parentIds } from './sceneModel';
import type { HeyGeoElement } from './designTypes';
import type { MeasureSpec } from './measurement';

/**
 * One row of the Measure menu. `spec` is what the caption measures, or null
 * when the selection does not define that measurement and the row is greyed.
 */
export interface MeasureItem {
  id: string;
  label: string;
  spec: MeasureSpec | null;
}

const POINT_TYPES = ['point', 'glider', 'midpoint', 'intersection'];
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
function isKind(kind: string) { return (e?: HeyGeoElement) => e?.type === kind; }

/** The caption's left-hand text, one template per op, as the desktop writes it. */
function lhs(op: MeasureSpec['op'], args: string[], ctx: Ctx): string {
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
  const ids = (...args: (HeyGeoElement | undefined)[]) => args.map((e) => e?.id ?? '');

  /**
   * Whether an element still has a place on the board to measure: geometry
   * deleted from behind it leaves it with no position, even while it is itself
   * still listed in the document.
   */
  const measurable = (id: string) => {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length > 0) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      if (!byId.has(cur)) return false;
      seen.add(cur);
      stack.push(...parentIds(byId.get(cur)!));
    }
    return true;
  };

  const row = (
    id: string,
    label: string,
    op: MeasureSpec['op'],
    args: string[],
    unit: string,
    offered: boolean,
  ): MeasureItem => {
    const ok = offered && args.length > 0 && args.every(measurable);
    return { id, label, spec: ok ? { op, args, label: lhs(op, args, ctx), precision: 2, ...(unit ? { unit } : {}) } : null };
  };

  // A point and the straight thing beside it: Sketchpad measures the shortest
  // distance to it, two points measure between themselves.
  const pointToSegment =
    (isPoint(a) && (isSegment(b) || isLine(b))) || (isPoint(b) && (isSegment(a) || isLine(a)));
  const distanceArgs = isPoint(a) ? ids(a, b) : ids(b, a);

  return [
    row('length', 'Length', 'length', ids(a), CM, picked.length === 1 && isSegment(a)),
    row('distance', 'Distance', pointToSegment ? 'pointSegmentDistance' : 'distance',
      picked.length === 2 ? distanceArgs : [], CM,
      picked.length === 2 && ((isPoint(a) && isPoint(b)) || pointToSegment)),
    row('perimeter', 'Perimeter', 'perimeter', ids(a), CM,
      picked.length === 1 && isKind('polygon')(a)),
    row('circumference', 'Circumference', 'circumference', ids(a), CM,
      picked.length === 1 && isKind('circle')(a)),
    row('angle', 'Angle', 'angle', ids(a, b, c), DEG,
      picked.length === 3 && isPoint(a) && isPoint(b) && isPoint(c)),
    // an arc has no area of its own, so it gives the bow between it and its chord
    row('area', 'Area', isArc(a) ? 'segmentArea' : 'area', ids(a), CM2,
      picked.length === 1 && (['polygon', 'circle', 'sector'].includes(a?.type ?? '') || isArc(a))),
    row('arcAngle', 'Arc Angle', 'arcAngle', ids(a), DEG, picked.length === 1 && isArc(a)),
    row('arcLength', 'Arc Length', 'arcLength', ids(a), CM, picked.length === 1 && isArc(a)),
    row('radius', 'Radius', 'radius', ids(a), CM,
      picked.length === 1 && (isKind('circle')(a) || isArc(a))),
    row('ratio', 'Ratio', 'ratio', ids(a, b), '',
      picked.length === 2 && isSegment(a) && isSegment(b)),
    row('value', 'Value', 'value', ids(a), '', picked.length === 1 && isKind('slider')(a)),
    row('coordinates', 'Coordinates', 'coordinates', ids(a), '', picked.length === 1 && isPoint(a)),
    row('abscissa', 'Abscissa (x)', 'abscissa', ids(a), '', picked.length === 1 && isPoint(a)),
    row('ordinate', 'Ordinate (y)', 'ordinate', ids(a), '', picked.length === 1 && isPoint(a)),
    row('slope', 'Slope', 'slope', ids(a), '',
      picked.length === 1 && (isLine(a) || isSegment(a))),
    // desktop's canMeasureEquation: the equation of a line or of a circle
    row('equation', 'Equation', a?.type === 'circle' ? 'equationCircle' : 'equationLine',
      ids(a), '',
      picked.length === 1 && (isLine(a) || isKind('circle')(a))),
  ];
}
