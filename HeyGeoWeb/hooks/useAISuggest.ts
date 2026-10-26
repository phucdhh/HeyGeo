import { useCallback, useRef } from 'react';

/** Characters that trigger an AI suggestion request */
const TRIGGER_CHARS = new Set(['(', '{', '.', ' ']);
const MIN_CHARS = 20;
const DEBOUNCE_MS = 800;

/**
 * useAISuggest – debounced, cancellable Groq AI code suggestion hook.
 *
 * Conditions before a request is sent:
 *  1. code.length >= 20 chars
 *  2. The character just typed is one of: ( { . (space)
 *  3. 800ms has elapsed since the last keystroke (debounce)
 *  4. Any in-flight request for the previous keystroke is cancelled
 */
export function useAISuggest(onResult: (suggestion: string) => void) {
  const abortRef    = useRef<AbortController | null>(null);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const suggest = useCallback((code: string, charBefore: string) => {
    // Condition checks
    if (code.trim().length < MIN_CHARS) return;
    if (!TRIGGER_CHARS.has(charBefore)) return;

    // Cancel previous timer + in-flight request
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    timerRef.current = setTimeout(async () => {
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch('/api/ai/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: ctrl.signal,
        });

        if (!res.ok) return;

        const { suggestion } = await res.json() as { suggestion?: string };
        if (suggestion?.trim()) {
          onResultRef.current(suggestion.trim());
        }
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.warn('[AI suggest]', e);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  /** Cancel any pending timer or in-flight request */
  const cancel = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  return { suggest, cancel };
}
