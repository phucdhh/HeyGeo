/**
 * What a frame's grid looks like.
 *
 * The desktop draws it inside G_coordsys::draw(): major ticks at the first
 * "nice" number at least 120 pixels apart, minor ticks under them — fifths when
 * those still reach 5 pixels, halves when only they do — dotted grey lines
 * between the majors when the grid is shown, rings and radials for a polar frame,
 * and π labels for a trigonometric one. The numbers below are that rule read in
 * board coordinates instead of screen pixels, so dragging a frame's unit point
 * re-spaces its grid the way it re-spaces the desktop's.
 */
import type { GridForm } from './coordsysModel';

export type BoardPoint = [number, number];

/** The board's visible extent, in board coordinates. */
export type Viewbox = [number, number, number, number];

/**
 * How far a frame unit reaches in board numbers: the distance from the origin to
 * its unit point. A square, polar or trigonometric frame has one scale, so its y
 * unit is its x unit; a rectangular one is measured along its own y axis.
 */
export interface FrameGeometry {
  origin: BoardPoint;
  xUnit: number;
  yUnit: number;
}

function distance(a: BoardPoint, b: BoardPoint): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

export function frameGeometry(
  origin: BoardPoint,
  unit: BoardPoint,
  vertical: BoardPoint | null,
  form: GridForm,
): FrameGeometry {
  const xUnit = distance(origin, unit);
  const yUnit = form === 'rectangular' && vertical ? distance(origin, vertical) : xUnit;
  return { origin, xUnit, yUnit };
}

/** A frame with no length in it draws nothing: its unit point sits on the origin. */
export function isMeasurable(geo: FrameGeometry): boolean {
  return geo.xUnit > 1e-9 && geo.yUnit > 1e-9;
}

/** Round up to 1, 2, 5, 10, 20, 50 … — the desktop's niceStep(). */
export function niceStep(raw: number): number {
  if (!(raw > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const m = raw / mag;
  const n = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return n * mag;
}

/**
 * The spacing whose ticks sit at least `minPx` pixels apart, counted in frame
 * units: a frame unit that reaches 200 pixels is numbered every half unit, one
 * that reaches 40 pixels only every 5 units.
 */
export function tickStep(pixelsPerUnit: number, minPx = 120): number {
  if (!(pixelsPerUnit > 0)) return 1;
  return niceStep(minPx / pixelsPerUnit);
}

/**
 * The sub-division drawn under a major tick: fifths when they still reach 5
 * pixels, halves when only they do, and nothing at all below that.
 */
export function minorStep(step: number, pixelsPerUnit: number, minPx = 5): number {
  const px = step * pixelsPerUnit;
  if (px / 5 >= minPx) return step / 5;
  if (px / 2 >= minPx) return step / 2;
  return 0;
}

/** A tick's number, the way the desktop formats it: whole, one or two decimals. */
export function tickLabel(value: number, step: number): string {
  if (step >= 1) return String(Math.round(value));
  return value.toFixed(step >= 0.1 ? 1 : 2);
}

/** The π fractions a trigonometric axis steps through, as the desktop lists them. */
export const TRIG_STEPS = [Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI, 2 * Math.PI];

export function trigStep(pixelsPerUnit: number, minPx = 80): number {
  for (const s of TRIG_STEPS) if (s * pixelsPerUnit >= minPx) return s;
  return 2 * Math.PI;
}

/**
 * The k-th trig tick named in π: 'π/2', '-π', '3π/2'. The fraction is reduced
 * against the step that produced it, so a π/3 ladder never prints '2π/6'.
 */
export function trigLabel(k: number, step: number): string {
  if (k === 0) return '';
  // step as a multiple of π/12: π/6 → 2, π/4 → 3, π/3 → 4, π/2 → 6, π → 12, 2π → 24
  const twelfths = Math.round((step / Math.PI) * 12);
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const g = gcd(Math.abs(k) * twelfths, 12) || 1;
  const n = (Math.abs(k) * twelfths) / g;
  const d = 12 / g;
  const sign = k < 0 ? '-' : '';
  const top = n === 1 ? 'π' : `${n}π`;
  return `${sign}${d === 1 ? top : `${top}/${d}`}`;
}

/** Twelve radials: the desktop's polar grid, every 30°. */
export const POLAR_RAYS = 12;

export interface Tick {
  /** Where the tick crosses its axis, in board coordinates. */
  at: BoardPoint;
  /** The number under a major tick; '' on a minor one, which has none. */
  label: string;
  major: boolean;
}

/** A polar ring: its radius in board units, and the whole-unit number on it. */
export interface Ring {
  radius: number;
  label: string;
}

/**
 * Everything the frame's grid is made of, in board coordinates: ticks along the
 * two axes, the dotted lines that fill the plane between them, and for the polar
 * form the rings and radials it is drawn with instead.
 */
export interface GridPlan {
  form: GridForm;
  /** Frame units between major ticks, and the sub-division under them. */
  xStep: number;
  yStep: number;
  xMinor: number;
  yMinor: number;
  xTicks: Tick[];
  yTicks: Tick[];
  verticals: number[];
  horizontals: number[];
  rings: Ring[];
  /** Radial directions as unit vectors, from the +x axis anticlockwise. */
  rays: BoardPoint[];
}

function emptyPlan(form: GridForm): GridPlan {
  return {
    form, xStep: 1, yStep: 1, xMinor: 0, yMinor: 0,
    xTicks: [], yTicks: [], verticals: [], horizontals: [], rings: [], rays: [],
  };
}

/**
 * The marks along one axis: every minor crossing the visible span holds, the
 * majors among them labelled. Distances are in board coordinates — the pixels
 * were spent choosing them — and `origin` is where the axis is crossed at zero.
 */
function axisTicks(
  origin: number,
  lo: number,
  hi: number,
  major: number,
  minor: number,
  labelOf: (major: number) => string,
): { at: number; label: string; major: boolean }[] {
  const step = minor > 0 ? minor : major;
  if (!(step > 0)) return [];
  const ratio = minor > 0 ? Math.round(major / minor) : 1;
  const span = Math.max(hi - origin, origin - lo);
  const out: { at: number; label: string; major: boolean }[] = [];
  for (let k = 1; k * step <= span; k++) {
    for (const sign of [1, -1]) {
      const at = origin + sign * k * step;
      if (at <= lo || at >= hi) continue;
      const isMajor = ratio === 1 || k % ratio === 0;
      out.push({ at, label: isMajor ? labelOf((sign * k) / ratio) : '', major: isMajor });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * The picture a frame implies. `pixelsPerUnit` is the board's own — how many
 * screen pixels one board unit spans — which is what makes the spacing follow a
 * dragged unit point and a resized window instead of freezing at the document's.
 */
export function planGrid(
  view: Viewbox,
  geo: FrameGeometry,
  form: GridForm,
  pixelsPerUnit: number,
  showGrid: boolean,
): GridPlan {
  if (!isMeasurable(geo) || !(pixelsPerUnit > 0)) return emptyPlan(form);

  const [minX, minY, maxX, maxY] = view;
  const [ox, oy] = geo.origin;
  const plan = emptyPlan(form);

  // Pixels per *frame* unit: the frame's own scale, not the board's.
  const ppuX = pixelsPerUnit * geo.xUnit;
  const ppuY = pixelsPerUnit * geo.yUnit;

  if (form === 'polar') {
    const farthest = Math.max(
      Math.hypot(maxX - ox, maxY - oy),
      Math.hypot(minX - ox, maxY - oy),
      Math.hypot(maxX - ox, minY - oy),
      Math.hypot(minX - ox, minY - oy),
    );
    // Rings at whole frame units, numbered 1, 2, 3 … as the desktop numbers them.
    for (let k = 1; k * geo.xUnit <= farthest; k++) {
      plan.rings.push({ radius: k * geo.xUnit, label: String(k) });
    }
    for (let i = 0; i < POLAR_RAYS; i++) {
      const a = (i * 2 * Math.PI) / POLAR_RAYS;
      plan.rays.push([Math.cos(a), Math.sin(a)]);
    }
    plan.xStep = 1;
    plan.yStep = 1;
    return plan;
  }

  plan.xStep = tickStep(ppuX, 120);
  plan.yStep = tickStep(ppuY, 120);
  plan.xMinor = minorStep(plan.xStep, ppuX);
  plan.yMinor = minorStep(plan.yStep, ppuY);

  // The x ladder: π fractions name a trigonometric axis, plain numbers the rest.
  const trig = form === 'trig';
  const xUnits = trig ? trigStep(ppuX, 80) : plan.xStep;
  // Board distances: how far the board moves from one tick to the next.
  const xMajor = xUnits * geo.xUnit;
  const yMajor = plan.yStep * geo.yUnit;

  for (const t of axisTicks(ox, minX, maxX, xMajor, trig ? 0 : plan.xMinor * geo.xUnit, (k) =>
    trig ? trigLabel(k, xUnits) : tickLabel(k * xUnits, xUnits))) {
    plan.xTicks.push({ at: [t.at, oy], label: t.label, major: t.major });
  }
  for (const t of axisTicks(oy, minY, maxY, yMajor, plan.yMinor * geo.yUnit, (k) =>
    tickLabel(k * plan.yStep, plan.yStep))) {
    plan.yTicks.push({ at: [ox, t.at], label: t.label, major: t.major });
  }

  if (showGrid) {
    for (const t of plan.xTicks) if (t.major) plan.verticals.push(t.at[0]);
    for (const t of plan.yTicks) if (t.major) plan.horizontals.push(t.at[1]);
  }

  return plan;
}

/** The spacing a snapped point lands on: the minor grid when there is one. */
export function snapSteps(plan: GridPlan): { x: number; y: number } {
  return {
    x: plan.xMinor > 0 ? plan.xMinor : plan.xStep,
    y: plan.yMinor > 0 ? plan.yMinor : plan.yStep,
  };
}
/**
 * Graph | Snap Points: a dragged point stops on the grid instead of wherever the
 * mouse was left. A polar frame snaps to its rings and radials, because those
 * are the lines its grid actually draws.
 */
export function snapToGrid(point: BoardPoint, geo: FrameGeometry, plan: GridPlan): BoardPoint {
  const [ox, oy] = geo.origin;
  const [x, y] = point;
  if (!isMeasurable(geo)) return point;

  if (plan.form === 'polar') {
    const dx = x - ox;
    const dy = y - oy;
    const r = Math.hypot(dx, dy);
    const rings = plan.rings.length > 0 ? plan.rings.map((g) => g.radius) : [geo.xUnit];
    let best = rings[0];
    for (const ring of rings) if (Math.abs(ring - r) < Math.abs(best - r)) best = ring;
    const turn = (2 * Math.PI) / POLAR_RAYS;
    const a = Math.round(Math.atan2(dy, dx) / turn) * turn;
    return [ox + best * Math.cos(a), oy + best * Math.sin(a)];
  }

  const steps = snapSteps(plan);
  return [
    ox + Math.round((x - ox) / (steps.x * geo.xUnit)) * steps.x * geo.xUnit,
    oy + Math.round((y - oy) / (steps.y * geo.yUnit)) * steps.y * geo.yUnit,
  ];
}

// ─── The same picture in pixels ──────────────────────────────────────────────

/** A tick reaches this far each side of its axis; a minor one half as much. */
export const TICK_MAJOR_PX = 5;
export const TICK_MINOR_PX = 3;

/**
 * A number of the grid, where it stands on the page and which side of its axis it
 * hangs on: under the x-axis, left of the y-axis, or — for a polar ring — right of
 * the circle, which is where the desktop writes its radii.
 */
export interface InkLabel {
  x: number;
  y: number;
  text: string;
  side: 'under' | 'left' | 'right';
}

/** The grid as SVG: two paths and the numbers between them. */
export interface GridInk {
  /** The dotted lines between the majors, or a polar frame's rings and radials. */
  furniture: string;
  /** A polar frame is drawn with a solid pen; the others rule their grid in dots. */
  solid: boolean;
  ticks: string;
  labels: InkLabel[];
}

/**
 * The plan drawn on the page. `zero` is where the board's (0, 0) lands in pixels
 * and `pixelsPerUnit` how far a board unit reaches, so the picture follows a pan,
 * a zoom and a resized window; the frame's own numbers decide where its axes and
 * their ticks fall.
 */
export function gridInk(
  view: Viewbox,
  geo: FrameGeometry,
  plan: GridPlan,
  zero: BoardPoint,
  pixelsPerUnit: [number, number],
): GridInk {
  const px = (x: number) => zero[0] + x * pixelsPerUnit[0];
  const py = (y: number) => zero[1] - y * pixelsPerUnit[1];
  const n = (v: number) => Math.round(v * 10) / 10;
  const [axisX, axisY] = [px(geo.origin[0]), py(geo.origin[1])];
  const furniture: string[] = [];
  const ticks: string[] = [];
  const labels: InkLabel[] = [];

  if (plan.form === 'polar') {
    for (const ring of plan.rings) {
      const r = ring.radius * pixelsPerUnit[0];
      furniture.push(
        `M${n(axisX + r)},${n(axisY)}` +
        `A${n(r)},${n(r)} 0 1 0 ${n(axisX - r)},${n(axisY)}` +
        `A${n(r)},${n(r)} 0 1 0 ${n(axisX + r)},${n(axisY)}Z`,
      );
      labels.push({ x: n(axisX + r + 2), y: n(axisY), text: ring.label, side: 'right' });
    }
    // Long enough to cross the whole visible page from the origin, whichever way.
    const reach = Math.hypot(view[2] - view[0], view[3] - view[1]) * pixelsPerUnit[0];
    for (const [dx, dy] of plan.rays) {
      furniture.push(
        `M${n(axisX - dx * reach)},${n(axisY + dy * reach)}` +
        `L${n(axisX + dx * reach)},${n(axisY - dy * reach)}`,
      );
    }
    return { furniture: furniture.join(''), solid: true, ticks: '', labels };
  }

  for (const x of plan.verticals) {
    furniture.push(`M${n(px(x))},${n(py(view[1]))}L${n(px(x))},${n(py(view[3]))}`);
  }
  for (const y of plan.horizontals) {
    furniture.push(`M${n(px(view[0]))},${n(py(y))}L${n(px(view[2]))},${n(py(y))}`);
  }
  for (const t of plan.xTicks) {
    const h = t.major ? TICK_MAJOR_PX : TICK_MINOR_PX;
    const at = px(t.at[0]);
    ticks.push(`M${n(at)},${n(axisY - h)}L${n(at)},${n(axisY + h)}`);
    if (t.label) labels.push({ x: n(at), y: n(axisY + h + 2), text: t.label, side: 'under' });
  }
  for (const t of plan.yTicks) {
    const h = t.major ? TICK_MAJOR_PX : TICK_MINOR_PX;
    const at = py(t.at[1]);
    ticks.push(`M${n(axisX - h)},${n(at)}L${n(axisX + h)},${n(at)}`);
    if (t.label) labels.push({ x: n(axisX - h - 2), y: n(at), text: t.label, side: 'left' });
  }
  return { furniture: furniture.join(''), solid: false, ticks: ticks.join(''), labels };
}
