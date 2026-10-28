/**
 * Edit | Preferences — the settings the desktop keeps in ~/.heygeo.
 *
 * The desktop's HeyGeoProperties stores a background colour, a default
 * foreground colour for new objects, and whether a selection is drawn as a
 * border or blinks. They belong to the browser rather than to a document, so
 * they live in localStorage and never reach a saved model.
 */
export interface Preferences {
  /** The page the construction is drawn on. */
  backgroundColor: string;
  /** The ink new objects are drawn with; saved objects keep their own colour. */
  foregroundColor: string;
  /** How a picked object is marked: a pink outline, or a blinking outline. */
  selection: SelectionStyle;
}

export type SelectionStyle = 'border' | 'blinking';

/** The app's own ink, so a fresh browser draws what it always drew. */
export const DEFAULT_PREFERENCES: Preferences = {
  backgroundColor: '#ffffff',
  foregroundColor: '#1e3c96',
  selection: 'border',
};

export const PREFERENCES_KEY = 'heygeo:preferences';

const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

/** Answers defaults for anything missing or malformed, never throws. */
export function readPreferences(
  storage: Pick<Storage, 'getItem'>,
  key: string = PREFERENCES_KEY,
): Preferences {
  let stored: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(storage.getItem(key) ?? '{}') as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      stored = parsed as Record<string, unknown>;
    }
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    backgroundColor: isHexColor(stored.backgroundColor)
      ? stored.backgroundColor.toLowerCase() : DEFAULT_PREFERENCES.backgroundColor,
    foregroundColor: isHexColor(stored.foregroundColor)
      ? stored.foregroundColor.toLowerCase() : DEFAULT_PREFERENCES.foregroundColor,
    selection: stored.selection === 'blinking' ? 'blinking' : 'border',
  };
}

export function writePreferences(
  storage: Pick<Storage, 'setItem'>,
  prefs: Preferences,
  key: string = PREFERENCES_KEY,
): boolean {
  try {
    storage.setItem(key, JSON.stringify({
      backgroundColor: prefs.backgroundColor,
      foregroundColor: prefs.foregroundColor,
      selection: prefs.selection,
    }));
    return true;
  } catch {
    return false;
  }
}
