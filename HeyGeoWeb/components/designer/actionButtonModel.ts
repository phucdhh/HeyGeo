/**
 * An action button, as Sketchpad's Edit | Action Buttons makes one.
 *
 * A button is a caption on the sketch that does something when it is pressed.
 * This file holds the behaviours the app has so far — Hide/Show and Animation —
 * as data: which objects the button acts on, what it calls them and, for an
 * animation, how it runs. Pressing a Hide/Show button is a change to those
 * objects' visibility, not to the button, so a reload shows the same sketch with
 * the objects still hidden and the button still saying "Show". Pressing an
 * Animation button starts a run of the objects it was made from.
 *
 *   element.type      = 'actionbutton'
 *   element.parents   = [x, y, caption]      where it sits and what it reads
 *   element.attrs.button = { action, name, targets, animation? }
 *
 * The desktop app has no buttons of its own, so this follows Sketchpad directly:
 * the button names what it acts on, and hides everything it names while anything
 * it names is showing.
 */
import type { HeyGeoElement } from './designTypes';
import {
  ANIMATION_SPEED,
  animatableKind,
  isAnimationSpec,
  type AnimationSpec,
} from './animationModel';

/** The actions a button can perform. Sketchpad's Movement and Link come later. */
export type ActionButtonAction = 'hide' | 'animate';

const ACTIONS: ActionButtonAction[] = ['hide', 'animate'];

/** The button as stored: what it does, what it is called, what it acts on. */
export interface ActionButtonSpec {
  action: ActionButtonAction;
  /** The objects' names as the button shows them, e.g. "AB, M". */
  name: string;
  /** The elements a press hides or shows, or sets in motion. */
  targets: string[];
  /** An animation button's direction and speed; absent on every other action. */
  animation?: AnimationSpec;
}

/** True when a stored attribute really is a button this app can press. */
export function isActionButtonSpec(value: unknown): value is ActionButtonSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  if (!ACTIONS.includes(s.action as ActionButtonAction)) return false;
  if (typeof s.name !== 'string') return false;
  if (!Array.isArray(s.targets) || !s.targets.every((t) => typeof t === 'string')) return false;
  // an animation button without a run to make would be a caption that does nothing
  return s.action !== 'animate' || isAnimationSpec(s.animation);
}

/** The button an element is, or null when it is something else. */
export function buttonOf(el: { type?: string; attrs?: Record<string, unknown> | null }): ActionButtonSpec | null {
  if (el.type !== 'actionbutton') return null;
  return isActionButtonSpec(el.attrs?.button) ? el.attrs!.button as ActionButtonSpec : null;
}

/** The elements a press works on, for the dependency graph and cascade delete. */
export function buttonDeps(el: { type?: string; attrs?: Record<string, unknown> | null }): string[] {
  return buttonOf(el)?.targets ?? [];
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
  if (spec.action === 'animate') return `Chạy ${spec.name}`;
  return `${shows ? 'Hiện' : 'Ẩn'} ${spec.name}`;
}

/**
 * What a press does: it shows the objects when they are all hidden and hides
 * them otherwise, which is Sketchpad's toggle.
 */
export function buttonShows(spec: ActionButtonSpec, isVisible: (id: string) => boolean): boolean {
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
  animation?: AnimationSpec,
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
  if (action === 'animate') spec.animation = animation ?? { direction: 'forward', speed: ANIMATION_SPEED.fallback };
  return spec;
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
}

export function actionButtonRows(selection: string[], elements: HeyGeoElement[] = []): ActionButtonRows {
  return {
    canCreate: selection.length > 0,
    canAnimate: elements.some((e) => selection.includes(e.id) && animatableKind(e) !== null),
  };
}
