/**
 * Display | Animate Objects… — a sketch set in motion, as data.
 *
 * Sketchpad animates what has a path to travel: a point on an object moves along
 * that object, and a parameter sweeps the range between its ends. Both are a
 * number between 0 and 1 — how far along the path or the range the object is —
 * so the whole animation is one step function over that number. The canvas owns
 * the clock; this file owns what each tick does, which is what a test can pin
 * down without a browser.
 *
 * Nothing here is stored in the document: pressing Stop leaves the objects where
 * they are, and where they are is what the document already records.
 */
import type { HeyGeoElement } from './designTypes';

/** The four directions Sketchpad offers, named for a path or a range alike. */
export type AnimationDirection = 'forward' | 'backward' | 'both' | 'once';

export const ANIMATION_DIRECTIONS: AnimationDirection[] = ['forward', 'backward', 'both', 'once'];

export const DIRECTION_LABELS: Record<AnimationDirection, string> = {
  forward: 'Một chiều',
  backward: 'Ngược chiều',
  both: 'Hai chiều',
  once: 'Một vòng',
};

/** A button's animation: which way it goes and how much of the path a second. */
export interface AnimationSpec {
  direction: AnimationDirection;
  /** Laps of the path (or the range) per second. */
  speed: number;
}

/**
 * A lap should take between half a second and 100 seconds; the default lap is
 * four seconds, which is about as long as Sketchpad's normal speed takes.
 */
export const ANIMATION_SPEED = { min: 0.01, max: 2, step: 0.05, fallback: 0.25 };

/** The kinds of object with a number to move along. */
export type AnimatableKind = 'glider' | 'slider';

export function animatableKind(el: { type?: string }): AnimatableKind | null {
  if (el.type === 'glider') return 'glider';
  if (el.type === 'slider') return 'slider';
  return null;
}

/** The selected elements that can be set in motion, in document order. */
export function animatables(
  elements: HeyGeoElement[],
  selection: string[],
): HeyGeoElement[] {
  const picked = new Set(selection);
  return elements.filter((el) => picked.has(el.id) && animatableKind(el) !== null);
}

/** Where a slider starts and ends, from `parents[2] = [min, value, max]`. */
export function sliderRange(el: { type?: string; parents?: unknown[] }): [number, number] | null {
  if (el.type !== 'slider') return null;
  const sc = el.parents?.[2];
  if (!Array.isArray(sc)) return null;
  const min = Number(sc[0]);
  const max = Number(sc[2]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
  return [min, max];
}

/** The value the document holds for a slider, or null when it holds none. */
export function sliderValueOf(el: { type?: string; parents?: unknown[] }): number | null {
  if (!sliderRange(el)) return null;
  const value = Number((el.parents?.[2] as unknown[])[1]);
  return Number.isFinite(value) ? value : null;
}

/** How far along its range a slider is, 0 at the low end and 1 at the high one. */
export function sliderPhaseOf(el: { type?: string; parents?: unknown[] }): number {
  const range = sliderRange(el);
  const value = sliderValueOf(el);
  if (!range || value === null) return 0;
  return Math.min(1, Math.max(0, (value - range[0]) / (range[1] - range[0])));
}

const roundValue = (n: number): number => Math.round(n * 1e4) / 1e4;

/** The slider's parents with a new value in place, so a stop can be saved. */
export function withSliderValue(
  el: { type?: string; parents?: unknown[] },
  value: number,
): unknown[] | null {
  const range = sliderRange(el);
  if (!range || !Number.isFinite(value)) return null;
  const parents = [...(el.parents ?? [])];
  const sc = [...(parents[2] as unknown[])];
  sc[1] = roundValue(Math.min(range[1], Math.max(range[0], value)));
  parents[2] = sc;
  return parents;
}

/** A speed the clock can use: finite, positive and no faster than a lap twice a second. */
export function animationSpeed(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return ANIMATION_SPEED.fallback;
  return Math.min(ANIMATION_SPEED.max, Math.max(ANIMATION_SPEED.min, value));
}

/** Why this animation cannot be started, or null when it can. */
export function animationProblem(spec: AnimationSpec): string | null {
  if (!ANIMATION_DIRECTIONS.includes(spec.direction)) return 'hướng chuyển động chưa hợp lệ';
  if (!Number.isFinite(spec.speed) || spec.speed <= 0) return 'tốc độ phải lớn hơn 0';
  return null;
}

/** True when a stored attribute really describes a run this app can make. */
export function isAnimationSpec(value: unknown): value is AnimationSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return animationProblem({
    direction: s.direction as AnimationDirection,
    speed: Number(s.speed),
  }) === null;
}

/** Where one object is and which way it is going. */
export interface AnimationTargetState {
  /** 0..1 along the path or the range. */
  phase: number;
  /** Which way a ping-pong animation is travelling. */
  dir: 1 | -1;
  /** A once-only animation has reached the far end. */
  done: boolean;
}

/** The state an object starts a run in, given where it was left. */
export function startState(phase: number, direction: AnimationDirection): AnimationTargetState {
  const inside = Math.min(1, Math.max(0, Number.isFinite(phase) ? phase : 0));
  // one pass of a glider sitting at the far end would be over before it began
  const start = direction === 'once' && inside >= 1 - 1e-9 ? 0 : inside;
  return { phase: start, dir: direction === 'backward' ? -1 : 1, done: false };
}

/**
 * One tick: move by `speed · dt` laps and keep the phase inside [0, 1]. A loop
 * wraps, a ping-pong reflects, and a once-only run stops at the end.
 */
export function advanceAnimation(
  state: AnimationTargetState,
  spec: AnimationSpec,
  dt: number,
): AnimationTargetState {
  if (state.done) return state;
  const travel = animationSpeed(spec.speed) * Math.max(0, dt);
  if (travel === 0) return state;
  let phase = state.phase + state.dir * travel;
  let dir = state.dir;

  if (spec.direction === 'once') {
    if (phase >= 1) return { phase: 1, dir: 1, done: true };
    return { phase, dir: 1, done: false };
  }

  if (spec.direction === 'both') {
    // reflect at either end, however many times a fast tick crosses the path
    for (let guard = 0; guard < 8 && (phase > 1 || phase < 0); guard++) {
      if (phase > 1) { phase = 2 - phase; dir = -1; }
      else { phase = -phase; dir = 1; }
    }
    if (phase > 1) phase = 1;
    if (phase < 0) phase = 0;
    return { phase, dir, done: false };
  }

  // a continuous loop in one direction: subtracting the whole laps leaves the
  // fraction, which is the same place on the path
  phase -= Math.floor(phase);
  if (phase >= 1) phase = 0;
  return { phase, dir: spec.direction === 'backward' ? -1 : 1, done: false };
}

// ─── The menu rows ────────────────────────────────────────────────────────────

export interface AnimationRows {
  /** Something selected has a path or a range to travel. */
  canAnimate: boolean;
  /** A run is in progress, so Stop Animation has something to stop. */
  running: boolean;
}

export function animationRows(
  selection: string[],
  elements: HeyGeoElement[],
  running: boolean,
): AnimationRows {
  return { canAnimate: animatables(elements, selection).length > 0, running };
}
