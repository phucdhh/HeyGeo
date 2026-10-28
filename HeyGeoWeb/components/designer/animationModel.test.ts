import { describe, expect, it } from 'vitest';
import {
  ANIMATION_SPEED,
  advanceAnimation,
  animationProblem,
  animationRows,
  animationSpeed,
  animatableKind,
  animatables,
  sliderPhaseOf,
  sliderRange,
  sliderValueOf,
  startState,
  withSliderValue,
  type AnimationSpec,
} from './animationModel';
import type { HeyGeoElement } from './designTypes';

const el = (over: Partial<HeyGeoElement> & { id: string }): HeyGeoElement => ({
  type: 'point', parents: [], attrs: {}, ...over,
});

const glider = (id: string): HeyGeoElement =>
  el({ id, type: 'glider', parents: [1, 1, 'seg'] });

const slider = (id: string, min = 0, value = 0, max = 10): HeyGeoElement =>
  el({ id, type: 'slider', parents: [[0, 0], [1, 0], [min, value, max]] });

const spec = (over: Partial<AnimationSpec> = {}): AnimationSpec => ({
  direction: 'forward', speed: 0.25, ...over,
});

describe('what can be set in motion', () => {
  it('is a glider on a path or a parameter with a range', () => {
    expect(animatableKind({ type: 'glider' })).toBe('glider');
    expect(animatableKind({ type: 'slider' })).toBe('slider');
    expect(animatableKind({ type: 'point' })).toBeNull();
    expect(animatableKind({ type: 'text' })).toBeNull();
  });

  it('is only what is selected, in document order', () => {
    const doc = [glider('g'), el({ id: 'A' }), slider('s'), glider('g2')];
    expect(animatables(doc, ['g2', 'A', 'g']).map((e) => e.id)).toEqual(['g', 'g2']);
    expect(animatables(doc, [])).toEqual([]);
  });
});

describe('a parameter’s range and value', () => {
  it('reads the ends and the value from the stored triple', () => {
    expect(sliderRange(slider('s', -2, 3, 8))).toEqual([-2, 8]);
    expect(sliderValueOf(slider('s', -2, 3, 8))).toBe(3);
    expect(sliderPhaseOf(slider('s', -2, 3, 8))).toBeCloseTo(0.5);
    // a point has no range, and neither has a malformed triple
    expect(sliderRange(el({ id: 'A' }))).toBeNull();
    expect(sliderRange(el({ id: 's', type: 'slider', parents: [[0, 0]] }))).toBeNull();
    expect(sliderRange(el({ id: 's', type: 'slider', parents: [[0, 0], [1, 0], [4, 1, 4]] }))).toBeNull();
  });

  it('clamps a phase to the ends of the range', () => {
    expect(sliderPhaseOf(slider('s', 0, -3, 10))).toBe(0);
    expect(sliderPhaseOf(slider('s', 0, 12, 10))).toBe(1);
  });

  it('writes a value back into the triple, inside the ends', () => {
    expect(withSliderValue(slider('s', -2, 3, 8), 6.5)).toEqual([[0, 0], [1, 0], [-2, 6.5, 8]]);
    expect(withSliderValue(slider('s', -2, 3, 8), 100)).toEqual([[0, 0], [1, 0], [-2, 8, 8]]);
    expect(withSliderValue(slider('s'), NaN)).toBeNull();
    expect(withSliderValue(el({ id: 'A' }), 1)).toBeNull();
  });
});

describe('one tick of the clock', () => {
  const tick = (phase: number, dir: 1 | -1, over: Partial<AnimationSpec>, dt = 1) =>
    advanceAnimation({ phase, dir, done: false }, spec(over), dt);

  it('moves forward and wraps at the end of the path', () => {
    expect(tick(0, 1, {}).phase).toBeCloseTo(0.25);
    expect(tick(0.9, 1, {}).phase).toBeCloseTo(0.15);
    expect(tick(0.9, 1, {}).done).toBe(false);
  });

  it('moves backward and wraps at the start', () => {
    expect(tick(0.5, -1, { direction: 'backward' }).phase).toBeCloseTo(0.25);
    expect(tick(0.1, -1, { direction: 'backward' }).phase).toBeCloseTo(0.85);
    expect(tick(0.1, -1, { direction: 'backward' }).dir).toBe(-1);
  });

  it('bounces at both ends', () => {
    const up = tick(0.9, 1, { direction: 'both' });
    expect(up.phase).toBeCloseTo(0.85);
    expect(up.dir).toBe(-1);
    const down = tick(0.1, -1, { direction: 'both' });
    expect(down.phase).toBeCloseTo(0.15);
    expect(down.dir).toBe(1);
  });

  it('stops after one pass', () => {
    const near = tick(0.9, 1, { direction: 'once' });
    expect(near.phase).toBe(1);
    expect(near.done).toBe(true);
    // a finished object is not moved again
    expect(advanceAnimation(near, spec({ direction: 'once' }), 1)).toEqual(near);
  });

  it('does not move when no time has passed', () => {
    expect(tick(0.4, 1, {}, 0)).toEqual({ phase: 0.4, dir: 1, done: false });
  });

  it('keeps a fast tick inside the path', () => {
    const fast = tick(0.1, 1, { speed: 2 }, 1);   // two whole laps in one tick
    expect(fast.phase).toBeGreaterThanOrEqual(0);
    expect(fast.phase).toBeLessThan(1);
    const bouncer = tick(0.1, 1, { direction: 'both', speed: 2 }, 1);
    expect(bouncer.phase).toBeGreaterThanOrEqual(0);
    expect(bouncer.phase).toBeLessThanOrEqual(1);
  });

  it('starts a once-only run at the beginning when the object is already home', () => {
    expect(startState(1, 'once')).toEqual({ phase: 0, dir: 1, done: false });
    expect(startState(0.4, 'once')).toEqual({ phase: 0.4, dir: 1, done: false });
    expect(startState(0.4, 'backward')).toEqual({ phase: 0.4, dir: -1, done: false });
  });
});

describe('the speed the clock is given', () => {
  it('falls back for a value it cannot use and keeps a usable one in range', () => {
    expect(animationSpeed(0)).toBe(ANIMATION_SPEED.fallback);
    expect(animationSpeed(NaN)).toBe(ANIMATION_SPEED.fallback);
    expect(animationSpeed(0.001)).toBe(ANIMATION_SPEED.min);
    expect(animationSpeed(99)).toBe(ANIMATION_SPEED.max);
    expect(animationSpeed(0.5)).toBe(0.5);
  });

  it('refuses an animation with no speed', () => {
    expect(animationProblem(spec())).toBeNull();
    expect(animationProblem(spec({ speed: 0 }))).toContain('tốc độ');
    expect(animationProblem(spec({ speed: NaN }))).toContain('tốc độ');
  });
});

describe('the Display menu rows', () => {
  it('animate what is selected and stop only while running', () => {
    const doc = [glider('g'), el({ id: 'A' })];
    expect(animationRows(['A'], doc, false)).toEqual({ canAnimate: false, running: false });
    expect(animationRows(['g'], doc, false)).toEqual({ canAnimate: true, running: false });
    expect(animationRows([], doc, true)).toEqual({ canAnimate: false, running: true });
  });
});
