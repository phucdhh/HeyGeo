import { describe, expect, it } from 'vitest';
import { SAMPLES, samplesProblem } from './samplesModel';

describe('Display | Number of Samples…', () => {
  it('keeps the desktop range and its step', () => {
    expect(SAMPLES).toEqual({ min: 15, max: 40000, step: 5 });
  });

  it('accepts the ends of the range and what lies between', () => {
    expect(samplesProblem(15)).toBeNull();
    expect(samplesProblem(120)).toBeNull();
    expect(samplesProblem(40000)).toBeNull();
  });

  it('refuses a count outside the range or off the integer grid', () => {
    expect(samplesProblem(14)).toMatch(/15/);
    expect(samplesProblem(40001)).toMatch(/40000/);
    expect(samplesProblem(40.5)).toMatch(/nguyên/);
    expect(samplesProblem(Number.NaN)).toMatch(/nguyên/);
  });
});
