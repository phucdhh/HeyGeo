import { describe, expect, it } from 'vitest';
import {
  PARAMETER_DEFAULTS,
  isParameterSpec,
  parameterCaption,
  parameterProblem,
  precisionOf,
} from './parameterModel';

const spec = (over: Partial<{ value: number; min: number; max: number; precision: number }> = {}) =>
  ({ ...PARAMETER_DEFAULTS, ...over });

describe('a parameter', () => {
  it('opens on the desktop dialog’s defaults', () => {
    expect(PARAMETER_DEFAULTS).toEqual({ value: 1, min: 0, max: 10, precision: 0 });
  });

  it('takes its precision from the digits typed', () => {
    expect(precisionOf('5')).toBe(0);
    expect(precisionOf('5.0')).toBe(1);
    expect(precisionOf('5.00')).toBe(2);
    expect(precisionOf('-3.125')).toBe(3);
    expect(precisionOf('abc')).toBe(0);
  });

  it('draws name = value at that precision', () => {
    expect(parameterCaption('n', spec())).toBe('n = 1');
    expect(parameterCaption('m', spec({ value: 2.5, precision: 2 }))).toBe('m = 2.50');
    expect(parameterCaption('', spec({ value: 7, precision: 0 }))).toBe('7');
  });

  it('refuses a parameter the dialog could not accept', () => {
    expect(parameterProblem('n', spec())).toBeNull();
    expect(parameterProblem(' ', spec())).toMatch(/Tên/);
    expect(parameterProblem('n', spec({ min: 5, max: 5 }))).toMatch(/lớn hơn/);
    expect(parameterProblem('n', spec({ value: 11 }))).toMatch(/trong khoảng/);
    expect(parameterProblem('n', spec({ value: Number.NaN }))).toMatch(/Giá trị/);
  });

  it('reads a stored descriptor only when it holds finite numbers', () => {
    expect(isParameterSpec(spec())).toBe(true);
    expect(isParameterSpec({ value: 'x', min: 0, max: 1 })).toBe(false);
    expect(isParameterSpec(null)).toBe(false);
    expect(isParameterSpec({ value: 1 })).toBe(false);
  });
});
