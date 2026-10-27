import { describe, expect, it } from 'vitest';
import { evalExpression, expressionRefs, expressionVariables } from './expression';

/** The numbers a document's calculations would be handed. */
const refs = (...values: (number | null)[]) => (i: number) => values[i] ?? null;

describe('evalExpression', () => {
  it('reads the four operators with the usual precedence', () => {
    expect(evalExpression('2+3*4', refs())).toBe(14);
    expect(evalExpression('(2+3)*4', refs())).toBe(20);
    expect(evalExpression('20-6/3', refs())).toBe(18);
    expect(evalExpression(' 1 + 1 ', refs())).toBe(2);
  });

  it('powers to the right and tighter than a leading minus', () => {
    expect(evalExpression('2^3^2', refs())).toBe(512);
    expect(evalExpression('-2^2', refs())).toBe(-4);
    expect(evalExpression('2^-1', refs())).toBe(0.5);
  });

  it('multiplies what is written side by side, as the desktop tree does', () => {
    expect(evalExpression('2#0', refs(5))).toBe(10);
    expect(evalExpression('(1+#0)#1', refs(2, 3))).toBe(9);
    expect(evalExpression('2pi', refs())).toBeCloseTo(2 * Math.PI, 10);
  });

  it('takes the value of each operand the expression names', () => {
    expect(evalExpression('#0/#1', refs(9, 3))).toBe(3);
    expect(evalExpression('#0+#1-#2', refs(1, 2, 4))).toBe(-1);
    expect(evalExpression('#0', refs(7))).toBe(7);
  });

  it('knows the desktop function table', () => {
    expect(evalExpression('sqrt(#0)', refs(16))).toBe(4);
    expect(evalExpression('abs(0-#0)', refs(5))).toBe(5);
    expect(evalExpression('ln(#0)', refs(Math.E))).toBeCloseTo(1, 10);
    expect(evalExpression('log(#0)', refs(1000))).toBeCloseTo(6.9078, 3);
    expect(evalExpression('log10(#0)', refs(1000))).toBeCloseTo(3, 10);
    expect(evalExpression('round(#0)', refs(2.6))).toBe(3);
    expect(evalExpression('sgn(0-#0)', refs(2))).toBe(-1);
    expect(evalExpression('min(#0,#1)', refs(3, 8))).toBe(3);
    expect(evalExpression('max(#0,#1)', refs(3, 8))).toBe(8);
    expect(evalExpression('pow(#0,#1)', refs(2, 10))).toBe(1024);
  });

  it('leaves trigonometry in radians, like the desktop evaluator', () => {
    expect(evalExpression('sin(pi/2)', refs())).toBeCloseTo(1, 10);
    expect(evalExpression('cos(0)', refs())).toBe(1);
  });

  it('carries the unit keywords the desktop hands the formula', () => {
    expect(evalExpression('2.54', refs())).toBe(2.54);
    expect(evalExpression('#0 cm', refs(3))).toBe(3);
    expect(evalExpression('#0 rad', refs(1))).toBeCloseTo(180 / Math.PI, 8);
  });

  it('has no number for an expression that cannot be evaluated', () => {
    expect(evalExpression('#0/#1', refs(4, 0))).toBeNull();       // division by zero
    expect(evalExpression('sqrt(0-#0)', refs(4))).toBeNull();     // root of a negative
    expect(evalExpression('#0', refs(null))).toBeNull();          // operand undefined
    expect(evalExpression('sqrt()', refs())).toBeNull();
    expect(evalExpression('3^#0', refs(null))).toBeNull();
  });

  it('has no number for an expression that is not arithmetic', () => {
    expect(evalExpression('2+', refs())).toBeNull();
    expect(evalExpression('(2+3', refs())).toBeNull();
    expect(evalExpression('2)', refs())).toBeNull();
    expect(evalExpression('', refs())).toBeNull();
    expect(evalExpression('#', refs())).toBeNull();
    expect(evalExpression('#0 #1', refs(1))).toBeNull();          // an arg the doc never listed
    expect(evalExpression('drop table', refs())).toBeNull();
  });

  it('evaluates text as mathematics only, never as code', () => {
    // Every one of these would run something if the caption were compiled.
    expect(evalExpression('constructor', refs())).toBeNull();
    expect(evalExpression('this', refs())).toBeNull();
    expect(evalExpression('window', refs())).toBeNull();
    expect(evalExpression('alert(1)', refs())).toBeNull();
    expect(evalExpression('#0;alert(1)', refs(1))).toBeNull();
    expect(evalExpression('1+1}function(){', refs())).toBeNull();
  });
});

describe('expressionRefs', () => {
  it('lists the operand indexes an expression reads, once each', () => {
    expect(expressionRefs('#2*#0+#2')).toEqual([2, 0]);
    expect(expressionRefs('sqrt(#1+#1)')).toEqual([1]);
    expect(expressionRefs('pi*2')).toEqual([]);
    expect(expressionRefs('2+')).toEqual([]);
  });
});

describe('a formula written in one variable', () => {
  /** What a plot hands the evaluator: its own variable, and no other name. */
  const at = (value: number) => (name: string) => (name === 'x' || name === 't' ? value : undefined);

  it('counts the variable wherever it is written', () => {
    expect(evalExpression('x^2-2', refs(), at(3))).toBe(7);
    expect(evalExpression('2x', refs(), at(4))).toBe(8);
    expect(evalExpression('sin(t)', refs(), at(Math.PI / 2))).toBeCloseTo(1, 10);
    expect(evalExpression('t/2+pi', refs(), at(2))).toBeCloseTo(1 + Math.PI, 10);
  });

  it('has no number where the expression has none, and still parses', () => {
    // a curve skips these points; it does not reject the typed formula
    expect(evalExpression('1/x', refs(), at(0))).toBeNull();
    expect(evalExpression('sqrt(x)', refs(), at(0-4))).toBeNull();
    expect(evalExpression('sqrt(x)', refs(), at(4))).toBe(2);
  });

  it('still refuses a name nobody supplied', () => {
    expect(evalExpression('y+1', refs(), at(2))).toBeNull();
    expect(evalExpression('window', refs(), at(2))).toBeNull();
    expect(evalExpression('x', refs())).toBeNull();
  });

  it('keeps the constants and function names out of the variable list', () => {
    expect(expressionVariables('x^2-2')).toEqual(['x']);
    expect(expressionVariables('sin(t)+2pi-x')).toEqual(['t', 'x']);
    expect(expressionVariables('2sqrt(x)')).toEqual(['x']);
    expect(expressionVariables('#0+1')).toEqual([]);
    expect(expressionVariables('cm+deg+in+rad+e+pi')).toEqual([]);
    expect(expressionVariables('min(x,#0)')).toEqual(['x']);
    expect(expressionVariables('constructor')).toEqual(['constructor']);
  });
});
