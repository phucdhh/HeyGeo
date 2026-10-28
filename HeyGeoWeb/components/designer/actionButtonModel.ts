/**
 * An action button, as Sketchpad's Edit | Action Buttons makes one.
 *
 * A button is a caption on the sketch that does something when it is pressed.
 * This file holds the one behaviour the app has so far — Hide/Show — as data:
 * which objects the button acts on and what it calls them. Pressing it is a
 * change to those objects' visibility, not to the button, so a reload shows the
 * same sketch with the objects still hidden and the button still saying "Show".
 *
 *   element.type      = 'actionbutton'
 *   element.parents   = [x, y, caption]      where it sits and what it reads
 *   element.attrs.button = { action, name, targets }
 *
 * The desktop app has no buttons of its own, so this follows Sketchpad directly:
 * the button names what it hides, and hides everything it names while anything
 * it names is showing.
 */
import type { HeyGeoElement } from './designTypes';

/** The actions a button can perform. Sketchpad's Animation and Link come later. */
export type ActionButtonAction = 'hide';

const ACTIONS: ActionButtonAction[] = ['hide'];

/** The button as stored: what it does, what it is called, what it acts on. */
export interface ActionButtonSpec {
  action: ActionButtonAction;
  /** The objects' names as the button shows them, e.g. "AB, M". */
  name: string;
  /** The elements a press hides or shows. */
  targets: string[];
}

/** True when a stored attribute really is a button this app can press. */
export function isActionButtonSpec(value: unknown): value is ActionButtonSpec {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return ACTIONS.includes(s.action as ActionButtonAction)
    && typeof s.name === 'string'
    && Array.isArray(s.targets) && s.targets.every((t) => typeof t === 'string');
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
): ActionButtonSpec {
  return { action, name: buttonName(targets), targets: targets.map((t) => t.id) };
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
}

export function actionButtonRows(selection: string[]): ActionButtonRows {
  return { canCreate: selection.length > 0 };
}
