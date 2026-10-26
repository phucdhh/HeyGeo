/**
 * Reading the pre-descriptor transformed points.
 *
 * Translate, Rotate, Dilate and Reflect used to write their maths into the
 * document as two JavaScript sources — `function(board){var P=…; return P.X()+…}`
 * — which the loader compiled and ran. That is the same code-execution surface
 * out of a data file that legacyMeasure.ts removed for captions, so the four
 * templates our designer wrote are recognised here and rewritten into the
 * declarative `attrs.image` descriptor transforms.ts understands.
 *
 * A transformed point is `parents: [the point copied]` plus `attrs.image`, and a
 * source no rule recognises is left untouched: the loader then reports the
 * element instead of running it.
 */
import type { ElementSpec } from './elementRegistry';
import { isCodeSource } from './legacyMeasure';
import type { ImageOp, ImageSpec } from './transforms';

/** A number as JavaScript's own string interpolation wrote it. */
const NUM = '[-+\\d.eE]+';

interface Parsed {
  op: ImageOp;
  src: string;
  of: string[];
  dx?: number;
  dy?: number;
  angle?: number;
  k?: number;
}

type Rule = { re: RegExp; build: (m: RegExpMatchArray, axis: 'X' | 'Y') => Parsed };

// Each template is anchored end to end and read with either axis letter, so the
// two sources of one point match the same rule.
const RULES: Rule[] = [
  {
    // translate by a marked vector: P + (B - A)
    re: /^function\(board\)\{var P=board\.objects\['([^']+)'\], A=board\.objects\['([^']+)'\], B=board\.objects\['([^']+)'\]; return P\.[XY]\(\)\+\(B\.[XY]\(\)-A\.[XY]\(\)\)\}$/,
    build: (m) => ({ op: 'translate', src: m[1], of: [m[2], m[3]] }),
  },
  {
    // translate by a typed rectangle offset or distance and angle
    re: new RegExp(`^function\\(board\\)\\{var P=board\\.objects\\['([^']+)'\\]; return P\\.[XY]\\(\\)\\+(${NUM})\\}$`),
    build: (m, axis) => ({
      op: 'translate',
      src: m[1],
      of: [],
      ...(axis === 'X' ? { dx: Number(m[2]) } : { dy: Number(m[2]) }),
    }),
  },
  {
    // rotate about a marked centre: C + dx·cos ∓ dy·sin, the X axis reading cos
    // first and the Y axis reading sin first.
    re: new RegExp(`^function\\(board\\)\\{var P=board\\.objects\\['([^']+)'\\], C=board\\.objects\\['([^']+)'\\]; var dx=P\\.[XY]\\(\\)-C\\.[XY]\\(\\), dy=P\\.[XY]\\(\\)-C\\.[XY]\\(\\); return C\\.[XY]\\(\\)\\+dx\\*(${NUM})([+-])dy\\*(${NUM})\\}$`),
    build: (m, axis) => {
      const first = Number(m[3]);
      const sign = m[4];
      const second = Number(m[5]);
      const cos = axis === 'X' ? first : (sign === '+' ? second : -second);
      const sin = axis === 'X' ? (sign === '-' ? second : -second) : first;
      // Full-precision constants, so the recovered angle carries float noise.
      return { op: 'rotate', src: m[1], of: [m[2]], angle: roundAngle((Math.atan2(sin, cos) * 180) / Math.PI) };
    },
  },
  {
    // dilate about a marked centre: C + k·(P - C)
    re: new RegExp(`^function\\(board\\)\\{var P=board\\.objects\\['([^']+)'\\], C=board\\.objects\\['([^']+)'\\]; return C\\.[XY]\\(\\)\\+(${NUM})\\*\\(P\\.[XY]\\(\\)-C\\.[XY]\\(\\)\\)\\}$`),
    build: (m) => ({ op: 'dilate', src: m[1], of: [m[2]], k: Number(m[3]) }),
  },
  {
    // reflect in a marked line: twice the foot of the perpendicular. Only the
    // returned coordinate varies with the axis; the projection is shared.
    re: /^function\(board\)\{var P=board\.objects\['([^']+)'\], L=board\.objects\['([^']+)'\]; var p1=L\.point1, p2=L\.point2; var vx=p2\.X\(\)-p1\.X\(\), vy=p2\.Y\(\)-p1\.Y\(\); var v2=vx\*vx\+vy\*vy; if\(v2<1e-12\)return P\.[XY]\(\); var wx=P\.X\(\)-p1\.X\(\), wy=P\.Y\(\)-p1\.Y\(\); var t=\(wx\*vx\+wy\*vy\)\/v2; return 2\*\(p1\.[XY]\(\)\+t\*v[xy]\)-P\.[XY]\(\)\}$/,
    build: (m) => ({ op: 'reflect', src: m[1], of: [m[2]] }),
  },
];

function roundAngle(deg: number): number {
  return Math.round(deg * 1e6) / 1e6;
}

function parseAxis(source: string, axis: 'X' | 'Y'): Parsed | null {
  for (const rule of RULES) {
    const m = rule.re.exec(source);
    if (m) return rule.build(m, axis);
  }
  return null;
}

/** The numbers one axis contributed, without the undefined keys that would erase the other's. */
function numericOf(p: Parsed): Partial<Parsed> {
  const out: Partial<Parsed> = {};
  for (const key of ['dx', 'dy', 'angle', 'k'] as const) {
    const value = p[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/**
 * Rewrite a legacy transformed point into an `attrs.image` descriptor, or return
 * null when it is not a point, carries no source, or is a source no rule
 * recognises. The original element is left untouched.
 */
export function migrateLegacyTransform(el: ElementSpec): ElementSpec | null {
  if (el.type !== 'point' || el.parents.length !== 2) return null;
  const [x, y] = el.parents;
  if (!isCodeSource(x) || !isCodeSource(y)) return null;

  const px = parseAxis(x, 'X');
  const py = parseAxis(y, 'Y');
  if (!px || !py || px.op !== py.op || px.src !== py.src || px.of.join(',') !== py.of.join(',')) return null;

  const image = completeImage({ ...px, ...numericOf(py) });
  if (!image) return null;

  return { ...el, parents: [px.src], attrs: { ...(el.attrs ?? {}), image } };
}

/** The descriptor is only complete with the numbers and the partners its op needs. */
function completeImage(p: Parsed): ImageSpec | null {
  const image: ImageSpec = { op: p.op, of: p.of };
  if (p.op === 'translate') {
    if (p.of.length === 2) return image;
    if (p.dx === undefined || p.dy === undefined) return null;
    image.dx = p.dx;
    image.dy = p.dy;
  } else if (p.op === 'rotate') {
    if (p.of.length !== 1 || p.angle === undefined) return null;
    image.angle = p.angle;
  } else if (p.op === 'dilate') {
    if (p.of.length !== 1 || p.k === undefined) return null;
    image.k = p.k;
  } else if (p.op !== 'reflect') {
    return null;
  } else if (p.of.length !== 1) {
    return null;
  }
  return image;
}
