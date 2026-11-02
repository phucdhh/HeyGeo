/**
 * An action button, as Sketchpad's Edit | Action Buttons makes one.
 *
 * A button is a caption on the sketch that does something when it is pressed.
 * This file holds the behaviours as data: which objects the button acts on, what
 * it calls them, and what a press does to them. Pressing a visibility button is
 * a change to those objects, not to the button, so a reload shows the same
 * sketch with the objects still hidden; pressing a Move button carries its
 * points to where they were told to go; a Present button presses other buttons.
 *
 *   element.type      = 'actionbutton'
 *   element.parents   = [x, y, caption]      where it sits and what it reads
 *   element.attrs.button = { action, name, targets, animation? | move? | present? }
 *
 * The names follow what the behaviour does rather than what Sketchpad calls the
 * menu row: `toggle` is its Hide/Show, which flips, while `show` and `hide` are
 * the one-shot buttons a Present sequence is usually made of.
 */
import type { HeyGeoElement } from './designTypes';
import {
  ANIMATION_SPEED,
  animatableKind,
  isAnimationSpec,
  type AnimationSpec,
} from './animationModel';

/** The actions a button can perform. */
export type ActionButtonAction = 'toggle' | 'show' | 'hide' | 'animate' | 'move' | 'present';

const ACTIONS: ActionButtonAction[] = ['toggle', 'show', 'hide', 'animate', 'move', 'present'];

/**
 * How fast a Move button travels. Sketchpad's Movement dialog offers a slider
 * from slow to fast and a Jump box; the four names are that, and the seconds
 * are what this app makes of them.
 */
export type MoveSpeed = 'jump' | 'slow' | 'normal' | 'fast';

export const MOVE_SPEEDS: MoveSpeed[] = ['jump', 'slow', 'normal', 'fast'];

export const MOVE_SPEED_LABELS: Record<MoveSpeed, string> = {
  jump: 'Nhảy',
  slow: 'Chậm',
  normal: 'Bình thường',
  fast: 'Nhanh',
};

/** Seconds a Move button takes to reach its destination; a jump takes none. */
export const MOVE_SECONDS: Record<MoveSpeed, number> = {
  jump: 0, slow: 2.5, normal: 1.2, fast: 0.5,
};

/** A move button's run: where each target goes, and how long that takes. */
export interface MoveSpec {
  /** One destination per target, in the same order — a point or a [x, y] place. */
  destinations: string[];
  speed: MoveSpeed;
}

/** How a Present button works through the buttons it names. */
export interface PresentSpec {
  /** One after another, holding each step, rather than all in one press. */
  sequential: boolean;
  /** Seconds held on each step when they run one after another. */
  pause: number;
}

/** The button as stored: what it does, what it is called, what it acts on. */
export interface ActionButtonSpec {
  action: ActionButtonAction;
  /** The objects' names as the button shows them, e.g. "AB, M". */
  name: string;
  /** The elements a press acts on; for a Present button, the buttons it presses. */
  targets: string[];
  /** An animation button's direction and speed. */
  animation?: AnimationSpec;
  /** A move button's destinations. */
  move?: MoveSpec;
  /** A present button's sequence. */
  present?: PresentSpec;
}

/** True when a stored attribute really is a button this app can press. */
export function isActionButtonSpec(value: unknown): value is ActionButtonSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (!ACTIONS.includes(s.action as ActionButtonAction)) return false;
  if (typeof s.name !== 'string') return false;
  if (!Array.isArray(s.targets) || !s.targets.every((t) => typeof t === 'string')) return false;
  // a button whose extra half is missing would be a caption that does nothing
  if (s.action === 'animate') return isAnimationSpec(s.animation);
  if (s.action === 'move') return isMoveSpec(s.move, s.targets.length);
  if (s.action === 'present') return isPresentSpec(s.present);
  return true;
}

export function isMoveSpec(value: unknown, targetCount?: number): value is MoveSpec {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  if (!MOVE_SPEEDS.includes(m.speed as MoveSpeed)) return false;
  if (!Array.isArray(m.destinations) || !m.destinations.every((d) => typeof d === 'string')) return false;
  return targetCount === undefined || m.destinations.length === targetCount;
}

export function isPresentSpec(value: unknown): value is PresentSpec {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.sequential === 'boolean'
    && Number.isFinite(Number(p.pause)) && Number(p.pause) >= 0;
}

/** The button an element is, or null when it is something else. */
export function buttonOf(el: { type?: string; attrs?: Record<string, unknown> | null }): ActionButtonSpec | null {
  if (el.type !== 'actionbutton') return null;
  return isActionButtonSpec(el.attrs?.button) ? el.attrs!.button as ActionButtonSpec : null;
}

/** The elements a press works on, for the dependency graph and cascade delete. */
export function buttonDeps(el: { type?: string; attrs?: Record<string, unknown> | null }): string[] {
  const spec = buttonOf(el);
  if (!spec) return [];
  // a move button is nothing without the places it travels to, and a present
  // button is nothing without the buttons it presses
  return spec.action === 'move' ? [...spec.targets, ...(spec.move?.destinations ?? [])] : spec.targets;
}

/** What the sketch calls an object: its label, or its id when it has none. */
function labelOf(el: HeyGeoElement): string {
  const name = el.attrs?.name;
  if (typeof name === 'string' && name.trim()) return name;
  const measure = el.attrs?.measure as { label?: unknown } | undefined;
  if (typeof measure?.label === 'string' && measure.label.trim()) return measure.label;
  return el.id;
}

/** The name a button takes from the objects it acts on. */
export function buttonName(targets: HeyGeoElement[]): string {
  const labels = targets.map(labelOf);
  // Sketchpad lists what fits; a long selection would run across the page
  return labels.length <= 2 ? labels.join(', ') : `${labels[0]}, …`;
}

/** The caption the sketch shows, named after what a press will do. */
export function buttonCaption(spec: ActionButtonSpec, shows: boolean): string {
  switch (spec.action) {
    case 'animate': return `Chạy ${spec.name}`;
    case 'move': return `Đưa ${spec.name} tới đích`;
    case 'present': return `Trình diễn ${spec.name}`;
    case 'show': return `Hiện ${spec.name}`;
    case 'hide': return `Ẩn ${spec.name}`;
    // a toggle says what the next press does, so it keeps saying something true
    default: return `${shows ? 'Hiện' : 'Ẩn'} ${spec.name}`;
  }
}

/**
 * What a press of a toggle does: it shows the objects when they are all hidden
 * and hides them otherwise, which is Sketchpad's Hide/Show button. The one-shot
 * `show` and `hide` buttons do not ask — a Presentation sequence that presses a
 * Show twice should leave the page shown the second time as it did the first.
 */
export function buttonShows(spec: ActionButtonSpec, isVisible: (id: string) => boolean): boolean {
  if (spec.action === 'show') return true;
  if (spec.action === 'hide') return false;
  return spec.targets.every((id) => !isVisible(id));
}

/** Why this button cannot be pressed, or null when it can. */
export function buttonProblem(
  spec: ActionButtonSpec,
  elements?: HeyGeoElement[],
): string | null {
  if (spec.targets.length === 0) return 'nút hành động không có đối tượng nào';
  if (!spec.name.trim()) return 'nút hành động chưa có tên';
  if (spec.action === 'animate') {
    if (!isAnimationSpec(spec.animation)) return 'nút hành động thiếu cách chuyển động';
    if (elements && !elements.some((e) => spec.targets.includes(e.id) && animatableKind(e) !== null)) {
      return 'nút hành động không có điểm trượt hay tham số nào để chuyển động';
    }
  }
  if (spec.action === 'move') {
    if (!isMoveSpec(spec.move, spec.targets.length)) return 'nút di chuyển thiếu nơi đến';
    if (elements) {
      const gone = [...spec.targets, ...spec.move!.destinations]
        .find((id) => !elements.some((e) => e.id === id));
      if (gone !== undefined) return 'nút di chuyển tham chiếu đối tượng không tồn tại';
    }
    return null;
  }
  if (spec.action === 'present') {
    if (!isPresentSpec(spec.present)) return 'nút trình diễn thiếu cách trình bày';
  }
  if (elements) {
    const gone = spec.targets.find((id) => !elements.some((e) => e.id === id));
    if (gone !== undefined) return 'nút hành động tham chiếu đối tượng không tồn tại';
  }
  return null;
}

/** The button Edit | Action Buttons makes of what is selected. */
export function newActionButton(
  action: ActionButtonAction,
  targets: HeyGeoElement[],
  extra?: { animation?: AnimationSpec; move?: MoveSpec; present?: PresentSpec },
): ActionButtonSpec {
  // an animation button is made of the parts with a path to travel; naming a
  // static object in its caption would promise motion that cannot happen
  const named = action === 'animate'
    ? targets.filter((t) => animatableKind(t) !== null)
    : targets;
  const spec: ActionButtonSpec = {
    action,
    name: buttonName(named),
    targets: named.map((t) => t.id),
  };
  if (action === 'animate') spec.animation = extra?.animation ?? { direction: 'forward', speed: ANIMATION_SPEED.fallback };
  if (action === 'move') spec.move = extra?.move ?? { destinations: [], speed: 'normal' };
  if (action === 'present') spec.present = extra?.present ?? { sequential: true, pause: 1 };
  return spec;
}

/**
 * The pairs Edit | Action Buttons | Movement makes of a selection: Sketchpad
 * takes the points in the order they were picked and sends each one to the next,
 * so four picked points are two moves. An odd point out is left alone.
 */
export function movePairs(points: HeyGeoElement[]): { from: string; to: string }[] {
  const pairs: { from: string; to: string }[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    pairs.push({ from: points[i].id, to: points[i + 1].id });
  }
  return pairs;
}

// ─── Where buttons go ─────────────────────────────────────────────────────────

/**
 * The right margin, which is where the parameters and definitions do not reach:
 * each new button lands a row under the last, so a sketch's buttons read as one
 * column the designer can drag away.
 */
export const BUTTON_COLUMN_X = 6;
const BUTTON_TOP = 6.5;
const BUTTON_ROW = 1.2;

export function buttonPlace(elements: HeyGeoElement[]): [number, number] {
  const rows = elements.filter((e) => buttonOf(e) !== null).length;
  return [BUTTON_COLUMN_X, BUTTON_TOP - rows * BUTTON_ROW];
}

// ─── The menu row ─────────────────────────────────────────────────────────────

export interface ActionButtonRows {
  /** Sketchpad makes a button out of a selection, so the row waits for one. */
  canCreate: boolean;
  /** Animation needs something with a path or a range to travel. */
  canAnimate: boolean;
  /** Movement needs points to pair into a move and a destination. */
  canMove: boolean;
  /** Presentation needs at least two buttons to work through. */
  canPresent: boolean;
}

/**
 * The points a Move button can carry: one with a place of its own, or a glider
 * that slides along its path. A constructed point — a midpoint, an intersection —
 * is wherever its parents make it, so a button that moved it would be a promise
 * the next board update breaks.
 */
export function isMovablePoint(el: HeyGeoElement): boolean {
  return el.type === 'point' || el.type === 'glider';
}

export function actionButtonRows(selection: string[], elements: HeyGeoElement[] = []): ActionButtonRows {
  const picked = elements.filter((e) => selection.includes(e.id));
  return {
    canCreate: picked.length > 0,
    canAnimate: picked.some((e) => animatableKind(e) !== null),
    canMove: picked.filter(isMovablePoint).length >= 2,
    canPresent: picked.filter((e) => buttonOf(e) !== null).length >= 2,
  };
}
