import { describe, expect, it } from 'vitest';
import {
  POLAR_RAYS,
  TRIG_STEPS,
  frameGeometry,
  gridInk,
  minorStep,
  niceStep,
  planGrid,
  snapSteps,
  snapToGrid,
  tickLabel,
  tickStep,
  trigLabel,
  trigStep,
  type FrameGeometry,
  type Viewbox,
} from './gridModel';

const VIEW: Viewbox = [0, 0, 10, 6];
/** A frame whose unit point is one board unit away — the plain case. */
const SQUARE: FrameGeometry = { origin: [2, 3], xUnit: 1, yUnit: 1 };
/** One board unit reaching 100 pixels, so a major tick every 2 units is 200px apart. */
const PPU = 100;

const majors = (plan: ReturnType<typeof planGrid>, axis: 'x' | 'y') =>
  (axis === 'x' ? plan.xTicks : plan.yTicks)
    .filter((t) => t.major)
    .map((t) => [axis === 'x' ? t.at[0] : t.at[1], t.label] as const);

describe('the spacing a frame is numbered with', () => {
  it('steps by nice numbers', () => {
    expect([niceStep(0.3), niceStep(1.2), niceStep(6), niceStep(0), niceStep(-1)]).toEqual([
      0.5, 2, 10, 1, 1,
    ]);
  });

  it('keeps ticks about a hand width apart', () => {
    // the desktop's rule: the first nice step that reaches 120 pixels
    expect(tickStep(200)).toBe(1);   // roomy: whole units, 200px apart
    expect(tickStep(150)).toBe(1);
    expect(tickStep(100)).toBe(2);   // 1 unit would be only 100px apart
    expect(tickStep(40)).toBe(5);
    expect(tickStep(0)).toBe(1);
  });

  it('divides a step into fifths, or halves, or nothing', () => {
    expect(minorStep(1, 200)).toBeCloseTo(0.2, 12);
    expect(minorStep(5, 40)).toBeCloseTo(1, 12);
    expect(minorStep(1, 12)).toBeCloseTo(0.5, 12);   // fifths would be 2.4px apart
    expect(minorStep(1, 8)).toBe(0);                 // not even halves reach 5px
  });

  it('names a tick with as many decimals as its step needs', () => {
    expect(tickLabel(3, 1)).toBe('3');
    expect(tickLabel(-2, 1)).toBe('-2');
    expect(tickLabel(1.9999999999, 1)).toBe('2');
    expect(tickLabel(0.4, 0.2)).toBe('0.4');
    expect(tickLabel(0.05, 0.05)).toBe('0.05');
  });
});

describe('a trigonometric axis', () => {
  it('picks the first π fraction wide enough to read', () => {
    expect(TRIG_STEPS.length).toBe(6);
    expect(trigStep(300)).toBeCloseTo(Math.PI / 6, 12);
    expect(trigStep(100)).toBeCloseTo(Math.PI / 3, 12);
    expect(trigStep(60)).toBeCloseTo(Math.PI / 2, 12);
    expect(trigStep(50)).toBeCloseTo(Math.PI, 12);
  });

  it('names the ticks in reduced π fractions', () => {
    const half = Math.PI / 2;
    expect(trigLabel(1, half)).toBe('π/2');
    expect(trigLabel(2, half)).toBe('π');
    expect(trigLabel(3, half)).toBe('3π/2');
    expect(trigLabel(-1, half)).toBe('-π/2');
    expect(trigLabel(2, Math.PI / 3)).toBe('2π/3');
    expect(trigLabel(3, Math.PI / 6)).toBe('π/2');
    expect(trigLabel(2, Math.PI)).toBe('2π');
    expect(trigLabel(0, half)).toBe('');
  });
});

describe('the distance a frame unit reaches', () => {
  const origin: [number, number] = [0, 0];
  const unit: [number, number] = [2, 0];
  const vertical: [number, number] = [0, 3];

  it('is the same on both axes except in a rectangular frame', () => {
    for (const form of ['square', 'polar', 'trig'] as const) {
      expect(frameGeometry(origin, unit, vertical, form), form).toEqual({
        origin, xUnit: 2, yUnit: 2,
      });
    }
    // a rectangular frame is measured along its own y axis, which is why the
    // desktop shows the y point only in this form
    expect(frameGeometry(origin, unit, vertical, 'rectangular')).toEqual({
      origin, xUnit: 2, yUnit: 3,
    });
  });

  it('falls back to the x unit when a rectangular frame has no y point yet', () => {
    expect(frameGeometry(origin, unit, null, 'rectangular').yUnit).toBe(2);
  });
});

describe('the grid a square frame draws', () => {
  const plan = planGrid(VIEW, SQUARE, 'square', PPU, false);

  it('numbers each tick with the frame coordinate under it', () => {
    // the origin sits at board (2, 3) with its unit one board unit away, so a
    // tick 2 board units right of it is the frame's 2 and they come every 2 units
    expect(majors(plan, 'x')).toEqual([[4, '2'], [6, '4'], [8, '6']]);
    expect(majors(plan, 'y')).toEqual([[1, '-2'], [5, '2']]);
  });

  it('puts the minor ticks between the majors and gives them no number', () => {
    const at = plan.xTicks.filter((t) => !t.major).map((t) => t.at[0]);
    expect(at).toContain(2.4);
    expect(at).toContain(3.6);
    expect(at.every((x) => Math.abs((x - 2) / 0.4 - Math.round((x - 2) / 0.4)) < 1e-9)).toBe(true);
    expect(plan.xTicks.every((t) => t.at[1] === 3)).toBe(true);
    expect(plan.yTicks.every((t) => t.at[0] === 2)).toBe(true);
  });

  it('fills the plane only when the grid is shown', () => {
    expect(plan.verticals).toEqual([]);
    const shown = planGrid(VIEW, SQUARE, 'square', PPU, true);
    // grid lines follow the majors, never the minors, and never the axes themselves
    expect(shown.verticals).toEqual([4, 6, 8]);
    expect(shown.horizontals).toEqual([1, 5]);
  });

  it('draws nothing on a frame with no length in it', () => {
    const flat = planGrid(VIEW, { origin: [2, 3], xUnit: 0, yUnit: 0 }, 'square', PPU, true);
    expect(flat.xTicks).toEqual([]);
    expect(flat.yTicks).toEqual([]);
    expect(flat.verticals).toEqual([]);
    expect(flat.horizontals).toEqual([]);
    expect(flat.xStep).toBe(1);
  });

  it('numbers whole tens when the frame unit is too small to read', () => {
    // the same board with a unit point only 20 pixels away: ticks have to spread
    // out to every 10 frame units to stay readable
    const small = { origin: [2, 3] as [number, number], xUnit: 0.2, yUnit: 0.2 };
    const zoomed = planGrid(VIEW, small, 'square', PPU, true);
    expect(zoomed.xStep).toBe(10);
    expect(majors(zoomed, 'x')).toEqual([[4, '10'], [6, '20'], [8, '30']]);
    expect(zoomed.verticals).toEqual([4, 6, 8]);
    expect(zoomed.yTicks.filter((t) => !t.major).map((t) => t.at[1])).toContain(3.4);
  });
});

describe('a rectangular frame', () => {
  const plan = planGrid(VIEW, { origin: [2, 3], xUnit: 1, yUnit: 2 }, 'rectangular', PPU, true);

  it('numbers each axis by its own unit', () => {
    // 2 board units right of the origin is the frame's 2 on x…
    expect(majors(plan, 'x')).toEqual([[4, '2'], [6, '4'], [8, '6']]);
    // …while 2 board units up is only its 1, because the y unit is twice as long
    expect(majors(plan, 'y')).toEqual([[1, '-1'], [5, '1']]);
  });
});

describe('a trigonometric frame', () => {
  // 60 pixels to a board unit puts the π ladder at every half π
  const plan = planGrid([0, 0, 10, 6], SQUARE, 'trig', 60, false);

  it('names the x axis in π and leaves the y axis in numbers', () => {
    expect(plan.xTicks.map((t) => t.label)).toEqual([
      '-π/2', 'π/2', 'π', '3π/2', '2π', '5π/2',
    ]);
    expect(plan.xTicks[1].at).toEqual([2 + Math.PI / 2, 3]);
    expect(plan.xTicks.every((t) => t.major)).toBe(true);
    expect(majors(plan, 'y')).toEqual([[1, '-2'], [5, '2']]);
  });

  it('runs its grid lines down the π crossings', () => {
    const shown = planGrid([0, 0, 10, 6], SQUARE, 'trig', 60, true);
    expect(shown.verticals[0]).toBeCloseTo(2 - Math.PI / 2, 9);
    expect(shown.verticals[1]).toBeCloseTo(2 + Math.PI / 2, 9);
  });
});

describe('a polar frame', () => {
  const plan = planGrid(VIEW, SQUARE, 'polar', PPU, true);

  it('draws rings at whole frame units instead of ticks, and numbers them', () => {
    expect(plan.xTicks).toEqual([]);
    expect(plan.verticals).toEqual([]);
    expect(plan.rings.map((r) => r.label)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
    expect(plan.rings[0].radius).toBeCloseTo(1, 12);
  });

  it('crosses them with a radial every 30 degrees', () => {
    expect(plan.rays).toHaveLength(POLAR_RAYS);
    expect(plan.rays[0]).toEqual([1, 0]);
    expect(plan.rays[3][0]).toBeCloseTo(0, 9);
    expect(plan.rays[3][1]).toBeCloseTo(1, 9);
    expect(plan.rays[6][0]).toBeCloseTo(-1, 9);
  });
});

describe('Graph | Snap Points', () => {
  it('stops a dragged point on the minor grid it was dropped near', () => {
    const plan = planGrid(VIEW, SQUARE, 'square', PPU, true);
    expect(snapSteps(plan)).toEqual({ x: 0.4, y: 0.4 });
    expect(snapToGrid([4.3, 5.05], SQUARE, plan)).toEqual([4.4, 5]);
    // and a point already on the grid stays exactly where it is
    expect(snapToGrid([4, 5], SQUARE, plan)).toEqual([4, 5]);
  });

  it('snaps along each axis of a rectangular frame by that axis unit', () => {
    const geo: FrameGeometry = { origin: [2, 3], xUnit: 1, yUnit: 2 };
    const plan = planGrid(VIEW, geo, 'rectangular', PPU, true);
    expect(snapSteps(plan)).toEqual({ x: 0.4, y: 0.2 });
    const [x, y] = snapToGrid([4.3, 5.5], geo, plan);
    expect(x).toBeCloseTo(4.4, 9);
    expect(y).toBeCloseTo(5.4, 9);
  });

  it('pins a point to the ring and radial it was dropped on in a polar frame', () => {
    const plan = planGrid(VIEW, SQUARE, 'polar', PPU, true);
    // dead on a ring and a radial: nowhere to go
    expect(snapToGrid([5, 3], SQUARE, plan)[0]).toBeCloseTo(5, 9);
    expect(snapToGrid([5, 3], SQUARE, plan)[1]).toBeCloseTo(3, 9);
    // 28.6° out on the third ring: the 30° radial at radius 3
    const [x, y] = snapToGrid([4.2, 4.2], SQUARE, plan);
    expect(x).toBeCloseTo(2 + 3 * Math.cos(Math.PI / 6), 9);
    expect(y).toBeCloseTo(3 + 3 * Math.sin(Math.PI / 6), 9);
  });

  it('leaves a point alone when the frame has nothing to snap it to', () => {
    const flat = planGrid(VIEW, { origin: [2, 3], xUnit: 0, yUnit: 0 }, 'square', PPU, true);
    expect(snapToGrid([4.3, 5.05], { origin: [2, 3], xUnit: 0, yUnit: 0 }, flat)).toEqual([4.3, 5.05]);
  });
});

describe('the frame grid as it is painted on the page', () => {
  // the board's (0, 0) lands at pixel (0, 600) with a unit reaching 100 pixels,
  // so the frame's origin at board (2, 3) is at pixel (200, 300)
  const ZERO: [number, number] = [0, 600];
  const ink = (plan: ReturnType<typeof planGrid>) => gridInk(VIEW, SQUARE, plan, ZERO, [PPU, PPU]);
  const shown = planGrid(VIEW, SQUARE, 'square', PPU, true);

  it('crosses each axis with a tick that reaches past it', () => {
    const ticks = ink(shown).ticks;
    // a major at the frame's 2 — board x 4, pixel 400 — stands 5 pixels each side
    // of the x-axis, which runs at pixel y 300
    expect(ticks).toContain('M400,295L400,305');
    // and the minor between the majors is shorter
    expect(ticks).toContain('M240,297L240,303');
  });

  it('hangs the numbers outside the axis they count', () => {
    const labels = ink(shown).labels;
    expect(labels).toContainEqual({ x: 400, y: 307, text: '2', side: 'under' });
    // a number on the y axis is written to the left of it, centred on its tick
    expect(labels).toContainEqual({ x: 193, y: 100, text: '2', side: 'left' });
    expect(labels.filter((l) => l.side === 'under').every((l) => l.y > 300)).toBe(true);
  });

  it('rules the plane between the majors, never at the minors', () => {
    const furniture = ink(shown).furniture;
    expect(furniture).toContain('M400,600L400,0');
    expect(furniture).toContain('M0,500L1000,500');
    expect(furniture).not.toContain('M240');
    expect(ink(shown).solid).toBe(false);
    // with no grid to show, only the ticks and their numbers are left
    const hidden = ink(planGrid(VIEW, SQUARE, 'square', PPU, false));
    expect(hidden.furniture).toBe('');
    expect(hidden.ticks).toContain('M400,295L400,305');
  });

  it('draws a polar frame solid, with its rings numbered to the right', () => {
    const polar = ink(planGrid(VIEW, SQUARE, 'polar', PPU, false));
    expect(polar.solid).toBe(true);
    expect(polar.ticks).toBe('');
    expect(polar.labels.map((l) => [l.x, l.text, l.side])).toEqual([
      [302, '1', 'right'], [402, '2', 'right'], [502, '3', 'right'], [602, '4', 'right'],
      [702, '5', 'right'], [802, '6', 'right'], [902, '7', 'right'], [1002, '8', 'right'],
    ]);
    // one closed path per ring, plus the 12 radials through the origin
    expect(polar.furniture.split('M').length - 1).toBe(8 + POLAR_RAYS);
  });

  it('keeps a π under its crossing when the frame counts in π', () => {
    const trig = gridInk(VIEW, SQUARE, planGrid(VIEW, SQUARE, 'trig', 60, false), ZERO, [60, 60]);
    const half = Math.round((2 + Math.PI / 2) * 60 * 10) / 10;
    expect(trig.labels.filter((l) => l.x === half).map((l) => l.text)).toEqual(['π/2']);
  });

  it('follows the board it is drawn on', () => {
    // the same frame on a board whose origin stands elsewhere and whose unit
    // reaches only half as far: the ladder spreads out and every pixel moves
    const plan = planGrid(VIEW, SQUARE, 'square', 50, true);
    const moved = gridInk(VIEW, SQUARE, plan, [120, 480], [50, 50]);
    expect(moved.furniture).toContain('M470');
    expect(moved.labels).toContainEqual({ x: 470, y: 337, text: '5', side: 'under' });
  });
});
