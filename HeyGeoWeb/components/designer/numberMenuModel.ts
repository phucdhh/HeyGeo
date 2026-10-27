/**
 * What the Number menu can offer, and the descriptor its Calculate… writes.
 *
 * Sketchpad makes numbers the way its Measure menu makes captions: New
 * Parameter… is a number the designer types in, and Calculate… builds a number
 * out of the numbers already on the board. The desktop stores a calculation as
 * KFormula box codepoints, in which an operand is a private-use character
 * counting into the object's parent list; the document keeps the same shape as
 * infix text with `#0`, `#1` …, which expression.ts evaluates. This module is
 * the part of that dialog that can be answered without a board: which numbers
 * may be read, how the caption names them, and where a new slider goes.
 */
import { expressionRefs } from './expression';
import type { MeasureOp, MeasureSpec } from './measurement';
import type { HeyGeoElement, SliderPos } from './designTypes';

/** A number a calculation can read: a measurement that shows one, or a slider. */
export interface NumberSource {
  id: string;
  /** The text a calculation shows for it — the caption before " = ". */
  label: string;
}

// Coordinates print a pair and an equation prints a formula, so neither is a
// number to calculate with; the desktop's Values popup leaves them out too.
const TEXT_SHAPED: MeasureOp[] = [
  'coordinates', 'relativeCoordinates', 'equationLine', 'equationCircle',
];

/** The numbers on the board, in the order the document lists them. */
export function numberSources(elements: HeyGeoElement[]): NumberSource[] {
  const out: NumberSource[] = [];
  for (const el of elements) {
    if (el.type === 'slider') {
      out.push({ id: el.id, label: (el.attrs?.name as string | undefined) || el.id });
      continue;
    }
    const measure = el.attrs?.measure as MeasureSpec | undefined;
    if (!measure || TEXT_SHAPED.includes(measure.op)) continue;
    out.push({ id: el.id, label: measure.label || el.id });
  }
  return out;
}

/** Desktop's canMeasureCalculate: nothing picked, or exactly one number picked. */
export function canCalculate(sources: NumberSource[], selection: string[]): boolean {
  if (selection.length === 0) return true;
  return selection.length === 1 && sources.some((s) => s.id === selection[0]);
}

/**
 * What the dialog opens with. Picking a number first is how the desktop starts
 * a calculation from it — the expression begins as that one operand.
 */
export function seedCalculate(
  sources: NumberSource[],
  selection: string[],
): { expr: string; args: string[] } {
  const picked = selection.length === 1 ? selection[0] : null;
  return picked && sources.some((s) => s.id === picked)
    ? { expr: '#0', args: [picked] }
    : { expr: '', args: [] };
}

/**
 * The operands an expression still reads, renumbered from `#0`: a `#1` the
 * designer deleted must not stay a dependency of the caption, which is what the
 * desktop's removeParent does when the Calculator is closed with OK.
 */
export function pruneOperands(
  expr: string,
  args: string[],
): { expr: string; args: string[] } {
  const used = expressionRefs(expr).filter((i) => args[i] !== undefined);
  const args2: string[] = [];
  const renumber = new Map<number, number>();
  for (const i of used) {
    if (renumber.has(i)) continue;
    renumber.set(i, args2.length);
    args2.push(args[i]);
  }
  return {
    expr: expr.replace(/#(\d+)/g, (whole, i: string) =>
      (renumber.has(Number(i)) ? `#${renumber.get(Number(i))}` : whole)),
    args: args2,
  };
}

/**
 * The caption a calculation shows before " = ": the expression with each operand
 * replaced by the text of the number it reads, the desktop's getMenuLabel.
 */
export function expandOperands(expr: string, args: string[], sources: NumberSource[]): string {
  return expr.replace(/#(\d+)/g, (whole, i: string) => {
    const id = args[Number(i)];
    return id === undefined ? whole : (sources.find((s) => s.id === id)?.label ?? id);
  });
}

/** The descriptor Number | Calculate… writes, once its expression parses. */
export function calculateSpec(
  expr: string,
  args: string[],
  sources: NumberSource[],
): MeasureSpec {
  const pruned = pruneOperands(expr, args);
  return {
    op: 'calculate',
    args: pruned.args,
    expr: pruned.expr,
    label: expandOperands(pruned.expr, pruned.args, sources),
    precision: 2,
  };
}

/** A new parameter is dropped in the left margin, the way the desktop stacks value objects in a column. */
const PARAM_LEFT = -7;
const PARAM_RIGHT = -3.5;
const PARAM_TOP = 6.5;
/** Board units from one parameter's bar to the next. */
const PARAM_ROW = 1.5;

/**
 * Where Number | New Parameter… puts its slider: the first near the top of the
 * left margin, each further one below it, so a page of parameters reads as the
 * column the desktop's positionNewValueObject builds.
 */
export function parameterPlace(elements: HeyGeoElement[]): SliderPos {
  const rows = elements.filter((e) => e.type === 'slider').length;
  const y = PARAM_TOP - rows * PARAM_ROW;
  return { x1: PARAM_LEFT, y1: y, x2: PARAM_RIGHT, y2: y };
}
