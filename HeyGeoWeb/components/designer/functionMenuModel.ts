/**
 * The Graph menu's two function rows.
 *
 * Sketchpad keeps a function twice over: the definition is text on the page —
 * `f(x) = x^2-2`, where the designer can read it back — and the plot is the curve
 * drawn through the marked frame from that definition. The desktop does the same:
 * graphNewFunction writes a G_functionDef into a label object placed under the one
 * before it, and graphPlotFunction builds a plot whose parents are the coordinate
 * system and that function.
 *
 * This module is the part that needs no board: how a definition is named, what its
 * caption says, which row of the left margin the next one takes, and which of the
 * two rows the current selection answers to.
 */
import { hasCoordsys } from './coordsysModel';
import type { PlotSpec, PlotVariable } from './plotModel';
import type { HeyGeoElement } from './designTypes';

/** A function the designer typed: its formula, the variable it is in, its domain. */
export interface FunctionSpec {
  expr: string;
  variable: PlotVariable;
  from: number;
  to: number;
}

const PLOT_VARIABLES: PlotVariable[] = ['x', 't'];

/** True when a stored attribute really is a definition this app can plot. */
export function isFunctionSpec(value: unknown): value is FunctionSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.expr === 'string'
    && typeof s.from === 'number' && typeof s.to === 'number'
    && PLOT_VARIABLES.includes(s.variable as PlotVariable);
}

/** The function an element defines, or null when it is only a caption. */
export function functionOf(el: HeyGeoElement): FunctionSpec | null {
  const spec = el.attrs?.func;
  return isFunctionSpec(spec) ? spec : null;
}

/** Sketchpad's names for the functions of a sketch, in the order it hands them out. */
const FUNCTION_NAMES = ['f', 'g', 'h'];

/** `f` for the first definition of a page, then `g`, `h`, and numbered after those. */
export function nextFunctionName(elements: HeyGeoElement[]): string {
  const n = elements.filter((e) => functionOf(e) !== null).length;
  if (n < FUNCTION_NAMES.length) return FUNCTION_NAMES[n];
  return `${FUNCTION_NAMES[n % FUNCTION_NAMES.length]}${Math.floor(n / FUNCTION_NAMES.length)}`;
}

/** The caption text, which is the desktop's "f(x) = expr". */
export function functionCaption(name: string, spec: FunctionSpec): string {
  return `${name}(${spec.variable}) = ${spec.expr}`;
}

/**
 * The curve a definition becomes: its first coordinate is the variable itself, so
 * plotting f(x) draws the points (x, f(x)) in the frame's own numbers.
 */
export function plotOfFunction(spec: FunctionSpec): PlotSpec {
  return {
    x: spec.variable, y: spec.expr, variable: spec.variable,
    from: spec.from, to: spec.to,
  };
}

// ─── The left margin ──────────────────────────────────────────────────────────

/**
 * Where the page keeps the things that only show a number: the parameters of the
 * Number menu and the definitions of the Graph menu. The desktop drops the first
 * in the upper-left corner of the view and each later one under the last, so they
 * read as one column.
 */
export const COLUMN_X = -7;
const COLUMN_TOP = 6.5;
const COLUMN_ROW = 1.5;

/** How many rows the margin already holds, counting from the top. */
export function columnRows(elements: HeyGeoElement[]): number {
  return elements.filter((e) => e.type === 'slider' || functionOf(e) !== null).length;
}

/** Where the next number or definition lands: one row under everything placed. */
export function marginRow(elements: HeyGeoElement[]): number {
  return COLUMN_TOP - columnRows(elements) * COLUMN_ROW;
}

/** Where Graph | New Function… puts its caption. */
export function functionPlace(elements: HeyGeoElement[]): [number, number] {
  return [COLUMN_X, marginRow(elements)];
}

// ─── The two rows ─────────────────────────────────────────────────────────────

export interface FunctionRows {
  /** Graph | New Function… — the desktop's canGraphNewFunction: always live. */
  canNew: boolean;
  /** Graph | Plot Function… — needs a definition picked and a frame to plot on. */
  canPlot: boolean;
  /** The definition Plot Function would draw, or null when it has none. */
  target: string | null;
}

/**
 * The one definition Graph | Plot Function… would draw: exactly one picked, and a
 * frame for it to be measured against. Half of either and the row is dead, which
 * is the desktop's canGraphPlotFunction read as data instead of as a menu rule.
 */
export function plotTarget(elements: HeyGeoElement[], selection: string[]): string | null {
  if (selection.length !== 1) return null;
  const el = elements.find((e) => e.id === selection[0]);
  if (!el || functionOf(el) === null) return null;
  return hasCoordsys(elements) ? el.id : null;
}

export function functionRows(elements: HeyGeoElement[], selection: string[]): FunctionRows {
  const target = plotTarget(elements, selection);
  return { canNew: true, canPlot: target !== null, target };
}
