/**
 * A curve the designer typed.
 *
 * Sketchpad keeps a function as the text that was typed and its plot as a child
 * of the coordinate system the plot was made on: drag the frame's unit point and
 * the curve re-scales itself, because the frame — not the page — says where x = 2
 * is. The desktop stores the same pair, a `G_functionDef` (formula, variable,
 * domain) drawn by a `G_functionPlotObject` whose parents are the system and the
 * function.
 *
 * A document cannot hold a closure, so it holds the arithmetic instead: two infix
 * expressions in one variable, the domain in that variable's own numbers, and the
 * frame as the element's parent. What the engine is handed is built from those on
 * every load, so a saved document draws the same curve and the page never runs
 * anything it read from storage.
 */
import { evalExpression, expressionRefs, expressionVariables, type Variable } from './expression';
import { frameGeometry, isMeasurable, type BoardPoint, type FrameGeometry } from './gridModel';

/** The variables the desktop writes a formula in: `x`, and `t` for a curve. */
export type PlotVariable = 'x' | 't';

/** One coordinate of the curve, as the engine asks for it: a number per sample. */
export type CurveSample = (t: number) => number;

/**
 * The curve as stored. A plain plot of f(x) spells its own variable in the x
 * slot; a parametric one puts its two expressions there. `from` and `to` are the
 * desktop's tMin and tMax — the domain in the variable's numbers, not the page's.
 */
export interface PlotSpec {
  x: string;
  y: string;
  variable: PlotVariable;
  from: number;
  to: number;
}

/** The domain the desktop's New Function dialog opens with. */
export const DEFAULT_DOMAIN: [number, number] = [-5, 5];

/** The samples the desktop's plot is drawn from. */
export const PLOT_SAMPLES = 300;

const PLOT_VARIABLES: PlotVariable[] = ['x', 't'];

/** True when a stored attribute really is a curve this app can draw. */
export function isPlotSpec(value: unknown): value is PlotSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.x === 'string' && typeof s.y === 'string'
    && typeof s.from === 'number' && typeof s.to === 'number'
    && typeof s.variable === 'string'
    && PLOT_VARIABLES.includes(s.variable as PlotVariable);
}

/** What Graph | Plot Function makes of a typed f(x). */
export function functionPlot(
  expr: string,
  domain: [number, number] = DEFAULT_DOMAIN,
): PlotSpec {
  return { x: 'x', y: expr, variable: 'x', from: domain[0], to: domain[1] };
}

/** Why this curve cannot be drawn, or null when it can. */
export function plotProblem(spec: PlotSpec): string | null {
  // A `#0` is a number of the page, and a curve reads only its own variable: an
  // operand slot would answer with no number at every sample, which draws as an
  // empty board rather than as a curve the designer can see is missing.
  if (expressionRefs(spec.x).length + expressionRefs(spec.y).length > 0) {
    return `biểu thức lấy số từ trang vẽ, đường cong chỉ có biến ${spec.variable}`;
  }
  const other = [...expressionVariables(spec.x), ...expressionVariables(spec.y)]
    .find((name) => name !== spec.variable);
  if (other) return `biểu thức cần ${other}, đường cong chỉ có biến ${spec.variable}`;
  if (!(spec.from < spec.to)) return 'miền giá trị của đường cong rỗng';
  return null;
}

/**
 * Where the frame's own coordinates land on the board: from its origin, one unit
 * point's distance per unit, y running up the page. The grid is spaced by the
 * same rule, so a curve crosses the x axis at the tick its equation names.
 */
export function frameToBoard(geo: FrameGeometry, at: BoardPoint): BoardPoint {
  return [geo.origin[0] + at[0] * geo.xUnit, geo.origin[1] + at[1] * geo.yUnit];
}

/** A plot holds typed text, so nothing in it may reach for another measurement. */
const NO_OPERAND = (): null => null;

/** The value of the curve's variable at `t` — and no other name's. */
function variableAt(name: PlotVariable, t: number): Variable {
  return (asked) => (asked === name ? t : undefined);
}

/**
 * The board point of the curve at this value of its variable, or null where the
 * expression has no number: 1/x at 0, the square root of a negative. The desktop
 * drops those samples and breaks its polyline; a null here is what the caller
 * passes on so the engine starts a new stroke instead of drawing an asymptote.
 */
export function plotAt(spec: PlotSpec, geo: FrameGeometry, t: number): BoardPoint | null {
  if (!isMeasurable(geo)) return null;
  const at = variableAt(spec.variable, t);
  const u = evalExpression(spec.x, NO_OPERAND, at);
  const v = evalExpression(spec.y, NO_OPERAND, at);
  if (u === null || v === null) return null;
  return frameToBoard(geo, [u, v]);
}

/**
 * The frame the curve is measured against, read from the three points its parent
 * list names — the origin, its unit point and the point that gives the y
 * direction. A welded frame's y point is the unit point turned a quarter turn, so
 * its distance is the x unit and this reads the same geometry the grid is spaced
 * by in every form; a rectangular one is read along its own axis.
 *
 * A plotted point reads it the same way, which is why the three points are the
 * parents of both.
 */
export function frameOfPoints(points: unknown[]): FrameGeometry | null {
  const point = (p: unknown): BoardPoint | null => {
    const live = p as { X?: () => number; Y?: () => number };
    return typeof live?.X === 'function' && typeof live?.Y === 'function'
      ? [live.X(), live.Y()]
      : null;
  };
  const [origin, unit, vertical] = points.map(point);
  if (!origin || !unit || !vertical) return null;
  return frameGeometry(origin, unit, vertical, 'rectangular');
}

/**
 * What the engine is handed for a plot: the curve's two board coordinates as
 * functions of the sample, then the domain in the variable's own numbers. Read
 * from the live points, which is what makes the curve a child of its frame —
 * dragging the unit point re-scales it, as Sketchpad's does. A sample the
 * expression cannot answer becomes NaN, the value the engine breaks its stroke at.
 */
export function plotParents(
  points: unknown[],
  spec: PlotSpec,
): [CurveSample, CurveSample, number, number] {
  const at = (t: number): BoardPoint | null => {
    const geo = frameOfPoints(points);
    return geo === null ? null : plotAt(spec, geo, t);
  };
  return [
    (t) => at(t)?.[0] ?? NaN,
    (t) => at(t)?.[1] ?? NaN,
    spec.from,
    spec.to,
  ];
}
