/**
 * A point plotted onto the frame instead of dragged onto the page.
 *
 * Sketchpad makes a point from numbers the same dependency a curve is: it is
 * measured on the coordinate system it was plotted onto and reads the numbers it
 * was plotted from, so dragging an axis or sliding a parameter carries the point
 * along. The desktop places one once — a free point at `mathToScreen(x, y)` — and
 * from then on it belongs to the page. Keeping Sketchpad's dependency here costs
 * one more descriptor in the document and buys the behaviour the whole app is
 * built to have: a point that stops following its own measurements is not a
 * plotted point, it is a point that was plotted and then forgot.
 *
 *   point.parents     = [origin, unit, y-direction]   the frame it is measured on
 *   point.attrs.plotAt = { shape, x, y, args }        its two numbers, as infix text
 *
 * As everywhere else in this folder, the text is data and never code: the two
 * fields run through the whitelisted evaluator of expression.ts, the one a
 * Calculate caption already uses, and `args` says which number of the page each
 * `#i` reads.
 */
import { evalExpression, expressionRefs, expressionVariables } from './expression';
import { isMeasurable } from './gridModel';
import { numberSources, type NumberSource } from './numberMenuModel';
import { frameOfPoints, frameToBoard } from './plotModel';
import { framePoints } from './coordsysModel';
import type { HeyGeoElement } from './designTypes';

/** The two ways Sketchpad writes a point's place: as axes, or as a radius and a turn. */
export type PlotShape = 'rectangular' | 'polar';

const PLOT_SHAPES: PlotShape[] = ['rectangular', 'polar'];

/**
 * The point as stored. A rectangular one is x and y in the frame's units; a polar
 * one is its radius in those units and its turn in degrees, the angle unit the
 * desktop measures and prints angles in.
 */
export interface PlotPointSpec {
  shape: PlotShape;
  x: string;
  y: string;
  /** The numbers the two fields read: `#0` is args[0]. */
  args: string[];
}

/** What a number of the page is worth where the point is being placed. */
export type NumberAt = (id: string) => number | null;

/**
 * An element as the document holds it, or as the registry is about to build it —
 * the descriptor lives in attrs either way and nothing here needs the rest.
 */
type ElementLike = { type?: string; attrs?: Record<string, unknown> | null };

/** True when a stored attribute really is a plotted point this app can place. */
export function isPlotPointSpec(value: unknown): value is PlotPointSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return PLOT_SHAPES.includes(s.shape as PlotShape)
    && typeof s.x === 'string' && typeof s.y === 'string'
    && Array.isArray(s.args) && s.args.every((a) => typeof a === 'string');
}

/** The point an element plots, or null when it is an ordinary point. */
export function plotPointOf(el: ElementLike): PlotPointSpec | null {
  const spec = el.attrs?.plotAt;
  return el.type === 'point' && isPlotPointSpec(spec) ? spec : null;
}

/** The numbers a plotted point reads, for the dependency graph and cascade delete. */
export function plotPointDeps(el: ElementLike): string[] {
  return plotPointOf(el)?.args ?? [];
}

/**
 * The two fields' operands, renumbered from `#0` with the numbers they no longer
 * read dropped: a `#1` the designer deleted must not stay a dependency of the
 * point, which is the tidy-up a Calculate caption gets from the same rule.
 */
export function prunePlotPoint(spec: PlotPointSpec): PlotPointSpec {
  const used: number[] = [];
  for (const i of [...expressionRefs(spec.x), ...expressionRefs(spec.y)]) {
    if (spec.args[i] !== undefined && !used.includes(i)) used.push(i);
  }
  const slots = new Map(used.map((i, n) => [i, n]));
  const rewrite = (expr: string): string =>
    expr.replace(/#(\d+)/g, (whole, i: string) => {
      const n = slots.get(Number(i));
      return n === undefined ? whole : `#${n}`;
    });
  return { ...spec, x: rewrite(spec.x), y: rewrite(spec.y), args: used.map((i) => spec.args[i]) };
}

/** Why this point has no place, or null when its two fields answer. */
export function plotPointProblem(spec: PlotPointSpec): string | null {
  if (!spec.x.trim() || !spec.y.trim()) return 'điểm cần đủ hai tọa độ';
  const outOfRange = [...expressionRefs(spec.x), ...expressionRefs(spec.y)]
    .find((i) => spec.args[i] === undefined);
  if (outOfRange !== undefined) {
    return `biểu thức lấy số thứ ${outOfRange + 1}, trang vẽ mới có ${spec.args.length} số cho điểm này`;
  }
  const named = [...expressionVariables(spec.x), ...expressionVariables(spec.y)][0];
  if (named) return `điểm vẽ chỉ đọc số của trang vẽ, biểu thức cần ${named}`;
  return null;
}

/**
 * The point's place in the frame's own numbers, or null where one of the two
 * fields has no number for it: a missing operand, a square root of a negative.
 */
export function plotPointCoords(
  spec: PlotPointSpec,
  numberAt: NumberAt,
): [number, number] | null {
  const operand = (i: number): number | null => {
    const id = spec.args[i];
    return id === undefined ? null : numberAt(id);
  };
  const u = evalExpression(spec.x, operand);
  const v = evalExpression(spec.y, operand);
  if (u === null || v === null) return null;
  return spec.shape === 'polar'
    ? [u * Math.cos((v * Math.PI) / 180), u * Math.sin((v * Math.PI) / 180)]
    : [u, v];
}

/**
 * What the engine is handed for a plotted point: its board coordinates as
 * functions of no argument, read from the frame's three live points and the
 * numbers of the page. JSXGraph treats a point built that way as a dependent one
 * — it follows what it reads and cannot be dragged off them, which is how
 * Sketchpad's plotted point behaves. A field with no number leaves the point with
 * no place, and NaN is the value the engine hides an object at.
 */
export function plotPointParents(
  points: unknown[],
  spec: PlotPointSpec,
  numberAt: NumberAt,
): [() => number, () => number] {
  const at = (): [number, number] | null => {
    const geo = frameOfPoints(points);
    if (geo === null || !isMeasurable(geo)) return null;
    const coords = plotPointCoords(spec, numberAt);
    return coords === null ? null : frameToBoard(geo, coords);
  };
  return [() => at()?.[0] ?? NaN, () => at()?.[1] ?? NaN];
}

// ─── What the row does with the selection ─────────────────────────────────────

/**
 * The point the two numbers the designer picked make: Sketchpad plots them
 * straight onto the frame, the way the desktop's graphPlotAsXY reads
 * selectedRefs[0] as x and selectedRefs[1] as y.
 */
export function plotPair(sources: NumberSource[], selection: string[]): PlotPointSpec | null {
  if (selection.length !== 2) return null;
  if (!selection.every((id) => sources.some((s) => s.id === id))) return null;
  return { shape: 'rectangular', x: '#0', y: '#1', args: [...selection] };
}

/**
 * What the Plot Point dialog opens with. A number picked before asking is the
 * first field's reading, so picking a length and plotting it puts the point on
 * the x axis rather than leaving the designer to type the operand in.
 */
export function plotPointSeed(sources: NumberSource[], selection: string[]): PlotPointSpec {
  const picked = selection.filter((id) => sources.some((s) => s.id === id));
  return {
    shape: 'rectangular',
    x: picked.length > 0 ? '#0' : '',
    y: picked.length > 1 ? '#1' : '',
    args: picked.slice(0, 2),
  };
}

export interface PlotPointRows {
  /** The desktop's canGraphPlotAsXY: two numbers picked, and a frame to place them on. */
  canPlotPair: boolean;
  /** The row is live whenever there is a frame for a typed point to be measured on. */
  canOpen: boolean;
}

export function plotPointRows(elements: HeyGeoElement[], selection: string[]): PlotPointRows {
  const canOpen = framePoints(elements) !== null;
  return {
    canPlotPair: canOpen && plotPair(numberSources(elements), selection) !== null,
    canOpen,
  };
}
