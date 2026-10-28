import { describe, expect, it } from 'vitest';
import {
  DRAFT_VERSION,
  clearDraft,
  draftKey,
  readDraft,
  worthRestoring,
  writeDraft,
  type Draft,
} from './draftAutosave';
import type { HeyGeoData } from './designTypes';

const data = (title: string, points = 1): HeyGeoData => ({
  version: '1',
  title,
  boundingbox: [-8, 8, 8, -8],
  axis: false,
  grid: false,
  elements: Array.from({ length: points }, (_, i) => ({
    type: 'point', id: `p${i}`, parents: [i, 0], attrs: {},
  })),
});

/** The few storage calls an autosave makes, without a browser. */
function storage(seed: Record<string, string> = {}) {
  const items = new Map(Object.entries(seed));
  return {
    getItem: (k: string) => items.get(k) ?? null,
    setItem: (k: string, v: string) => { items.set(k, v); },
    removeItem: (k: string) => { items.delete(k); },
    items,
  };
}

describe('draftKey', () => {
  it('keeps one draft per document', () => {
    expect(draftKey('m1')).toBe('heygeo:design-draft:m1');
    expect(draftKey(null)).toBe('heygeo:design-draft:new');
    expect(draftKey(undefined)).toBe('heygeo:design-draft:new');
  });
});

describe('writeDraft / readDraft', () => {
  it('gives back what was written, with the sketch title', () => {
    const s = storage();
    expect(writeDraft(s, 'k', data('Hình 1'), 1000)).toBe(true);
    expect(readDraft(s, 'k')).toEqual({
      version: DRAFT_VERSION, savedAt: 1000, title: 'Hình 1', data: data('Hình 1'),
    });
  });

  it('has nothing to offer when the browser has no entry', () => {
    expect(readDraft(storage(), 'k')).toBeNull();
  });

  it('refuses a draft it cannot read rather than throwing', () => {
    expect(readDraft(storage({ k: '{not json' }), 'k')).toBeNull();
    expect(readDraft(storage({ k: JSON.stringify({ version: 99, savedAt: 1, data: data('x') }) }), 'k')).toBeNull();
    expect(readDraft(storage({ k: JSON.stringify({ version: DRAFT_VERSION, savedAt: 'soon', data: data('x') }) }), 'k')).toBeNull();
    expect(readDraft(storage({ k: JSON.stringify({ version: DRAFT_VERSION, savedAt: 1, data: {} }) }), 'k')).toBeNull();
    expect(readDraft(storage({ k: JSON.stringify({ version: DRAFT_VERSION, savedAt: 1 }) }), 'k')).toBeNull();
  });

  it('reports a browser that will not store, and does not throw', () => {
    const refusing = { setItem: () => { throw new Error('quota'); } };
    expect(writeDraft(refusing, 'k', data('x'))).toBe(false);
  });

  it('leaves nothing behind once cleared', () => {
    const s = storage();
    writeDraft(s, 'k', data('x'));
    clearDraft(s, 'k');
    expect(readDraft(s, 'k')).toBeNull();
    expect(() => clearDraft({ removeItem: () => { throw new Error('locked'); } }, 'k')).not.toThrow();
  });
});

describe('worthRestoring', () => {
  const draft = (d: HeyGeoData): Draft => ({ version: DRAFT_VERSION, savedAt: 1, title: d.title, data: d });

  it('offers a drawing the opened document does not have', () => {
    expect(worthRestoring(draft(data('draft')), data('opened'))).toBe(true);
    expect(worthRestoring(draft(data('draft')), null)).toBe(true);
  });

  it('stays quiet for a draft that matches what was opened', () => {
    expect(worthRestoring(draft(data('same')), data('same'))).toBe(false);
  });

  it('stays quiet for a draft with nothing drawn', () => {
    expect(worthRestoring(draft(data('empty', 0)), null)).toBe(false);
    expect(worthRestoring(draft(data('empty', 0)), data('opened'))).toBe(false);
  });
});
