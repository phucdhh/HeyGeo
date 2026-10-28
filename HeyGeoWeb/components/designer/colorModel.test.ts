import { describe, expect, it } from 'vitest';
import { normalizeHex } from './colorModel';

describe('the hex field of Display | Color | Other Color…', () => {
  it('accepts the six-digit form the picker hands over', () => {
    expect(normalizeHex('#1E3C96')).toBe('#1e3c96');
    expect(normalizeHex('1e3c96')).toBe('#1e3c96');
    expect(normalizeHex('  #c83c3c  ')).toBe('#c83c3c');
  });

  it('expands the three-digit shorthand', () => {
    expect(normalizeHex('#f0a')).toBe('#ff00aa');
    expect(normalizeHex('ABC')).toBe('#aabbcc');
  });

  it('refuses anything that is not a colour', () => {
    expect(normalizeHex('')).toBeNull();
    expect(normalizeHex('#12')).toBeNull();
    expect(normalizeHex('#12345')).toBeNull();
    expect(normalizeHex('#1234567')).toBeNull();
    expect(normalizeHex('#gggggg')).toBeNull();
    expect(normalizeHex('red')).toBeNull();
  });
});
