import { describe, expect, it } from 'vitest';
import { arcOnCirclePicks, isPointKind } from './arcOnCircleModel';

const circle = { id: 'c1', kind: 'circle' };
const A = { id: 'A', kind: 'point' };
const B = { id: 'B', kind: 'glider' };

describe('Construct | Arc On Circle', () => {
  it('takes one circle and two points in any order', () => {
    expect(arcOnCirclePicks([circle, A, B])).toEqual({ circle: 'c1', start: 'A', end: 'B' });
    expect(arcOnCirclePicks([A, circle, B])).toEqual({ circle: 'c1', start: 'A', end: 'B' });
    expect(arcOnCirclePicks([A, B, circle])).toEqual({ circle: 'c1', start: 'A', end: 'B' });
  });

  it('keeps the picked order, because it is the sweep direction', () => {
    expect(arcOnCirclePicks([B, circle, A])).toEqual({ circle: 'c1', start: 'B', end: 'A' });
  });

  it('accepts every point the desktop calls a point', () => {
    for (const kind of ['point', 'glider', 'midpoint', 'circumcenter', 'intersection']) {
      expect(isPointKind(kind)).toBe(true);
      expect(arcOnCirclePicks([circle, { id: 'P', kind }, { id: 'Q', kind: 'point' }]))
        .toMatchObject({ start: 'P', end: 'Q' });
    }
    expect(isPointKind('slider')).toBe(false);
  });

  it('refuses anything but one circle and two points', () => {
    expect(arcOnCirclePicks([])).toBeNull();
    expect(arcOnCirclePicks([circle, A])).toBeNull();
    expect(arcOnCirclePicks([circle, A, B, { id: 'C', kind: 'point' }])).toBeNull();
    expect(arcOnCirclePicks([circle, A, { id: 's', kind: 'segment' }])).toBeNull();
    expect(arcOnCirclePicks([circle, { id: 'c2', kind: 'circle' }, A])).toBeNull();
    expect(arcOnCirclePicks([A, B, { id: 's', kind: 'segment' }])).toBeNull();
  });
});
