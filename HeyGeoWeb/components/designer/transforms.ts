/**
 * Declarative transformation images.
 *
 * Translate, Rotate, Dilate and Reflect all put a copy of a point somewhere
 * that is defined by other elements, so the document has to say *how* the
 * position is built. Until now it said it as JavaScript source, which the loader
 * compiled and ran — the same code-execution surface from stored JSON that
 * measurement.ts removed.
 *
 * The declarative form is one descriptor per image point:
 *   parents = [the point being copied]
 *   attrs.image = { op, of, dx, dy, angle, k }
 * which becomes a pair of closures over the live board, so the image keeps
 * following its source, its centre, its vector or its mirror.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

import { measureValue, type MeasureSpec } from './measurement';

export type ImageOp = 'translate' | 'rotate' | 'dilate' | 'reflect';

/**
 * A dilation factor taken from the sketch instead of typed.
 *
 * Sketchpad lets the designer mark a ratio — two segments, or one measured
 * number — and then dilate by it. The factor is read at draw time, so a copy
 * made this way keeps following the segments or the measurement it was taken
 * from, exactly as the desktop's G_SCALED does with its parents.
 *
 * `segments` is in the order the two were picked and reads second over first,
 * which is the ratio the desktop computes (`parent(3) / parent(2)`).
 */
export type RatioMark =
  | { segments: [string, string] }
  | { slider: string }
  | { measure: MeasureSpec };

export interface ImageSpec {
  op: ImageOp;
  /**
   * The elements the map is taken with, besides the point in parents:
   * translate by a marked vector → [from, to]; rotate and dilate → [centre];
   * reflect → [line or segment]. Empty when the vector is a typed number.
   */
  of: string[];
  /** translate by a fixed vector. */
  dx?: number;
  dy?: number;
  /** rotate, in degrees, counter-clockwise on the board. */
  angle?: number;
  /** dilate factor. */
  k?: number;
  /** dilate by a marked ratio rather than a typed factor. */
  ratioMark?: RatioMark;
}

export function isImageSpec(value: unknown): value is ImageSpec {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.op === 'string' && Array.isArray(v.of);
}

/** The ids an image point hangs off, for the dependency graph. */
export function imageDeps(el: { attrs?: Record<string, unknown> }): string[] {
  const image = el.attrs?.image as ImageSpec | undefined;
  if (!image) return [];
  const ids = [...image.of];
  const mark = image.ratioMark;
  if (mark) {
    if ('segments' in mark) ids.push(...mark.segments);
    else if ('slider' in mark) ids.push(mark.slider);
  }
  return ids;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function live(board: Any, id: string): Any {
  return board?.objects?.[id];
}

/** The two endpoints a mirror line offers, whichever element type was marked. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function axis(o: Any): [Any, Any] | null {
  return o?.point1 && o?.point2 ? [o.point1, o.point2] : null;
}

// ─── Arrow dragging ───────────────────────────────────────────────────────────

/**
 * The map an arrow drag applies to the selection. Selecting is the same in all
 * three modes; only this differs: translate carries the pointer's travel to
 * every point, rotate keeps each point's distance to the centre, dilate keeps
 * its direction. `center` is the marked centre and is only used by the two that
 * pivot on it.
 *
 * This is the one place the arrow maths lives, and it is pure — the drag is
 * measured from the positions frozen when the pointer went down, because the
 * board has already moved the grabbed object by the time the drag is handled.
 */
export function arrowDragMap(
  mode: 'translate' | 'rotate' | 'dilate',
  center: [number, number] | null,
  start: [number, number],
  pointer: [number, number],
): (x: number, y: number) => [number, number] {
  if (mode === 'translate') {
    const dx = pointer[0] - start[0], dy = pointer[1] - start[1];
    return (x, y) => [x + dx, y + dy];
  }
  const [cx, cy] = center ?? [0, 0];
  const dx0 = start[0] - cx, dy0 = start[1] - cy;
  const dx1 = pointer[0] - cx, dy1 = pointer[1] - cy;

  if (mode === 'rotate') {
    const d = Math.atan2(dy1, dx1) - Math.atan2(dy0, dx0);
    const cos = Math.cos(d);
    const sin = Math.sin(d);
    return (x, y) => {
      const ux = x - cx, uy = y - cy;
      return [cx + ux * cos - uy * sin, cy + ux * sin + uy * cos];
    };
  }
  const r0 = Math.hypot(dx0, dy0);
  const k = r0 > 1e-9 ? Math.hypot(dx1, dy1) / r0 : 1;
  return (x, y) => [cx + (x - cx) * k, cy + (y - cy) * k];
}

/**
 * Where the image of `srcId` sits, as closures JSXGraph can call every frame.
 * A missing or broken partner yields the source position, so a half-loaded
 * board never throws the whole element away.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function imageClosures(board: Any, srcId: string, spec: ImageSpec): [() => number, () => number] {
  const src = () => live(board, srcId);
  const read = (id: string): Any => live(board, id);

  const offset = (): [number, number] => {
    if (spec.of.length >= 2) {
      const a = read(spec.of[0]);
      const b = read(spec.of[1]);
      return [b.X() - a.X(), b.Y() - a.Y()];
    }
    return [spec.dx ?? 0, spec.dy ?? 0];
  };

  const number = (fn: () => number, fallback: () => number): (() => number) => () => {
    try {
      const v = fn();
      return Number.isFinite(v) ? v : fallback();
    } catch {
      return fallback();
    }
  };
  const sourceX = () => live(board, srcId)?.X() ?? 0;
  const sourceY = () => live(board, srcId)?.Y() ?? 0;

  switch (spec.op) {
    case 'translate':
      return [
        number(() => src().X() + offset()[0], sourceX),
        number(() => src().Y() + offset()[1], sourceY),
      ];
    case 'rotate': {
      const rad = ((spec.angle ?? 0) * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return [
        number(() => {
          const c = read(spec.of[0]);
          return c.X() + (src().X() - c.X()) * cos - (src().Y() - c.Y()) * sin;
        }, sourceX),
        number(() => {
          const c = read(spec.of[0]);
          return c.Y() + (src().X() - c.X()) * sin + (src().Y() - c.Y()) * cos;
        }, sourceY),
      ];
    }
    case 'dilate': {
      // A ratio that cannot be read leaves the copy on its source, the same
      // way a missing centre does, rather than folding it onto the centre.
      const markedFactor = (): number => {
        const mark = spec.ratioMark;
        if (!mark) return spec.k ?? 1;
        if ('segments' in mark) {
          const span = (o: Any): number => {
            const a = o?.point1, b = o?.point2;
            return a && b ? Math.hypot(b.X() - a.X(), b.Y() - a.Y()) : 0;
          };
          return span(read(mark.segments[1])) / span(read(mark.segments[0]));
        }
        if ('slider' in mark) return Number(read(mark.slider)?.Value?.());
        const v = measureValue(board, mark.measure);
        return v === null ? Number.NaN : v;
      };
      return [
        number(() => {
          const k = markedFactor();
          if (!Number.isFinite(k)) return sourceX();
          const c = read(spec.of[0]);
          return c.X() + k * (src().X() - c.X());
        }, sourceX),
        number(() => {
          const k = markedFactor();
          if (!Number.isFinite(k)) return sourceY();
          const c = read(spec.of[0]);
          return c.Y() + k * (src().Y() - c.Y());
        }, sourceY),
      ];
    }
    case 'reflect': {
      return [
        number(() => {
          const l = axis(read(spec.of[0]));
          if (!l) return src().X();
          const [p1, p2] = l;
          const vx = p2.X() - p1.X();
          const vy = p2.Y() - p1.Y();
          const v2 = vx * vx + vy * vy;
          if (v2 < 1e-12) return src().X();
          const t = ((src().X() - p1.X()) * vx + (src().Y() - p1.Y()) * vy) / v2;
          return 2 * (p1.X() + t * vx) - src().X();
        }, sourceX),
        number(() => {
          const l = axis(read(spec.of[0]));
          if (!l) return src().Y();
          const [p1, p2] = l;
          const vx = p2.X() - p1.X();
          const vy = p2.Y() - p1.Y();
          const v2 = vx * vx + vy * vy;
          if (v2 < 1e-12) return src().Y();
          const t = ((src().X() - p1.X()) * vx + (src().Y() - p1.Y()) * vy) / v2;
          return 2 * (p1.Y() + t * vy) - src().Y();
        }, sourceY),
      ];
    }
    default:
      return [sourceX, sourceY];
  }
}
