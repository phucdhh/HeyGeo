/**
 * lineLocusModel – Construct | Locus… when the traced object is a straight one.
 *
 * Sketchpad draws the *family* of lines a driver sweeps out, not one curve, so
 * this project draws the same thing as a single JSXGraph curve whose samples are
 * pairs of far points trimmed against the board, with a NaN between pairs: the
 * renderer lifts the pen on a NaN, which is what turns one curve into a bundle of
 * separate lines.
 *
 * The family is sampled by moving the driver along its path and asking the board
 * for the line's new stdform each time. That is exactly the geometry the designer
 * built, with no case analysis for perpendiculars, parallels or bisectors.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

export const LINE_LOCUS_TYPE = 'linelocus';

/** How many positions of the driver one locus shows. */
export const LOCUS_SAMPLES = 40;

// JXG.COORDS_BY_USER, and the elementClass numbers this file branches on.
const COORDS_BY_USER = 1;
const CLASS_LINE = 2;
const CLASS_CIRCLE = 3;
const CLASS_CURVE = 4;

/** The point the driver takes at fraction `t` of its own path. */
export function gliderPointAt(glider: Any, t: number): [number, number] | null {
  const slide = glider?.slideObject;
  if (!slide) return null;
  try {
    if (slide.elementClass === CLASS_CIRCLE) {
      const a = 2 * Math.PI * t;
      return [
        slide.center.X() + slide.Radius() * Math.cos(a),
        slide.center.Y() + slide.Radius() * Math.sin(a),
      ];
    }
    if (slide.elementClass === CLASS_CURVE) {
      const x = slide.minX() + t * (slide.maxX() - slide.minX());
      return [slide.X(x), slide.Y(x)];
    }
    if (slide.elementClass === CLASS_LINE) {
      const p1 = slide.point1;
      const p2 = slide.point2;
      const dx = p2.X() - p1.X();
      const dy = p2.Y() - p1.Y();
      // A driver on a segment walks past the segment, the way a slider does.
      return [p1.X() + (2 * t - 0.5) * dx, p1.Y() + (2 * t - 0.5) * dy];
    }
  } catch {
    // the slide object may be mid-rebuild
  }
  return null;
}

/**
 * Two far points of a straight object, `span` user units either side of its foot
 * of perpendicular from the origin. `span` is what trims the line to the page.
 */
export function straightEnds(obj: Any, span: number): [[number, number], [number, number]] | null {
  const sf = obj?.stdform as number[] | undefined;
  if (!sf || sf.length < 3) return null;
  const [c, a, b] = sf;
  const n2 = a * a + b * b;
  if (n2 < 1e-20) return null;
  const px = (-a * c) / n2;
  const py = (-b * c) / n2;
  const n = Math.sqrt(n2);
  const dx = b / n;
  const dy = -a / n;
  return [
    [px - dx * span, py - dy * span],
    [px + dx * span, py + dy * span],
  ];
}

/** Half the diagonal of what the board shows: long enough to reach every edge. */
export function locusSpan(board: Any): number {
  try {
    const bb = board.getBoundingBox() as number[];
    const span = Math.hypot(bb[2] - bb[0], bb[1] - bb[3]) * 2;
    // a board with no layout yet answers NaN, which would blank the whole family
    return Number.isFinite(span) && span > 1 ? span : 20;
  } catch {
    return 20;
  }
}

/**
 * The family of lines the straight object takes as the driver runs its path, as
 * a flat table of points with a NaN pair between samples. The driver is put back
 * where it was before this returns, and only coordinates are refreshed on the
 * way — nothing is drawn, so sampling a drag does not redraw the page 40 times.
 */
export function sampleLineLocus(
  board: Any,
  glider: Any,
  line: Any,
  samples: number,
  span: number,
  stride = 1,
): number[][] {
  const table: number[][] = [];
  const saved = [glider.coords.usrCoords[1], glider.coords.usrCoords[2]];
  const step = samples > 1 ? 1 / (samples - 1) : 0;
  const refresh = () => board.prepareUpdate().updateElements().updateConditions();
  try {
    for (let i = 0; i < samples; i++) {
      // A coarse pass during a drag keeps the table the length the curve expects,
      // leaving the skipped strokes as gaps, and is finished on release.
      if (i % stride !== 0) {
        table.push([NaN, NaN], [NaN, NaN], [NaN, NaN]);
        continue;
      }
      const p = gliderPointAt(glider, i * step);
      if (!p) break;
      glider.setPositionDirectly(COORDS_BY_USER, p);
      refresh();
      const ends = straightEnds(line, span);
      if (!ends) break;
      table.push(ends[0], ends[1], [NaN, NaN]);
    }
  } catch {
    // half a family is still worth drawing
  } finally {
    try {
      glider.setPositionDirectly(COORDS_BY_USER, saved);
      refresh();
    } catch {
      // the driver may be gone
    }
  }
  return table;
}

/** The sample count a document asks for, kept inside something a page can draw. */
export function locusSamples(attrs: Record<string, unknown> | undefined): number {
  const n = attrs?.samples;
  return typeof n === 'number' && Number.isFinite(n)
    ? Math.max(2, Math.min(400, Math.round(n)))
    : LOCUS_SAMPLES;
}

/**
 * What a family of lines depends on: where the driver stands and where the line
 * is now. Equal signatures mean the last table is still the right one, which is
 * what keeps the 60 fps loop from re-sampling a page that has not moved.
 */
function signatureOf(glider: Any, line: Any): string {
  const round = (v: unknown) => (typeof v === 'number' ? v.toFixed(6) : String(v));
  const c = (glider?.coords?.usrCoords ?? []) as number[];
  const s = (line?.stdform ?? []) as number[];
  return `${round(c[1])},${round(c[2])}|${round(s[0])},${round(s[1])},${round(s[2])}`;
}

/**
 * Hand a curve a new table length. Its parameter runs from 0 to the table's last
 * index, so a longer family needs both a wider parameter range and as many
 * points — otherwise the extra strokes are never drawn.
 */
export function setLocusLength(obj: Any, n: number): void {
  if (!obj || n < 1) return;
  obj.minX = () => 0;
  obj.maxX = () => n;
  obj.setAttribute?.({ numberPointsHigh: n, numberPointsLow: n });
  obj.numberPoints = n;
  obj.needsUpdate = true;
}

/**
 * Recompute every family on the board, in place. The curve keeps its identity, so
 * a drag does not disturb the selection or the undo history. `stride` above 1
 * draws a coarser bundle, which is what a drag uses to keep up; such a pass
 * leaves the signature alone so the next full one runs.
 */
export function refreshLineLocuses(board: Any, stride = 1): boolean {
  let changed = false;
  const span = locusSpan(board);
  for (const id in board?.objects ?? {}) {
    const obj = board.objects[id];
    const info = obj?._locus;
    if (!info) continue;
    const sig = signatureOf(info.driver, info.line);
    if (stride === 1) {
      if (sig === info.sig) continue;
      info.sig = sig;
    }
    info.table = sampleLineLocus(board, info.driver, info.line, info.samples, span, stride);
    setLocusLength(obj, info.table.length);
    changed = true;
  }
  return changed;
}

/** Where a family's points come from: the live driver and the line it moves. */
export function locusInfoOf(obj: Any): { driver: Any; line: Any } | null {
  const info = obj?._locus;
  return info ? { driver: info.driver, line: info.line } : null;
}
