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
  registerMeasure,
  type MeasureSpec,
} from './measurement';
import { migrateLegacyMeasure } from './legacyMeasure';
import { migrateLegacyTransform } from './legacyTransform';
import { isPlotSpec, PLOT_SAMPLES, plotParents, plotProblem } from './plotModel';
import { imageClosures, isImageSpec, type ImageSpec } from './transforms';

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
}

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
  point:          { jxg: 'point',          parents: 2 },
  glider:         { jxg: 'glider',         parents: 3 },
  midpoint:       { jxg: 'midpoint',       parents: 2 },
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
  angle:          { jxg: 'angle',          parents: 3 },
  // hasInnerPoints belongs to the registry rather than to each document:
  // Sketchpad lets a click anywhere inside the shape select it, and a document
  // saved before that was decided should behave like one written after it.
  polygon:        { jxg: 'polygon',        parents: atLeast(3), attrs: { hasInnerPoints: true } },
  // parents are [[x1,y1],[x2,y2],[min,value,max]] — three coordinate arrays
  slider:         { jxg: 'slider',         parents: 3 },
  // parents are [x, y, caption] — only the anchor pair may reference elements.
  text:           { jxg: 'text',           parents: 3, refParents: [0, 1] },
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

function checkArity(entry: RegistryEntry, el: ElementSpec): string | undefined {
  // An image point is placed by its descriptor, so its only parent is the point
  // it copies.
  if (imageOf(el)) {
    return el.parents.length === 1 ? undefined : `điểm biến hình cần 1 đối tượng cha, nhận ${el.parents.length}`;
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
  return el.parents.map((p, i) => {
    if (isReferenceParent(el, i)) return elMap[p as string];
    if (byName && typeof p === 'string' && p in elMap) return elMap[p];
    if (Array.isArray(p)) return (p as (number | null)[]).map(v => (v === null ? NaN : v));
    return p;
  });
}

/** Attributes that describe the element to this app, not to JSXGraph. */
const APP_ATTRS = ['measure', 'anchor', 'image', 'coordsys', 'plot'];

/** Build one element from its HeyGeo JSON description. */
export function createElement(
  board: Any,
  source: ElementSpec,
  elMap: Record<string, unknown> = {},
): CreateOutcome {
  // Normalising here as well as in the loaders means no caller can hand this
  // function a stored code source and have it reach the engine.
  const el = normalizeElement(source);
  const entry = ELEMENT_REGISTRY[el.type];
  if (!entry) return { obj: null, error: `Không nhận kiểu đối tượng "${el.type}"` };

  if (refusedCodeSource(el)) {
    return { obj: null, error: `${el.type}: không dựng lại được biểu thức cũ, hãy tạo lại đo lường này` };
  }

  const arityError = checkArity(entry, el);
  if (arityError) return { obj: null, error: arityError };

  // An image point reads its source from the live board, not from elMap, so a
  // missing source has to be caught before the closures are built.
  const copiedPoint = String(el.parents[0]);
  if (imageOf(el) && !elMap[copiedPoint] && !board?.objects?.[copiedPoint]) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }

  // A curve the designer typed reads its frame through closures, so the
  // undefined-parent check below cannot see its parents going missing; and a
  // formula that asks for a name the plot does not have is refused here rather
  // than drawn as an empty board.
  if (el.type === 'plot' && isPlotSpec(el.attrs?.plot)) {
    const problem = plotProblem(el.attrs.plot);
    if (problem) return { obj: null, error: `plot: ${problem}` };
    const gone = el.parents.find(
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

  try {
    const obj = board.create(entry.jxg, parents, {
      id: el.id,
      ...(entry.attrs ?? {}),
      ...attrs,
    });
    // A calculation reads the numbers its operands measure, so the descriptor
    // has to stay with the board that is drawing it.
    if (el.id && isMeasureSpec(el.attrs?.measure)) registerMeasure(board, el.id, el.attrs!.measure as MeasureSpec);
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
