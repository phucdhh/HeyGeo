import { describe, expect, it } from 'vitest';
import { circleByRadiusPicks, isRadiusSource } from './circleByRadiusModel';

const point = { id: 'A', kind: 'point' };
const glider = { id: 'G', kind: 'glider' };
const segment = { id: 's1', kind: 'segment' };
const distance = { id: 'm1', kind: 'text', measureOp: 'distance' as const };
const lengthOfArc = { id: 'm2', kind: 'text', measureOp: 'arcLength' as const };
const caption = { id: 't1', kind: 'text' };
const slider = { id: 'a', kind: 'slider' };
const circle = { id: 'c1', kind: 'circle' };

describe('Construct | Circle By Center+Radius', () => {
  it('takes the centre first, whichever way round it was picked', () => {
    expect(circleByRadiusPicks([segment, point])).toEqual({ center: 'A', radius: 's1' });
    expect(circleByRadiusPicks([point, segment])).toEqual({ center: 'A', radius: 's1' });
    expect(circleByRadiusPicks([glider, segment])).toEqual({ center: 'G', radius: 's1' });
  });

  it('accepts the measurements the desktop calls lengths', () => {
    expect(circleByRadiusPicks([distance, point])).toEqual({ center: 'A', radius: 'm1' });
    expect(circleByRadiusPicks([point, { id: 'm3', kind: 'text', measureOp: 'length' }]))
      .toEqual({ center: 'A', radius: 'm3' });
    expect(circleByRadiusPicks([point, { id: 'm4', kind: 'text', measureOp: 'radius' }]))
      .toEqual({ center: 'A', radius: 'm4' });
    expect(circleByRadiusPicks([point, { id: 'm5', kind: 'text', measureOp: 'pointSegmentDistance' }]))
      .toEqual({ center: 'A', radius: 'm5' });
  });

  it('refuses a measurement that does not read a length', () => {
    expect(isRadiusSource(lengthOfArc)).toBe(false);
    expect(circleByRadiusPicks([point, lengthOfArc])).toBeNull();
    expect(circleByRadiusPicks([point, { id: 'm6', kind: 'text', measureOp: 'angle' }])).toBeNull();
  });

  it('refuses a plain caption, a slider or a circle as the radius', () => {
    expect(circleByRadiusPicks([point, caption])).toBeNull();
    expect(circleByRadiusPicks([point, slider])).toBeNull();
    expect(circleByRadiusPicks([point, circle])).toBeNull();
  });

  it('needs exactly two picks, one of them a point', () => {
    expect(circleByRadiusPicks([point])).toBeNull();
    expect(circleByRadiusPicks([point, segment, distance])).toBeNull();
    expect(circleByRadiusPicks([segment, distance])).toBeNull();
    expect(circleByRadiusPicks([point, glider])).toBeNull();
  });
});
