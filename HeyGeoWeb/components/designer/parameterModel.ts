/**
 * A parameter — the number Number | New Parameter… makes.
 *
 * Sketchpad keeps parameters apart from sliders: a parameter is a value you
 * type, shown as `name = number`, that can be animated over a range; a slider
 * is the draggable control. The document stores the parameter as data on a text
 * element, so a reload reads the same number back, and the caption the engine
 * draws is computed from this descriptor on every update.
 */

export interface ParameterConfig extends ParameterSpec {
  name: string;
}

export interface ParameterSpec {
  value: number;
  /** The range an animation may sweep; not drawn as a control. */
  min: number;
  max: number;
  /** Decimals shown; the dialog takes it from the digits typed. */
  precision: number;
  /**
   * A label bound to a slider reads that slider's live value instead of the
   * stored one. Add Slider writes the control and this separate caption, so
   * the two can be dragged independently the way Sketchpad's can.
   */
  of?: string;
}

/** What the New Parameter dialog opens on, the desktop's own defaults. */
export const PARAMETER_DEFAULTS = { value: 1, min: 0, max: 10, precision: 0 } as const;

const MAX_PRECISION = 6;

export function isParameterSpec(value: unknown): value is ParameterSpec {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.value === 'number' && Number.isFinite(v.value)
    && typeof v.min === 'number' && Number.isFinite(v.min)
    && typeof v.max === 'number' && Number.isFinite(v.max);
}

/**
 * How many decimals the designer typed. GSP takes the typed number's last
 * significant digit as both the displayed precision and the keyboard step:
 * 5 → units, 5.0 → tenths, 5.00 → hundredths.
 */
export function precisionOf(typed: string): number {
  const m = /^\s*-?\d*\.(\d+)\s*$/.exec(typed);
  return m ? Math.min(MAX_PRECISION, m[1].length) : 0;
}

/** The decimals a slider's step implies: 0.1 shows one, 0.01 shows two. */
export function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 2;
  return Math.min(3, Math.max(0, Math.ceil(-Math.log10(step))));
}

/** What the caption says: `name = value`, to the stated precision. */
export function parameterCaption(name: string, spec: ParameterSpec): string {
  const trimmed = name.trim();
  const number = spec.value.toFixed(Math.min(MAX_PRECISION, Math.max(0, spec.precision)));
  return trimmed ? `${trimmed} = ${number}` : number;
}

/** The reason the dialog cannot accept this parameter, or null. */
export function parameterProblem(name: string, spec: ParameterSpec): string | null {
  if (!name.trim()) return 'Tên tham số không được để trống.';
  if (!Number.isFinite(spec.value)) return 'Giá trị không hợp lệ.';
  if (!Number.isFinite(spec.min) || !Number.isFinite(spec.max)) return 'Khoảng giá trị không hợp lệ.';
  if (spec.max <= spec.min) return 'Giá trị lớn nhất phải lớn hơn nhỏ nhất.';
  if (spec.value < spec.min || spec.value > spec.max) return 'Giá trị phải nằm trong khoảng đã cho.';
  return null;
}
