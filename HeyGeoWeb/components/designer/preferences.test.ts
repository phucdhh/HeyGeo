import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  PREFERENCES_KEY,
  isHexColor,
  readPreferences,
  writePreferences,
} from './preferences';

/** The two storage calls preferences use, without a browser. */
function storage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => { items.set(k, v); },
    items,
  };
}

describe('preferences', () => {
  it('answers the app’s own colours when nothing was stored', () => {
    expect(readPreferences(storage())).toEqual(DEFAULT_PREFERENCES);
    expect(DEFAULT_PREFERENCES).toEqual({
      backgroundColor: '#ffffff',
      foregroundColor: '#1e3c96',
      selection: 'border',
    });
  });

  it('reads back what was written', () => {
    const s = storage();
    const prefs = { backgroundColor: '#000000', foregroundColor: '#ff0000', selection: 'blinking' as const };
    expect(writePreferences(s, prefs)).toBe(true);
    expect(readPreferences(s)).toEqual(prefs);
    expect(s.items.has(PREFERENCES_KEY)).toBe(true);
  });

  it('keeps a good setting beside a broken one', () => {
    const s = storage({
      [PREFERENCES_KEY]: JSON.stringify({
        backgroundColor: 'red', foregroundColor: '#00FF00', selection: 'wobble',
      }),
    });
    expect(readPreferences(s)).toEqual({
      backgroundColor: '#ffffff',
      foregroundColor: '#00ff00',
      selection: 'border',
    });
  });

  it('answers defaults rather than throwing on a corrupt entry', () => {
    expect(readPreferences(storage({ [PREFERENCES_KEY]: '{not json' }))).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(storage({ [PREFERENCES_KEY]: 'null' }))).toEqual(DEFAULT_PREFERENCES);
    expect(readPreferences(storage({ [PREFERENCES_KEY]: '[]' }))).toEqual(DEFAULT_PREFERENCES);
  });

  it('reports a browser that will not store', () => {
    const refusing = { setItem: () => { throw new Error('quota'); } };
    expect(writePreferences(refusing, DEFAULT_PREFERENCES)).toBe(false);
  });

  it('recognises only six-digit hex colours', () => {
    expect(isHexColor('#1e3c96')).toBe(true);
    expect(isHexColor('#ABCDEF')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('blue')).toBe(false);
    expect(isHexColor(123456)).toBe(false);
  });
});
