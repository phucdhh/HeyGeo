/**
 * Graph | Plot Value on Path — a point that a number puts on a path.
 *
 * Sketchpad reads a path by a reading of its own: a value between 0 and 1 along
 * a segment, a distance along a line or a ray, a whole turn round a circle. The
 * point is a glider of the path, so it stays on whatever the path becomes, and
 * it goes on reading the number it was plotted from — the document keeps the
 * reading as infix text over the ids of the numbers, which is the same shippable
 * form a plotted point's coordinates take.
 *
 * With no path picked the row is the older Plot Value on Axis, which places the
 * number on the marked frame's x axis (see plotPointModel).
 */
import { evalExpression } from './expression';
import type { GlideSpec } from './elementRegistry';
import { numberSources } from './numberMenuModel';
import type { HeyGeoElement } from './designTypes';

export type ValuePathKind = 'segment' | 'line' | 'ray' | 'circle';

const PATH_KINDS: ValuePathKind[] = ['segment', 'line', 'ray', 'circle'];

/** An element a value can be plotted along, named for the dialog's list. */
export interface ValuePath {
  id: string;
  kind: ValuePathKind;
  label: string;
}

const PATH_WORDS: Record<ValuePathKind, string> = {
  segment: 'Đoạn',
  line: 'Đường thẳng',
  ray: 'Tia',
  circle: 'Đường tròn',
};

export function isValuePath(el: { type: string }): boolean {
  return (PATH_KINDS as string[]).includes(el.type);
}

/** Every path of the sketch, in construction order. */
export function valuePaths(elements: HeyGeoElement[]): ValuePath[] {
  return elements.filter(isValuePath).map((el) => {
    const kind = el.type as ValuePathKind;
    return { id: el.id, kind, label: `${PATH_WORDS[kind]} ${String(el.attrs?.name ?? el.id)}` };
  });
}

/**
 * The point's place on its path. `plotValue.value` is infix text whose `#i`
 * operands are `args[i]`, and `kind` says how the number is read on that path.
 */
export interface PlotValueSpec {
  value: string;
  args: string[];
  path: string;
  kind: ValuePathKind;
}

export function isPlotValueSpec(value: unknown): value is PlotValueSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return typeof s.value === 'string' && typeof s.path === 'string'
    && Array.isArray(s.args) && (PATH_KINDS as string[]).includes(s.kind as string);
}

/** The path and the numbers a plotted value is read from. */
export function plotValueDeps(el: { attrs?: Record<string, unknown> | null }): string[] {
  const spec = el.attrs?.plotValue;
  return isPlotValueSpec(spec) ? [spec.path, ...spec.args] : [];
}

export function plotValueOf(el: { attrs?: Record<string, unknown> | null }): PlotValueSpec | null {
  const spec = el.attrs?.plotValue;
  return isPlotValueSpec(spec) ? spec : null;
}

/** The glide the reading means on that kind of path. */
export function valueGlide(kind: ValuePathKind, value: number): GlideSpec | null {
  if (!Number.isFinite(value)) return null;
  switch (kind) {
    case 'segment': return { ratio: value };
    case 'line': return { distance: value };
    case 'ray': return { distance: value };
    case 'circle': return { turn: value * 2 * Math.PI };
  }
}

/** What the value is worth now, over the numbers of the page. */
export function plotValueNumber(
  spec: PlotValueSpec,
  at: (id: string) => number | null,
): number | null {
  return evalExpression(spec.value, (i) => (spec.args[i] ? at(spec.args[i]) : null));
}

/** What the dialog asks for; a null path is the marked frame's x axis. */
export interface PlotValueChoice {
  value: string;
  args: string[];
  path: string | null;
}

export interface PlotValueRows {
  /** True when the picks name everything the row needs, so it plots at once. */
  immediate: boolean;
  /** The row's label, in Sketchpad's words for what it would do. */
  label: string;
  /** The numbers picked, in pick order. */
  values: string[];
  /** The paths picked, in pick order. */
  paths: string[];
}

export function plotValueRows(elements: HeyGeoElement[], selection: string[]): PlotValueRows {
  const numbers = numberSources(elements);
  const values = selection.filter((id) => numbers.some((n) => n.id === id));
  const paths = selection.filter(
    (id) => elements.some((el) => el.id === id && isValuePath(el)));
  const immediate = values.length > 0
    && (paths.length === 1 || (values.length === 1 && paths.length > 1));
  let label = 'Plot Value on Axis…';
  if (values.length > 0 && paths.length > 1) label = 'Plot Value on Paths';
  else if (values.length > 0 && paths.length === 1) label = 'Plot Value on Path';
  else if (values.length === 0 && paths.length === 1) label = 'Plot Value on Path…';
  return { immediate, label, values, paths };
}
