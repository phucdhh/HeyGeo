/**
 * An unsaved design kept in the browser.
 *
 * A reload, a closed tab or a crash used to take an unsaved sketch with it. The
 * draft is one entry per document — a model by its id, or the unnamed new
 * sketch — written while the designer works and offered back on return until
 * the document is saved or the draft is discarded.
 *
 * Everything here is a plain storage function so the rules can be tested
 * without a browser; a browser in private mode may refuse to write, and that is
 * only a lost convenience, never a failed edit.
 */
import type { HeyGeoData } from './designTypes';

export const DRAFT_VERSION = 1;

export interface Draft {
  version: number;
  savedAt: number;
  title: string;
  data: HeyGeoData;
}

/** One key per document: a model keeps its own draft, a new sketch another. */
export function draftKey(modelId: string | null | undefined): string {
  return `heygeo:design-draft:${modelId || 'new'}`;
}

export function readDraft(
  storage: Pick<Storage, 'getItem'>,
  key: string,
): Draft | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (parsed.version !== DRAFT_VERSION) return null;
    if (typeof parsed.savedAt !== 'number' || !Number.isFinite(parsed.savedAt)) return null;
    const data = parsed.data as HeyGeoData | undefined;
    if (!data || !Array.isArray(data.elements)) return null;
    return {
      version: DRAFT_VERSION,
      savedAt: parsed.savedAt,
      title: typeof parsed.title === 'string' ? parsed.title : '',
      data,
    };
  } catch {
    return null;
  }
}

export function writeDraft(
  storage: Pick<Storage, 'setItem'>,
  key: string,
  data: HeyGeoData,
  savedAt: number = Date.now(),
): boolean {
  try {
    storage.setItem(key, JSON.stringify({
      version: DRAFT_VERSION,
      savedAt,
      title: data.title ?? '',
      data,
    }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(storage: Pick<Storage, 'removeItem'>, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    /* nothing was stored, so nothing to clear */
  }
}

/**
 * Whether the draft holds something worth interrupting the designer for: a
 * drawing, and one that differs from what was opened.
 */
export function worthRestoring(draft: Draft, opened: HeyGeoData | null): boolean {
  if (!Array.isArray(draft.data.elements) || draft.data.elements.length === 0) return false;
  return JSON.stringify(draft.data) !== JSON.stringify(opened ?? null);
}
