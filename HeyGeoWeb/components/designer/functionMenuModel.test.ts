import { describe, expect, it } from 'vitest';
import {
  functionCaption,
  functionOf,
  functionPlace,
  functionRows,
  isFunctionSpec,
  nextFunctionName,
  plotOfFunction,
  plotTarget,
} from './functionMenuModel';
import type { HeyGeoElement } from './designTypes';

const fn = (id: string, expr: string, over: Record<string, unknown> = {}): HeyGeoElement => ({
  type: 'text', id, parents: [-7, 5, `f(x) = ${expr}`],
  attrs: { func: { expr, variable: 'x', from: -5, to: 5 }, ...over },
});

/** A page with a frame marked on O, since nothing is plotted without one. */
const FRAMED: HeyGeoElement[] = [
  { type: 'point', id: 'O', parents: [0, 0], attrs: { coordsys: { unit: 'U' } } },
  { type: 'point', id: 'U', parents: [1, 0], attrs: {} },
];

const framed = (...rest: HeyGeoElement[]): HeyGeoElement[] => [...FRAMED, ...rest];

describe('a function definition as data', () => {
  it('is read from the attribute the caption carries', () => {
    expect(functionOf(fn('f1', 'x^2-2'))).toEqual({ expr: 'x^2-2', variable: 'x', from: -5, to: 5 });
    expect(functionOf({ type: 'text', id: 't', parents: [0, 0, 'f(x) = x^2'], attrs: {} })).toBeNull();
  });

  it('refuses a shape it cannot plot from', () => {
    expect(isFunctionSpec({ expr: 'x', variable: 'x', from: 0, to: 1 })).toBe(true);
    expect(isFunctionSpec(null)).toBe(false);
    expect(isFunctionSpec('x^2')).toBe(false);
    // a variable the app cannot draw with, a domain that is not numbers, no formula
    expect(isFunctionSpec({ expr: 'x', variable: 'y', from: 0, to: 1 })).toBe(false);
    expect(isFunctionSpec({ expr: 'x', variable: 'x', from: '0', to: 1 })).toBe(false);
    expect(isFunctionSpec({ variable: 'x', from: 0, to: 1 })).toBe(false);
  });

  it('is named the way Sketchpad names the functions of one page', () => {
    const names = (n: number) =>
      nextFunctionName(framed(...Array.from({ length: n }, (_, i) => fn(`f${i}`, 'x'))));
    expect(names(0)).toBe('f');
    expect(names(1)).toBe('g');
    expect(names(2)).toBe('h');
    expect(names(3)).toBe('f1');
    // a plain caption is not a function, so it does not use a name up
    expect(nextFunctionName(framed({ type: 'text', id: 't', parents: [0, 0, 'ghi'], attrs: {} }))).toBe('f');
  });

  it('shows the formula it stores', () => {
    expect(functionCaption('f', { expr: 'x^2-2', variable: 'x', from: -5, to: 5 })).toBe('f(x) = x^2-2');
    expect(functionCaption('c', { expr: '2t', variable: 't', from: 0, to: 6 })).toBe('c(t) = 2t');
  });

  it('becomes a curve whose first coordinate is its own variable', () => {
    expect(plotOfFunction({ expr: 'x^2-2', variable: 'x', from: -5, to: 5 })).toEqual({
      x: 'x', y: 'x^2-2', variable: 'x', from: -5, to: 5,
    });
  });
});

describe('where a new definition goes', () => {
  it('stacks the margin column under the numbers already placed', () => {
    expect(functionPlace(framed())).toEqual([-7, 6.5]);
    expect(functionPlace(framed({ type: 'slider', id: 's', parents: [], attrs: {} }))).toEqual([-7, 5]);
    expect(functionPlace(framed(fn('f1', 'x'), fn('f2', 'x^2')))).toEqual([-7, 3.5]);
    // geometry the designer drew is not a row of this column
    expect(functionPlace(framed({ type: 'point', id: 'A', parents: [1, 1], attrs: {} }))).toEqual([-7, 6.5]);
  });
});

describe('which function row the selection answers to', () => {
  const page = framed(fn('f1', 'x^2-2'), { type: 'point', id: 'A', parents: [1, 1], attrs: {} });

  it('is live for exactly one definition picked on a page with a frame', () => {
    expect(plotTarget(page, ['f1'])).toBe('f1');
    expect(functionRows(page, ['f1'])).toEqual({ canNew: true, canPlot: true, target: 'f1' });
  });

  it('is dead for anything else: no pick, two picks, or a shape', () => {
    expect(plotTarget(page, [])).toBeNull();
    expect(plotTarget(page, ['f1', 'A'])).toBeNull();
    expect(plotTarget(page, ['A'])).toBeNull();
    expect(plotTarget(page, ['ghost'])).toBeNull();
  });

  it('is dead until Graph has marked a frame to measure the curve on', () => {
    const noFrame: HeyGeoElement[] = [fn('f1', 'x'), { type: 'point', id: 'A', parents: [1, 1], attrs: {} }];
    expect(plotTarget(noFrame, ['f1'])).toBeNull();
    expect(functionRows(noFrame, ['f1'])).toEqual({ canNew: true, canPlot: false, target: null });
  });

  it('leaves New Function live on an empty page', () => {
    expect(functionRows([], [])).toEqual({ canNew: true, canPlot: false, target: null });
  });
});
