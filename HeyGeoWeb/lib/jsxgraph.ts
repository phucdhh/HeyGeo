/**
 * JSXGraph engine loader – self-hosted, no CDN.
 *
 * The UMD bundle at public/vendor/jsxgraph/ sets window.JXG when it executes
 * (see distrib/jsxgraphcore.js in the jsxgraph package). Code Mode models are
 * raw user JS that references the bare global `JXG`, so we keep the script-tag
 * loading model rather than bundling the ES module.
 */

/** Must match the jsxgraph dependency and public/vendor/jsxgraph/ content. */
export const JSXGRAPH_VERSION = '1.12.2';

export const JSXGRAPH_SCRIPT = '/vendor/jsxgraph/jsxgraphcore.js';
export const JSXGRAPH_STYLESHEET = '/vendor/jsxgraph/jsxgraph.css';

type JXGGlobal = { JSXGraph: { initBoard: (...a: unknown[]) => any } };

let readyPromise: Promise<JXGGlobal> | null = null;

export function getJXG(): JXGGlobal | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { JXG?: JXGGlobal }).JXG ?? null;
}

export function whenJsxGraphReady(): Promise<JXGGlobal> {
  if (typeof document === 'undefined') return Promise.reject(new Error('no document'));

  const existing = getJXG();
  if (existing) return Promise.resolve(existing);
  if (readyPromise) return readyPromise;

  readyPromise = new Promise<JXGGlobal>((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error(`JSXGraph không tải được (${JSXGRAPH_SCRIPT})`)),
      20000,
    );
    const poll = () => {
      const jxg = getJXG();
      if (jxg) {
        window.clearTimeout(timeout);
        resolve(jxg);
        return;
      }
      window.setTimeout(poll, 40);
    };

    if (!document.querySelector(`script[src="${JSXGRAPH_SCRIPT}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = JSXGRAPH_STYLESHEET;
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = JSXGRAPH_SCRIPT;
      script.async = true;
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        readyPromise = null;
        reject(new Error(`JSXGraph tải thất bại (${JSXGRAPH_SCRIPT})`));
      });
      document.head.appendChild(script);
    }
    poll();
  });

  return readyPromise;
}
