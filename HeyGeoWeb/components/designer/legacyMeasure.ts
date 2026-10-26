/**
 * Reading the pre-descriptor measurement JSON.
 *
 * Models saved before measurement.ts exists store captions — and sometimes
 * positions — as JavaScript source strings, which the loader used to eval. This
 * module recognises the exact templates our own designer and the desktop
 * exporter emitted and rewrites them into the declarative `attrs.measure` /
 * `attrs.anchor` descriptors. A source it cannot recognise is left alone, so the
 * loader reports that element as unloadable instead of executing it.
 *
 * The migration happens in memory; the rewritten element is what a save writes
 * back, so a model upgrades itself the first time it is edited.
 */
import type { ElementSpec } from './elementRegistry';
import type { AnchorSpec, MeasureSpec, MeasureOp } from './measurement';

const CODE_SOURCE = /^\s*function\s*[({]/;

/** True when a stored parent is executable source rather than data. */
export const isCodeSource = (p: unknown): p is string =>
  typeof p === 'string' && CODE_SOURCE.test(p);

/** The element ids a source reads, in order of first appearance. */
export function sourceIds(source: string): string[] {
  const ids: string[] = [];
  const re = /\b(?:board\.objects|bo)\['([^']+)'\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    if (!ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

// ─── Captions ────────────────────────────────────────────────────────────────
// Every rule is a template some version of this app wrote, so the descriptor it
// produces renders exactly what the source used to.
type CaptionRule = { re: RegExp; build: (m: RegExpMatchArray, source: string) => MeasureSpec | null };

const CAPTION_RULES: CaptionRule[] = [
  {
    re: /return '([^']*) = '\+Math\.sqrt\(Math\.pow\(board\.objects\['([^']+)'\]\.X\(\)-board\.objects\['([^']+)'\]\.X\(\),2\)\+Math\.pow\(board\.objects\['([^']+)'\]\.Y\(\)-board\.objects\['([^']+)'\]\.Y\(\),2\)\)\.toFixed\((\d+)\)/,
    build: (m) => ({ op: 'distance', args: [m[2], m[3]], label: m[1], precision: Number(m[6]) }),
  },
  {
    re: /return '([^']*) = '\+\(2\*Math\.PI\*board\.objects\['([^']+)'\]\.Radius\(\)\)\.toFixed\((\d+)\)/,
    build: (m) => ({ op: 'circumference', args: [m[2]], label: m[1], precision: Number(m[3]) }),
  },
  {
    re: /return '([^']*) = '\+board\.objects\['([^']+)'\]\.Radius\(\)\.toFixed\((\d+)\)/,
    build: (m) => ({ op: 'radius', args: [m[2]], label: m[1], precision: Number(m[3]) }),
  },
  {
    re: /var p=board\.objects\['([^']+)'\]; return '([^']*) = '\+Math\.abs\(p\.Area\?p\.Area\(\):0\)\.toFixed\((\d+)\)/,
    build: (m) => ({ op: 'area', args: [m[1]], label: m[2], precision: Number(m[3]) }),
  },
  {
    re: /var p=board\.objects\['([^']+)'\]; return '([^']*) = '\+\(p\.Perimeter\?p\.Perimeter\(\)\.toFixed\((\d+)\):'…'\)/,
    build: (m) => ({ op: 'perimeter', args: [m[1]], label: m[2], precision: Number(m[3]) }),
  },
  {
    re: /var pt=board\.objects\['([^']+)'\]; return '([^']*): \('\+pt\.X\(\)\.toFixed\((\d+)\)\+', '\+pt\.Y\(\)\.toFixed\(\d+\)\+'\)/,
    build: (m) => ({ op: 'coordinates', args: [m[1]], label: m[2], precision: Number(m[3]) }),
  },
  {
    re: /return '([^']*) = '\+board\.objects\['([^']+)'\]\.([XY])\(\)\.toFixed\((\d+)\)/,
    build: (m) => ({
      op: m[3] === 'X' ? 'abscissa' : 'ordinate',
      args: [m[2]],
      label: m[1],
      precision: Number(m[4]),
    }),
  },
  {
    re: /var l=board\.objects\['([^']+)'\]; var dx=l\.point2\.X\(\)-l\.point1\.X\(\); if\(Math\.abs\(dx\)<1e-6\)return '[^']*'; return '([^']*) = '\+\(\(l\.point2\.Y\(\)-l\.point1\.Y\(\)\)\/dx\)\.toFixed\((\d+)\)/,
    build: (m) => ({ op: 'slope', args: [m[1]], label: m[2], precision: Number(m[3]) }),
  },
  {
    re: /var l=board\.objects\['([^']+)'\]; var p1=l\.point1,p2=l\.point2/,
    build: (m) => ({ op: 'equationLine', args: [m[1]], precision: 1 }),
  },
  {
    re: /var circ=board\.objects\['([^']+)'\]; var c=circ\.center\|\|circ\.point1/,
    build: (m) => ({ op: 'equationCircle', args: [m[1]], precision: 1 }),
  },
  {
    // desktop coordinates measured in a document coordinate system
    re: /var sf=Math\.sqrt[\s\S]*?return '([^']*) = \('\+x\.toFixed\((\d+)\)\+'; '\+y\.toFixed\(\d+\)\+'\)'/,
    build: (m, source) => {
      const ids = sourceIds(source);
      if (ids.length !== 3) return null;
      return { op: 'relativeCoordinates', args: ids, label: m[1], precision: Number(m[2]) };
    },
  },
];

/** `label = <numeric expression>.toFixed(precision)<unit>` — the desktop caption wrapper. */
const DESKTOP_CAPTION = /return '([^']*) = '\s*\+([\s\S]*?)\.toFixed\((\d+)\)(?:\s*\+\s*'([^']*)')?\s*;?\s*\}\s*$/;

/** Which measurement a desktop numeric expression computes, from its fingerprint. */
function desktopOp(source: string): MeasureOp | null {
  if (/Math\.atan2\(-dy0,dx0\)/.test(source)) return 'angle';
  if (/l1<1e-12\?0:l0\/l1/.test(source)) return 'ratio';
  if (/Math\.abs\(dx\)<1e-12/.test(source)) return 'slope';
  if (/nx=px\+t\*ddx/.test(source)) return 'pointSegmentDistance';
  if (/\.Radius\(\)\*2\*Math\.PI/.test(source)) return 'circumference';
  if (/\.Radius\(\)\*/.test(source)) return 'radius';
  if (/seg\.point2\.X\(\)-seg\.point1\.X\(\)/.test(source)) return 'length';
  if (/Math\.sqrt\(dx\*dx\+dy\*dy\)/.test(source)) return 'distance';
  return null;
}

/** Measures taken against a document coordinate system rather than the board. */
function relativeOp(source: string, label: string): MeasureOp | null {
  if (!/var sf=Math\.sqrt/.test(source)) return null;
  if (/x1=/.test(source)) return 'relativeDistance';
  if (label.startsWith('x<sub>')) return 'relativeAbscissa';
  if (label.startsWith('y<sub>')) return 'relativeOrdinate';
  return 'relativeCoordinates';
}

/** The centimetres-per-JSXGraph-unit the export multiplied into its value. */
function desktopScale(source: string): number | undefined {
  const m = /\*([0-9]*\.?[0-9]+)\s*;\}\)\(\)/.exec(source);
  if (!m) return undefined;
  const n = Number(m[1]);
  return n > 0 && n !== 1 ? n : undefined;
}

function desktopMeasure(source: string): MeasureSpec | null {
  const m = DESKTOP_CAPTION.exec(source);
  if (!m) return null;
  const [, label, , precision, unit] = m;
  // The ids and the fingerprint are read from the whole source: a coordinate
  // measure computes its value in local variables before the caption uses them.
  const ids = sourceIds(source);
  const p = Number(precision);
  const op = relativeOp(source, label) ?? desktopOp(source);
  if (!op) return null;
  const arity = ARITY[op];
  if (arity !== undefined && ids.length !== arity) return null;
  const scale = desktopScale(source);
  return { op, args: ids, label, precision: p, unit, ...(scale ? { scale } : {}) };
}

/** Parent counts the desktop templates are known to write. */
const ARITY: Partial<Record<MeasureOp, number>> = {
  distance: 2,
  pointSegmentDistance: 2,
  length: 1,
  radius: 1,
  circumference: 1,
  angle: 3,
  ratio: 2,
  slope: 1,
  relativeCoordinates: 3,
  relativeAbscissa: 3,
  relativeOrdinate: 3,
  relativeDistance: 4,
};

function matchCaption(source: string): MeasureSpec | null {
  for (const rule of CAPTION_RULES) {
    const m = rule.re.exec(source);
    if (m) {
      const spec = rule.build(m, source);
      if (spec) return spec;
    }
  }
  return desktopMeasure(source);
}

// ─── Anchors ─────────────────────────────────────────────────────────────────
// The web designer anchored captions to the geometry with two more sources.
type AnchorRule = { re: RegExp; of: (m: RegExpMatchArray) => string[]; offset?: (m: RegExpMatchArray) => number; radiusFactor?: (m: RegExpMatchArray) => number };

const ANCHOR_RULES: AnchorRule[] = [
  {
    re: /\(board\.objects\['([^']+)'\]\.[XY]\(\)\+board\.objects\['([^']+)'\]\.[XY]\(\)\)\/2(?:\+(-?[\d.]+))?/,
    of: (m) => [m[1], m[2]],
    offset: (m) => Number(m[3] ?? 0),
  },
  {
    re: /var c=board\.objects\['([^']+)'\]; return c\.center\.[XY]\(\)\+c\.Radius\(\)\*([\d.]+)(?:\+(-?[\d.]+))?/,
    of: (m) => [m[1]],
    offset: (m) => Number(m[3] ?? 0),
    radiusFactor: (m) => Number(m[2]),
  },
  {
    re: /var l=board\.objects\['([^']+)'\]; return \(l\.point1\.[XY]\(\)\+l\.point2\.[XY]\(\)\)\/2(?:\+(-?[\d.]+))?/,
    of: (m) => [m[1]],
    offset: (m) => Number(m[3] ?? 0),
  },
  {
    re: /var p=board\.objects\['([^']+)'\]; return p\.vertices\.reduce\(function\(s,v\)\{return s\+v\.[XY]\(\)\},0\)\/p\.vertices\.length/,
    of: (m) => [m[1]],
  },
  {
    re: /board\.objects\['([^']+)'\]\.center\.[XY]\(\)(?:\+(-?[\d.]+))?/,
    of: (m) => [m[1]],
    offset: (m) => Number(m[2] ?? 0),
  },
  {
    re: /return board\.objects\['([^']+)'\]\.[XY]\(\)(?:([-+])\s*([\d.]+))?/,
    of: (m) => [m[1]],
    offset: (m) => (m[2] === '-' ? -Number(m[3]) : Number(m[3] ?? 0)),
  },
  {
    re: /var c=board\.objects\['([^']+)'\]; return c\.[XY]\(\)(?:([-+])\s*([\d.]+))?/,
    of: (m) => [m[1]],
    offset: (m) => (m[2] === '-' ? -Number(m[3]) : Number(m[3] ?? 0)),
  },
];

function matchAxis(source: string): { of: string[]; offset: number; radiusFactor?: number } | null {
  for (const rule of ANCHOR_RULES) {
    const m = rule.re.exec(source);
    if (m) {
      return {
        of: rule.of(m),
        offset: rule.offset?.(m) ?? 0,
        radiusFactor: rule.radiusFactor?.(m),
      };
    }
  }
  return null;
}

/** The two position sources become one anchor when they agree on their parents. */
function matchAnchor(x: string, y: string): AnchorSpec | null {
  const ax = matchAxis(x);
  const ay = matchAxis(y);
  if (!ax || !ay || ax.of.join(',') !== ay.of.join(',')) return null;
  const anchor: AnchorSpec = { of: ax.of, dx: ax.offset, dy: ay.offset };
  if (ax.radiusFactor) anchor.radiusFactor = ax.radiusFactor;
  return anchor;
}

// ─── Public migration ────────────────────────────────────────────────────────
/**
 * Rewrite a legacy measurement text element into descriptors, or return null
 * when it is not a text element, carries no source, or is a source no rule
 * recognises. The original element is left untouched.
 */
export function migrateLegacyMeasure(el: ElementSpec): ElementSpec | null {
  if (el.type !== 'text') return null;
  const [x, y, caption] = el.parents;
  if (!isCodeSource(caption)) return null;

  const measure = matchCaption(caption);
  if (!measure) return null;

  let anchor: AnchorSpec | null = null;
  if (isCodeSource(x) || isCodeSource(y)) {
    if (!isCodeSource(x) || !isCodeSource(y)) return null;
    anchor = matchAnchor(x, y);
    if (!anchor) return null;
  }

  const attrs: Record<string, unknown> = { ...(el.attrs ?? {}) };
  attrs.measure = measure;
  if (anchor) attrs.anchor = anchor;

  return {
    ...el,
    parents: [isCodeSource(x) ? 0 : x, isCodeSource(y) ? 0 : y, measure.label ?? ''],
    attrs,
  };
}
