/**
 * elementRegistry – the single source of truth for how a HeyGeo JSON element
 * becomes a JSXGraph object.
 *
 * The HeyGeo JSON format is shared with the Qt desktop app (HeyGeoWebExporter)
 * and consumed by the designer loader, JSXGraphViewer and the desktop
 * round-trip. Before this registry the loader forwarded `el.type` straight to
 * board.create() and swallowed every failure, so a type the engine does not
 * accept (or a parent list it cannot resolve) silently disappeared on reload.
 *
 * Nothing here evaluates a string. A measurement or a transformed point arrives
 * as a descriptor and becomes a closure over the board, a typed curve becomes a
 * closure over the frame it was plotted on, a stored JSXGraph expression is handed
 * to the engine's own parser, and a source that is neither is reported instead of
 * run.
 */
import {
  anchorClosures,
  isAnchorSpec,
  isMeasureSpec,
  measureClosure,
  isLengthSource,
  lengthValueOf,
  numberValueOf,
  registerMeasure,
  type MeasureSpec,
} from './measurement';
import { migrateLegacyMeasure } from './legacyMeasure';
import { migrateLegacyTransform } from './legacyTransform';
import { isPlotSpec, PLOT_SAMPLES, plotParents, plotProblem } from './plotModel';
import { plotPointOf, plotPointParents, plotPointProblem } from './plotPointModel';
import { isPlotValueSpec, plotValueNumber, plotValueOf, valueGlide } from './plotValueModel';
import { buttonOf, buttonProblem } from './actionButtonModel';
import { imageClosures, isImageSpec, type ImageSpec } from './transforms';
import { isParameterSpec, parameterCaption } from './parameterModel';
import { withFontFamily } from './fontModel';
import {
  LINE_LOCUS_TYPE,
  locusSamples,
  locusSpan,
  sampleLineLocus,
} from './lineLocusModel';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

export interface ElementSpec {
  type: string;
  id?: string;
  parents: Any[];
  attrs?: Record<string, Any>;
}

export interface CreateOutcome {
  obj: Any;
  error?: string;
  /**
   * A type the document may name that this app deliberately draws nothing
   * for, so the loader drops it without calling it a failure.
   */
  skipped?: boolean;
}

/**
 * The desktop exporter writes these beside a coordinate system it builds out of
 * plain lines and ticks: `move_with` makes the unit point follow the origin and
 * `coordsys_u_drag` re-spaces the ticks. They are the desktop viewer's own
 * wiring, not a drawing; this app draws frames from its own model, so they have
 * nothing to drive and nothing to report.
 */
const UNPICTURED_TYPES = new Set(['eventbinding']);

interface RegistryEntry {
  /** JSXGraph element type to create. */
  jxg: string;
  /** Exact parent count, or a predicate when the type is variadic. */
  parents: number | ((n: number) => boolean);
  /** Attributes the JSON format cannot express, merged before el.attrs. */
  attrs?: Record<string, Any>;
  /**
   * Parent indices that hold element ids. Defaults to every index, which is
   * wrong for types whose parents mix ids with literals — a text caption is
   * parent index 2 and must not be read as a reference.
   */
  refParents?: number[];
  /**
   * 'indexed' (default) decides by position, see refParents.
   * 'byName' treats any string that names an element already built as a
   * reference and every other string as a literal. Needed for `transform`,
   * whose parent list is an element id for reflect/rotate but a JessieCode
   * expression for translate, depending on attrs.type.
   */
  parentMode?: 'indexed' | 'byName';
}

const atLeast = (min: number) => (n: number) => n >= min;

export const ELEMENT_REGISTRY: Record<string, RegistryEntry> = {
  // Two coordinates, or — for a point Graph | Plot as (x, y)… placed — the three
  // points of the frame it was plotted onto plus the `attrs.plotAt` that says
  // where on it. The second shape is checked beside the first in checkArity.
  point:          { jxg: 'point',          parents: 2 },
  glider:         { jxg: 'glider',         parents: 3 },
  midpoint:       { jxg: 'midpoint',       parents: 2 },
  // Construct | Center Point on an arc through three points: the one point the
  // three are equally far from. JSXGraph builds it, so a document can name it.
  circumcenter:   { jxg: 'circumcenter',   parents: 3 },
  intersection:   { jxg: 'intersection',   parents: 3 },
  segment:        { jxg: 'segment',        parents: 2 },
  line:           { jxg: 'line',           parents: 2 },
  // JSXGraph has no `ray`; a half-arrow on the far end is the accepted spelling.
  ray:            { jxg: 'line',           parents: 2, attrs: { firstArrow: [0, 0], lastArrow: [1, 1] } },
  circle:         { jxg: 'circle',         parents: 2 },
  arc:            { jxg: 'arc',            parents: 3 },
  // the exporter's spelling for an arc given by the three points it passes
  // through, its centre being whatever circle goes through them
  circumcirclearc: { jxg: 'circumcirclearc', parents: 3 },
  sector:         { jxg: 'sector',         parents: 3 },
  // a sector filled around the centre three points on its circle imply, the
  // shape Construct | Arc Sector Interior gives an arc through three points
  circumcirclesector: { jxg: 'circumcirclesector', parents: 3 },
  // Construct | Arc Segment Interior: the region bounded by an arc and its
  // chord. Built as a parametric curve traced over the arc then the chord;
  // parents are [centre, startPt, endPt], the same triple a 'sector' uses.
  arcsegment:     { jxg: 'curve',          parents: 3 },
  angle:          { jxg: 'angle',          parents: 3 },
  // hasInnerPoints belongs to the registry rather than to each document:
  // Sketchpad lets a click anywhere inside the shape select it, and a document
  // saved before that was decided should behave like one written after it.
  polygon:        { jxg: 'polygon',        parents: atLeast(3), attrs: { hasInnerPoints: true } },
  // parents are [[x1,y1],[x2,y2],[min,value,max]] — three coordinate arrays
  // A slider is moved by dragging its baseline or either end point, which is
  // how JSXGraph documents a draggable slider; the handle still sets the value.
  slider: {
    jxg: 'slider', parents: 3,
    attrs: {
      point1: { fixed: false },
      point2: { fixed: false },
      baseline: { fixed: false, needsRegularUpdate: true },
    },
  },
  // parents are [x, y, caption] — only the anchor pair may reference elements.
  text:           { jxg: 'text',           parents: 3, refParents: [0, 1] },
  // Number | New Parameter… — a value drawn as `name = number`. Its caption is
  // a closure over the descriptor, so changing the value re-draws it.
  parameter:      { jxg: 'text',           parents: 3, refParents: [0, 1] },
  // A Sketchpad action button: a caption that hides or shows the elements its
  // `attrs.button` names. It is drawn as a boxed text where the designer put it,
  // and pressing it is a change to those elements, not to the button.
  actionbutton: {
    jxg: 'text', parents: 3, refParents: [0, 1],
    attrs: {
      display: 'html',
      fontSize: 14,
      strokeColor: '#333333',
      cssStyle: 'border:1px solid #8a8a8a;border-radius:5px;padding:2px 8px;'
        + 'background:#f5f5f5;cursor:pointer;user-select:none;',
    },
  },
  ticks:          { jxg: 'ticks',          parents: atLeast(1) },
  // Parents are JSXGraph expressions or coordinate arrays, never element ids,
  // so nothing here may be looked up in elMap.
  curve:          { jxg: 'curve',          parents: atLeast(1), refParents: [] },
  functiongraph:  { jxg: 'functiongraph',  parents: atLeast(1), refParents: [] },
  // A curve the designer typed. Its parents are the three points of the frame it
  // was plotted on — origin, unit, y-direction — so it is measured in that frame
  // and not in the page, exactly as Sketchpad's plot is a child of the marked
  // system. `attrs.plot` carries the expressions and the domain; the sampling is
  // the desktop's 300 points, not JSXGraph's 100.
  plot:           { jxg: 'curve',          parents: 3, attrs: { numberPoints: PLOT_SAMPLES } },
  conic:          { jxg: 'conic',          parents: 5 },
  tracecurve:     { jxg: 'tracecurve',     parents: 2 },
  // Construct | Locus… of a straight object: the family of lines the driver
  // sweeps, drawn as one curve with the pen lifted between samples. Its parents
  // are the driver and the line, both live board objects.
  linelocus:      { jxg: 'curve',          parents: 2 },
  // desktop transforms: [dx,dy] / [angle, centreId] / [lineId]
  transform:      { jxg: 'transform',      parents: (n) => n >= 1 && n <= 2, parentMode: 'byName' },
  // The desktop exporter's spelling for an angle bisector; JSXGraph calls the
  // same element `bisector` and takes [point, vertex, point] in that order.
  anglebisector:  { jxg: 'bisector',       parents: 3 },
  perpendicular:  { jxg: 'perpendicular',  parents: 2 },
  parallel:       { jxg: 'parallel',       parents: 2 },
  bisector:       { jxg: 'bisector',       parents: 3 },
};

/** True for element types this project has decided to support. */
export function isSupportedType(type: string): boolean {
  return type in ELEMENT_REGISTRY;
}

const FUNCTION_SOURCE = /^\s*function\s*[({]/;

/** True when a stored parent is executable source rather than data. */
export function isLegacyCodeSource(parent: unknown): boolean {
  return typeof parent === 'string' && FUNCTION_SOURCE.test(parent);
}

/**
 * A curve does not need JavaScript: JSXGraph parses its own expression syntax.
 * `function(t){ return Math.sin(t)+1; }` becomes the string `sin(x)+1` with the
 * parameter renamed to x, and the engine evaluates that without a code-execution
 * surface. An expression naming anything but its own parameter is refused.
 */
const ARROW_OR_BOARD = /\bboard\b|\bobjects\b|=>|\beval\b|new\s|fetch|require|import/;

export function expressionFromCode(source: string): string | null {
  const m = /^function\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{[\s\S]*?return([\s\S]*?);?\s*\}$/.exec(source.trim());
  if (!m) return null;
  const [, variable, raw] = m;
  const expr = raw.trim();
  if (!expr || ARROW_OR_BOARD.test(expr)) return null;
  const renamed = expr.replace(new RegExp(`\\b${variable}\\b`, 'g'), 'x');
  return renamed.replace(/\bMath\.PI\b/g, 'pi').replace(/\bMath\.E\b/g, 'e').replace(/\bMath\./g, '');
}

/**
 * Old documents wrote measurements — their captions, sometimes their positions —
 * and the images of Translate/Rotate/Dilate/Reflect as JS source. Those are
 * rewritten to declarative descriptors here, once, on the way in, so nothing
 * downstream has to know the history and nothing has to be evaluated. Curves
 * become JSXGraph expression strings. Anything else keeps its source and is
 * refused by resolveParents.
 */
export function normalizeElement(el: ElementSpec): ElementSpec {
  const migrated = migrateLegacyMeasure(el) ?? migrateLegacyTransform(el);
  if (migrated) return migrated;
  if (!el.parents.some(isLegacyCodeSource)) return el;
  if (el.type !== 'functiongraph' && el.type !== 'curve') return el;
  const parents = el.parents.map((p) =>
    (isLegacyCodeSource(p) ? expressionFromCode(p) ?? p : p));
  return { ...el, parents };
}

/**
 * True when a parent is source this registry will not run.
 */
function refusedCodeSource(el: ElementSpec): boolean {
  return el.parents.some(isLegacyCodeSource);
}

function imageOf(el: ElementSpec): ImageSpec | null {
  return el.type === 'point' && isImageSpec(el.attrs?.image) ? el.attrs.image : null;
}

/**
 * Where a glider starts, when the document knows its place *along* the path
 * instead of a pair of numbers.
 *
 * A point on a line has no coordinates of its own: its place is a distance the
 * sketch measured along a line whose direction only the board can work out —
 * the line's second point may itself be built from something else. So the
 * document keeps the reading (`distance`, `ratio` or `turn`) and the registry
 * walks the live path to find the point, once, when the element is created.
 * Everything after that is JSXGraph's own dragging, as with any glider.
 */
export type GlideSpec =
  | { ratio: number } // along a segment or a polygon's edge
  | { distance: number } // along a line or a ray, in board units
  | { turn: number }; // round a circle or an arc, in radians, page-wise

export function isGlideSpec(value: unknown): value is GlideSpec {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.ratio === 'number' || typeof v.distance === 'number' || typeof v.turn === 'number';
}

/** The place a glider starts at on the path the board has just built. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function glideStart(spec: GlideSpec, path: Any): [number, number] | null {
  if ('turn' in spec) {
    // the page's y runs down and the board's up, so a page-wise turn is the
    // opposite turn here
    const c = path?.center;
    const rim = path?.radiuspoint ?? path?.point2;
    if (!c?.X || !rim?.X) return null;
    const rad = -spec.turn;
    const ux = rim.X() - c.X();
    const uy = rim.Y() - c.Y();
    const [cos, sin] = [Math.cos(rad), Math.sin(rad)];
    return [c.X() + ux * cos - uy * sin, c.Y() + ux * sin + uy * cos];
  }
  const a = path?.point1;
  const b = path?.point2;
  if (!a?.X || !b?.X) return null;
  const [dx, dy] = [b.X() - a.X(), b.Y() - a.Y()];
  if ('ratio' in spec) return [a.X() + spec.ratio * dx, a.Y() + spec.ratio * dy];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return [a.X() + (dx * spec.distance) / len, a.Y() + (dy * spec.distance) / len];
}

/**
 * Graph | Plot Value on Path: put each plotted point where its number now says.
 * `placed` remembers the reading each point was last moved to, so a point the
 * designer drags stays where it was put until the number under it changes —
 * which is the moment the document says it is no longer the designer's to hold.
 * The engine does not see a function inside an attribute as a dependency, so
 * this is done on the canvas's own clock rather than by JSXGraph.
 */
export function syncPlotValues(
  board: Any,
  elements: { id: string; attrs?: Record<string, unknown> | null }[],
  placed: Map<string, number>,
  numberAt: (id: string) => number | null,
): boolean {
  let moved = false;
  for (const el of elements) {
    const spec = plotValueOf(el);
    if (!spec) continue;
    const value = plotValueNumber(spec, numberAt);
    if (value === null) continue;
    const before = placed.get(el.id);
    placed.set(el.id, value);
    if (before === undefined || Math.abs(before - value) < 1e-12) continue;
    const obj = board.objects[el.id];
    const glide = valueGlide(spec.kind, value);
    const at = glide === null ? null : glideStart(glide, board.objects[spec.path]);
    if (!at || typeof obj?.moveTo !== 'function') continue;
    try { obj.moveTo(at); moved = true; } catch { /* the path went away */ }
  }
  return moved;
}

function checkArity(entry: RegistryEntry, el: ElementSpec): string | undefined {
  // An image point is placed by its descriptor, so its only parent is the point
  // it copies.
  if (imageOf(el)) {
    return el.parents.length === 1 ? undefined : `điểm biến hình cần 1 đối tượng cha, nhận ${el.parents.length}`;
  }
  // A plotted point is placed by its two coordinates, so its parents are the
  // frame those are measured on.
  if (plotPointOf(el)) {
    return el.parents.length === 3 ? undefined : `điểm vẽ trên hệ trục cần 3 đối tượng cha, nhận ${el.parents.length}`;
  }
  const n = el.parents.length;
  if (typeof entry.parents === 'number') {
    return n === entry.parents ? undefined : `${el.type} cần ${entry.parents} đối tượng cha, nhận ${n}`;
  }
  return entry.parents(n) ? undefined : `${el.type} có số đối tượng cha không hợp lệ (${n})`;
}

/**
 * True when the parent at this index names another element. Anything else —
 * coordinates, a text caption, a slider range — is a literal and must reach
 * JSXGraph unchanged.
 */
export function isReferenceParent(el: ElementSpec, index: number): boolean {
  const entry = ELEMENT_REGISTRY[el.type];
  // An unknown type is reported by createElement before any parent is resolved
  if (!entry || entry.parentMode === 'byName') return false;
  const p = el.parents[index];
  if (typeof p !== 'string' || isLegacyCodeSource(p)) return false;
  const indices = entry.refParents ?? el.parents.map((_, i) => i);
  return indices.includes(index);
}

/**
 * Turn the JSON parent list into what JSXGraph wants: ids become the objects
 * already built in `elMap`, coordinate arrays keep their literals, and a
 * measurement descriptor becomes a live closure over this board. A code source
 * that survived normalisation is refused.
 */
export function resolveParents(el: ElementSpec, board: Any, elMap: Record<string, unknown>): unknown[] {
  const attrs = el.attrs ?? {};
  const image = imageOf(el);
  if (image) return imageClosures(board, String(el.parents[0]), image);
  if (el.type === 'glider' && isPlotValueSpec(attrs.plotValue)) {
    // Graph | Plot Value on Path: the glider starts where the reading falls, and
    // the canvas moves it on when the number under the reading changes.
    const spec = attrs.plotValue;
    const path = elMap[spec.path];
    const value = plotValueNumber(spec, (id) => numberValueOf(board, id));
    const glide = value === null ? null : valueGlide(spec.kind, value);
    const start = glide === null ? null : glideStart(glide, path);
    if (start) return [start[0], start[1], path];
  }
  if (el.type === 'glider' && isGlideSpec(attrs.glide)) {
    const path = elMap[String(el.parents[2])];
    const start = glideStart(attrs.glide, path);
    if (start) return [start[0], start[1], path];
  }
  const parameter = isParameterSpec(attrs.parameter) ? attrs.parameter : null;
  if (parameter) {
    // The caption reads the element's own attrs, which is the object the
    // properties dialog mutates, so an edited value redraws without a rebuild.
    // The place is a holder the canvas can move: a text whose parents are plain
    // numbers recomputes its coords from them every update, so dragging it has
    // to move the holder rather than its coords.
    const live = el.attrs ?? {};
    const pos = ((el as Any).parameterPos ??= {
      x: Number(el.parents[0]) || 0,
      y: Number(el.parents[1]) || 0,
    });
    return [
      () => pos.x,
      () => pos.y,
      () => {
        const spec = isParameterSpec(live.parameter) ? live.parameter : parameter;
        // A label bound to a slider shows that slider's live value.
        if (spec.of) {
          const slider = board?.objects?.[spec.of];
          const v = Number(slider?.Value?.());
          return parameterCaption(String(live.name ?? ''), { ...spec, value: Number.isFinite(v) ? v : spec.value });
        }
        return parameterCaption(String(live.name ?? ''), spec);
      },
    ];
  }
  const measure = isMeasureSpec(attrs.measure) ? attrs.measure : null;
  const anchor = isAnchorSpec(attrs.anchor) ? attrs.anchor : null;
  if (measure || anchor) {
    const [ax, ay] = anchor ? anchorClosures(board, anchor)
      : [() => Number(el.parents[0]) || 0, () => Number(el.parents[1]) || 0];
    const caption = measure ? measureClosure(board, measure) : String(el.parents[2] ?? '');
    return [ax, ay, caption];
  }

  const byName = ELEMENT_REGISTRY[el.type]?.parentMode === 'byName';
  if (el.type === 'plot' && isPlotSpec(attrs.plot)) {
    return plotParents(el.parents.map((id) => elMap[String(id)]), attrs.plot);
  }
  const plotted = plotPointOf(el);
  if (plotted) {
    return plotPointParents(
      el.parents.map((id) => elMap[String(id)]),
      plotted,
      (id) => numberValueOf(board, id),
    );
  }
  // A circle about a picked centre whose second parent is a length — a segment
  // or a distance/length/radius reading — draws with that length as its radius,
  // so it follows the segment or the measurement when either changes.
  if (el.type === 'circle' && el.parents.length === 2
      && typeof el.parents[0] === 'string' && typeof el.parents[1] === 'string'
      && isLengthSource(board, el.parents[1])) {
    const centreId = el.parents[0];
    const radiusId = el.parents[1];
    return [elMap[centreId], () => lengthValueOf(board, radiusId) ?? NaN];
  }
  return el.parents.map((p, i) => {
    if (isReferenceParent(el, i)) return elMap[p as string];
    if (byName && typeof p === 'string' && p in elMap) return elMap[p];
    if (Array.isArray(p)) return (p as (number | null)[]).map(v => (v === null ? NaN : v));
    return p;
  });
}

/** Attributes that describe the element to this app, not to JSXGraph. */
const APP_ATTRS = ['measure', 'anchor', 'image', 'glide', 'coordsys', 'plot', 'func', 'plotAt', 'plotValue', 'button', 'parameter'];

/**
 * Construct | Arc Segment Interior: the filled region bounded by an arc and
 * its chord (not a pie-slice, unlike sector). Rendered as a parametric curve
 * that first traces the arc from p1 to p2 counter-clockwise then returns
 * along the straight chord from p2 back to p1. The curve is closed and filled.
 *
 * parents: [centrePtId, startPtId, endPtId] — the same triple as 'arc'.
 */
function createArcSegment(
  board: Any,
  el: ElementSpec,
  elMap: Record<string, unknown>,
): CreateOutcome {
  const live = (id: unknown): Any => elMap[String(id)] ?? board?.objects?.[String(id)];
  const center = live(el.parents[0]);
  const p1     = live(el.parents[1]);
  const p2     = live(el.parents[2]);
  if (!center || !p1 || !p2) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }

  const attrs: Record<string, Any> = { ...(el.attrs ?? {}) };
  for (const key of APP_ATTRS) delete attrs[key];

  try {
    const obj = board.create('curve', [
      (t: number) => {
        const cx = center.X(); const cy = center.Y();
        const r  = Math.hypot(p1.X() - cx, p1.Y() - cy);
        const a1 = Math.atan2(p1.Y() - cy, p1.X() - cx);
        const a2 = Math.atan2(p2.Y() - cy, p2.X() - cx);
        let da = a2 - a1;
        if (da < 0) da += 2 * Math.PI;
        if (t <= 1) {
          return cx + r * Math.cos(a1 + da * t);
        }
        const s = t - 1;
        return p2.X() + s * (p1.X() - p2.X());
      },
      (t: number) => {
        const cx = center.X(); const cy = center.Y();
        const r  = Math.hypot(p1.X() - cx, p1.Y() - cy);
        const a1 = Math.atan2(p1.Y() - cy, p1.X() - cx);
        const a2 = Math.atan2(p2.Y() - cy, p2.X() - cx);
        let da = a2 - a1;
        if (da < 0) da += 2 * Math.PI;
        if (t <= 1) {
          return cy + r * Math.sin(a1 + da * t);
        }
        const s = t - 1;
        return p2.Y() + s * (p1.Y() - p2.Y());
      },
      0, 2,
    ], {
      id: el.id,
      numberPointsHigh: 100,
      numberPointsLow: 50,
      ...attrs,
    });
    return { obj };
  } catch (e) {
    return { obj: null, error: `${el.type}: ${(e as Error).message}` };
  }
}

/** Build one element from its HeyGeo JSON description. */
export function createElement(
  board: Any,
  source: ElementSpec,
  elMap: Record<string, unknown> = {},
): CreateOutcome {
  // Normalising here as well as in the loaders means no caller can hand this
  // function a stored code source and have it reach the engine.
  const el = normalizeElement(source);
  if (UNPICTURED_TYPES.has(el.type)) return { obj: null, skipped: true };
  const entry = ELEMENT_REGISTRY[el.type];
  if (!entry) return { obj: null, error: `Không nhận kiểu đối tượng "${el.type}"` };

  if (refusedCodeSource(el)) {
    return { obj: null, error: `${el.type}: không dựng lại được biểu thức cũ, hãy tạo lại đo lường này` };
  }

  const arityError = checkArity(entry, el);
  if (arityError) return { obj: null, error: arityError };

  if (el.type === LINE_LOCUS_TYPE) return createLineLocus(board, el, elMap);
  if (el.type === 'arcsegment') return createArcSegment(board, el, elMap);

  // An image point reads its source from the live board, not from elMap, so a
  // missing source has to be caught before the closures are built.
  const copiedPoint = String(el.parents[0]);
  if (imageOf(el) && !elMap[copiedPoint] && !board?.objects?.[copiedPoint]) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }

  // A typed curve and a plotted point are both measured through the frame's three
  // points, which their closures read live, so the undefined-parent check below
  // cannot see those parents going missing; and an expression that asks for a
  // name or a number the element does not have is refused here rather than drawn
  // as an empty board.
  const plot = el.type === 'plot' && isPlotSpec(el.attrs?.plot) ? el.attrs.plot : null;
  const plotted = plotPointOf(el);
  if (plot !== null || plotted !== null) {
    const problem = plot !== null ? plotProblem(plot) : plotPointProblem(plotted!);
    if (problem) return { obj: null, error: `${el.type}: ${problem}` };
    const gone = el.parents.find(
      (id) => !elMap[String(id)] && !board?.objects?.[String(id)]);
    if (gone !== undefined) {
      return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
    }
  }

  // A button acts on elements named in its descriptor rather than in its parent
  // list, so a missing target is invisible to the undefined-parent check below
  // and a button with nothing to act on is refused rather than drawn dead.
  const button = buttonOf(el);
  if (el.type === 'actionbutton' && button === null) {
    return { obj: null, error: `${el.type}: nút hành động thiếu mô tả` };
  }
  if (button) {
    const problem = buttonProblem(button);
    if (problem) return { obj: null, error: `${el.type}: ${problem}` };
    const gone = button.targets.find(
      (id) => !elMap[String(id)] && !board?.objects?.[String(id)]);
    if (gone !== undefined) {
      return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
    }
  }

  let parents: unknown[];
  try {
    parents = resolveParents(el, board, elMap);
  } catch (e) {
    return { obj: null, error: `${el.type}: ${(e as Error).message}` };
  }
  if (parents.some((p, i) => p === undefined && isReferenceParent(el, i))) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }

  const attrs: Record<string, Any> = { ...(el.attrs ?? {}) };
  for (const key of APP_ATTRS) delete attrs[key];
  // The desktop exporter keeps a label's face in label.fontFamily as a CSS
  // stack, but JSXGraph's label has no such attribute — it draws from cssStyle.
  // The stack moves there so a desktop sketch opens in its own face instead of
  // the engine's Arial.
  const rawLabel = attrs.label;
  if (rawLabel && typeof rawLabel === 'object') {
    const label = rawLabel as Record<string, unknown>;
    if (typeof label.fontFamily === 'string' && label.fontFamily !== '') {
      attrs.label = {
        ...label,
        cssStyle: withFontFamily(
          typeof label.cssStyle === 'string' ? label.cssStyle : undefined,
          label.fontFamily,
        ),
        display: label.display ?? 'html',
      };
      delete (attrs.label as Record<string, unknown>).fontFamily;
    }
  }
  // a parametric curve brings the sample count its dialog was answered with, the
  // same number the desktop stores on the definition beside the domain
  if (plot?.samples) attrs.numberPoints = plot.samples;

  try {
    const obj = board.create(entry.jxg, parents, {
      id: el.id,
      ...(entry.attrs ?? {}),
      ...attrs,
    });
    // A calculation reads the numbers its operands measure, so the descriptor
    // has to stay with the board that is drawing it.
    if (el.id && isMeasureSpec(el.attrs?.measure)) registerMeasure(board, el.id, el.attrs!.measure as MeasureSpec);
    // Transform | Mark Ratio reads a parameter's live value off the board object.
    if (isParameterSpec(el.attrs?.parameter)) (obj as Any).parameterSpec = el.attrs!.parameter;
    return { obj };
  } catch (e) {
    return { obj: null, error: `${el.type}: ${(e as Error).message}` };
  }
}

/**
 * Construct | Locus… of a straight object: the driver and the line it moves, as
 * one curve. Sketchpad draws the whole family of lines, so the samples are pairs
 * of far points with a NaN between pairs — the renderer lifts the pen on a NaN.
 * The engine's own sampling and smoothing are switched off, because the table's
 * indices are what the curve's parameter means.
 */
function createLineLocus(
  board: Any,
  el: ElementSpec,
  elMap: Record<string, unknown>,
): CreateOutcome {
  const live = (id: unknown) => (elMap[String(id)] ?? board?.objects?.[String(id)]) as Any;
  const driver = live(el.parents[0]);
  const line = live(el.parents[1]);
  if (!driver || !line) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }
  const samples = locusSamples(el.attrs);
  // A line built from coefficient functions has no stdform until the board has
  // run once, so the figure is settled before it is sampled.
  try {
    board.update();
  } catch {
    // a board that is mid-update has its stdforms already
  }
  const table = sampleLineLocus(board, driver, line, samples, locusSpan(board));
  if (table.length === 0) {
    return { obj: null, error: `${el.type}: điểm dẫn không chạy trên đối tượng nào` };
  }
  const attrs = { ...(el.attrs ?? {}) };
  for (const key of APP_ATTRS) delete attrs[key];
  const n = table.length;
  // The curve reads the table through this holder, so re-sampling replaces what
  // it draws without the curve having to be built again.
  const locus = { driver, line, samples, table, sig: '' };
  try {
    const obj = board.create('curve', [
      (t: number) => locus.table[Math.round(t)]?.[0] ?? NaN,
      (t: number) => locus.table[Math.round(t)]?.[1] ?? NaN,
      0, n,
    ], {
      id: el.id,
      numberPointsHigh: n,
      numberPointsLow: n,
      doAdvancedPlot: false,
      RDPsmoothing: false,
      ...attrs,
    });
    obj._locus = locus;
    return { obj };
  } catch (e) {
    return { obj: null, error: `${el.type}: ${(e as Error).message}` };
  }
}

/** A parent id that is not among the already-created elements means bad ordering. */
export function unresolvedParentId(el: ElementSpec, known: Set<string>): string | null {
  for (let i = 0; i < el.parents.length; i++) {
    if (isReferenceParent(el, i) && !known.has(el.parents[i] as string)) return el.parents[i] as string;
  }
  return null;
}
