/**
 * elementRegistry – the single source of truth for how a HeyGeo JSON element
 * becomes a JSXGraph object.
 *
 * The HeyGeo JSON format is shared with the Qt desktop app (HeyGeoWebExporter)
 * and consumed by the designer loader, JSXGraphViewer and the desktop
 * round-trip. Before this registry the loader forwarded `el.type` straight to
 * board.create() and swallowed every failure, so a type the engine does not
 * accept (or a parent list it cannot resolve) silently disappeared on reload.
 */

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
  /** Set when the element could only be rebuilt by evaluating stored JS source. */
  legacyCode?: boolean;
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
  sector:         { jxg: 'sector',         parents: 3 },
  angle:          { jxg: 'angle',          parents: 3 },
  polygon:        { jxg: 'polygon',        parents: atLeast(3) },
  // parents are [[x1,y1],[x2,y2],[min,value,max]] — three coordinate arrays
  slider:         { jxg: 'slider',         parents: 3 },
  // parents are [x, y, caption] — only the anchor pair may reference elements.
  text:           { jxg: 'text',           parents: 3, refParents: [0, 1] },
  ticks:          { jxg: 'ticks',          parents: atLeast(1) },
  curve:          { jxg: 'curve',          parents: atLeast(1) },
  functiongraph:  { jxg: 'functiongraph',  parents: atLeast(1) },
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
 * Legacy measurements were persisted as JS source strings in the parent list and
 * rehydrated by evaluating them against the board. That is a code-execution
 * surface for stored JSON, kept only so existing models keep rendering; P0.5
 * replaces it with a declarative `attrs.measure` descriptor and deletes this.
 */
export function hasLegacyCodeParents(el: ElementSpec): boolean {
  return el.parents.some(isLegacyCodeSource);
}

// The stored source is a zero-argument function that closes over a free `board`,
// so it has to be compiled with board bound as that name, not called with it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const compileLegacySource = new Function('source', 'board', 'return eval("(" + source + ")");') as unknown as
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (source: string, board: any) => any;

export function resolveLegacyCodeParent(source: string, board: Any): Any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = compileLegacySource(source, board) as any;
  // JSXGraph calls a function parent with the curve parameter, so the argument
  // must reach the stored function; measurement sources take none and ignore it.
  return function (this: Any, ...args: unknown[]) {
    try {
      const v = raw.apply(this, args);
      return typeof v === 'number' ? v : (v != null ? String(v) : '…');
    } catch {
      return 0;
    }
  };
}

function checkArity(entry: RegistryEntry, el: ElementSpec): string | undefined {
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
 * already built in `elMap`, coordinate arrays keep their literals, and a stored
 * measurement/function source becomes a live function over this board.
 */
export function resolveParents(el: ElementSpec, board: Any, elMap: Record<string, unknown>): unknown[] {
  const byName = ELEMENT_REGISTRY[el.type]?.parentMode === 'byName';
  return el.parents.map((p, i) => {
    if (isReferenceParent(el, i)) return elMap[p as string];
    if (byName && typeof p === 'string' && p in elMap) return elMap[p];
    if (isLegacyCodeSource(p)) return resolveLegacyCodeParent(p as string, board);
    if (Array.isArray(p)) return (p as (number | null)[]).map(v => (v === null ? NaN : v));
    return p;
  });
}

/** Build one element from its HeyGeo JSON description. */
export function createElement(
  board: Any,
  el: ElementSpec,
  elMap: Record<string, unknown> = {},
): CreateOutcome {
  const entry = ELEMENT_REGISTRY[el.type];
  if (!entry) return { obj: null, error: `Không nhận kiểu đối tượng "${el.type}"` };

  const legacyCode = hasLegacyCodeParents(el);

  const arityError = checkArity(entry, el);
  if (arityError) return { obj: null, error: arityError };

  let parents: unknown[];
  try {
    parents = resolveParents(el, board, elMap);
  } catch (e) {
    return { obj: null, error: `${el.type}: ${(e as Error).message}` };
  }
  if (parents.some((p, i) => p === undefined && isReferenceParent(el, i))) {
    return { obj: null, error: `${el.type} tham chiếu đối tượng không tồn tại` };
  }

  try {
    const obj = board.create(entry.jxg, parents, {
      id: el.id,
      ...(entry.attrs ?? {}),
      ...(el.attrs ?? {}),
    });
    return { obj, legacyCode };
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
