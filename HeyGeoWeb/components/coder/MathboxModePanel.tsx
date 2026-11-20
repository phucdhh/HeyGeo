'use client';

/**
 * MathboxModePanel – MathBox Code Mode for HeyGeo Web
 *
 * User writes plain JavaScript that bootstraps MathBox:
 *
 *   var mathbox = MathBox.mathBox({
 *     element: element,
 *     plugins: ['core', 'controls', 'cursor'],
 *     controls: { klass: THREE.OrbitControls },
 *   });
 *
 * BOARDID and element are injected as variables pointing to the preview <div>;
 * MathBox and THREE are engine globals loaded from /vendor/mathbox/.
 * Each re-run rebuilds the sandboxed iframe document, which disposes WebGL.
 *
 * Editor: CodeMirror 6 with MathBox autocomplete and real-time lint.
 */

import dynamic from 'next/dynamic';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildMathboxSrcdoc } from '@/lib/mathbox';
import { mathboxBasicGroup, mathboxExamplesGroup } from './snippets/mathboxSnippets';
import type { CodeEditorHandle } from './MathboxCodeEditor';

// CodeMirror uses browser APIs – must be client-only (no SSR)
const MathboxCodeEditor = dynamic(
  () => import('./MathboxCodeEditor'),
  { ssr: false }
);

const CODE_BOARD_ID = 'heygeo-mathbox-preview';

// ─── Default sample code ──────────────────────────────────────────────────────
const DEFAULT_CODE = `// MathBox Code Mode – HeyGeo Web
// Tham khảo: https://mathbox.org/ · https://github.com/unconed/mathbox
//
// Biến có sẵn (không cần khai báo):
//   • element – <div> mount của canvas WebGL
//   • MathBox, THREE – engine globals
//
// Kéo chuột để quay (OrbitControls), cuộn để zoom.

var mathbox = MathBox.mathBox({
  element: element,
  plugins: ['core', 'controls', 'cursor'],
  controls: { klass: THREE.OrbitControls },
  renderer: { parameters: { alpha: true, depth: true, stencil: true, preserveDrawingBuffer: true, antialias: true } },
});

var three = mathbox.three;
three.camera.position.set(-2, 2, 8);

var view = mathbox.cartesian({
  range: [[-2, 2], [-1, 1], [-1, 1]],
  scale: [2, 1, 1],
});

view.grid({ divideX: 10, divideY: 10, color: '#cbd5e1', opacity: 1 });
view.axis({ axis: 1, color: '#64748b', width: 3 })
  .axis({ axis: 2, color: '#64748b', width: 3 });

view.interval({
  expr: function (emit, x, i, t) {
    emit(x, Math.sin(x + t), 0);
  },
  width: 64,
  channels: 3,
});
view.line({ width: 5, color: '#2563eb' });

mathbox.set('focus', 3);
`;

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface MathboxPanelHandle {
  getCode: () => string;
  /**
   * Capture the current preview canvas as a PNG data-URL.
   * Returns a Promise that resolves immediately if the iframe already sent the
   * thumbnail, or waits up to 5 s for the postMessage to arrive.
   * Resolves to null if there is no canvas or the timeout elapses first.
   */
  captureThumb: () => Promise<string | null>;
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  visible: boolean;
  onBack: () => void;
  initialCode?: string;
  hideBackButton?: boolean;
  onCodeChange?: () => void;
}

// ─── InsertMenu (simple two-group dropdown, no external dep) ──────────────────
import type { Group } from './snippets/types';

function MathboxInsertMenu({ group, label, onInsert }: { group: Group; label?: string; onInsert: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [activeCat, setActiveCat] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle() { setActiveCat(0); setOpen(v => !v); }

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const cat = group.categories[activeCat] ?? group.categories[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={toggle}
        className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors select-none
          ${open ? 'bg-cyan-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}`}
      >
        {label ?? group.name}
        <span className="text-[10px] opacity-70">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 flex shadow-2xl rounded-lg overflow-hidden border border-gray-700" style={{ width: 580, maxHeight: 480 }}>
          {/* Category sidebar */}
          <div className="flex flex-col w-44 bg-gray-900 border-r border-gray-700 shrink-0 overflow-y-auto">
            {group.categories.map((c, ci) => (
              <button
                key={ci}
                onClick={() => setActiveCat(ci)}
                className={`text-left px-3 py-2.5 text-xs transition-colors border-b border-gray-800 last:border-0
                  ${activeCat === ci ? 'bg-cyan-700 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
          {/* Items */}
          <div className="flex-1 bg-gray-950 overflow-y-auto">
            {cat.items.map((item, ii) => (
              <button
                key={ii}
                onClick={() => { onInsert(item.code); setOpen(false); }}
                className="w-full text-left px-3 py-2.5 border-b border-gray-800 last:border-0 hover:bg-gray-800 transition-colors group"
              >
                <span className="block text-xs text-gray-200 font-medium group-hover:text-white">{item.label}</span>
                <pre className="mt-0.5 text-[10px] text-gray-500 font-mono truncate group-hover:text-gray-400 whitespace-pre-wrap line-clamp-2">
                  {item.code.trim().slice(0, 120)}
                </pre>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
const MathboxModePanel = forwardRef<MathboxPanelHandle, Props>(function MathboxModePanel(
  { visible, onBack, initialCode, hideBackButton, onCodeChange },
  ref
) {
  const { t } = useTranslation();
  const editorRef    = useRef<CodeEditorHandle | null>(null);
  const codeCacheRef = useRef<string>(initialCode ?? DEFAULT_CODE);

  const [displayCode, setDisplayCode] = useState(initialCode ?? DEFAULT_CODE);
  const [error, setError]             = useState<string | null>(null);
  const [runCount, setRunCount]       = useState(0);
  const [previewSrcdoc, setPreviewSrcdoc] = useState('');
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef        = useRef<HTMLIFrameElement | null>(null);
  const lastRunCodeRef   = useRef<string | null>(null);
  // undefined = not yet received; null = received but no canvas; string = data URL
  const thumbDataRef     = useRef<string | null | undefined>(undefined);
  const thumbResolversRef = useRef<((v: string | null) => void)[]>([]);

  // Listen for canvas thumbnail sent via postMessage from the sandboxed iframe.
  useEffect(() => {
    function handler(ev: MessageEvent) {
      if (ev.source !== iframeRef.current?.contentWindow) return;
      const msg = ev.data as { type?: string; data?: string | null; message?: string } | null;
      if (msg?.type === 'heygeo-mathbox-error') {
        setError(msg.message || t('mathbox.unknown_error'));
        return;
      }
      if (msg?.type === 'heygeo-mathbox-thumb') {
        const val = msg.data ?? null;
        thumbDataRef.current = val;
        // Resolve any pending waiters (e.g. save clicked before 1800 ms)
        thumbResolversRef.current.forEach(r => r(val));
        thumbResolversRef.current = [];
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [t]);

  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() ?? codeCacheRef.current,
    captureThumb: () => {
      // Already received (string or null)
      if (thumbDataRef.current !== undefined) {
        return Promise.resolve(thumbDataRef.current);
      }
      // Wait up to 5 s for the iframe postMessage (it retries once at ~3.5 s)
      return new Promise<string | null>((resolve) => {
        const timer = setTimeout(() => {
          thumbResolversRef.current = thumbResolversRef.current.filter(r => r !== resolver);
          resolve(null);
        }, 5000);
        const resolver = (v: string | null) => { clearTimeout(timer); resolve(v); };
        thumbResolversRef.current.push(resolver);
      });
    },
  }));

  // ── Run: rebuild iframe srcdoc ──────────────────────────────────────────────
  const run = useCallback(() => {
    const code = editorRef.current?.getCode() ?? codeCacheRef.current;
    lastRunCodeRef.current = code;
    thumbDataRef.current = undefined; // reset — not yet received for this run
    thumbResolversRef.current = [];   // cancel any pending waiters
    setPreviewSrcdoc(buildMathboxSrcdoc(code, { boardId: CODE_BOARD_ID, mode: 'panel' }));
    setError(null);
    setRunCount(c => c + 1);
  }, []);

  // ── Auto-run debounced when code changes ────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Skip when the code was already run (e.g. the initial run on mount).
      const code = editorRef.current?.getCode() ?? codeCacheRef.current;
      if (code !== lastRunCodeRef.current) run();
    }, 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [displayCode, run]);

  // ── Initial run when visible ─────────────────────────────────────────────────
  useEffect(() => {
    if (visible) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function handleCodeChange(newCode: string) {
    codeCacheRef.current = newCode;
    setDisplayCode(newCode);
    onCodeChange?.();
  }

  function handleInsert(snippet: string) {
    editorRef.current?.insertAtCursor(snippet);
    codeCacheRef.current = editorRef.current?.getCode() ?? codeCacheRef.current;
    setDisplayCode(codeCacheRef.current);
    onCodeChange?.();
  }

  // ── Split-pane drag ──────────────────────────────────────────────────────────
  const [splitPct, setSplitPct]  = useState(50);
  const containerRef             = useRef<HTMLDivElement>(null);
  const dragStartXRef            = useRef(0);
  const dragStartSplitRef        = useRef(50);
  const isDraggingRef            = useRef(false);

  function startDrag(x: number) {
    isDraggingRef.current = true;
    dragStartXRef.current = x;
    dragStartSplitRef.current = splitPct;
  }
  function applyDrag(x: number) {
    if (!isDraggingRef.current || !containerRef.current) return;
    const totalW = containerRef.current.getBoundingClientRect().width;
    if (!totalW) return;
    const dx = x - dragStartXRef.current;
    setSplitPct(Math.max(15, Math.min(85, dragStartSplitRef.current + (dx / totalW) * 100)));
  }
  function handleDividerMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    startDrag(e.clientX);
    const onMove = (ev: MouseEvent) => applyDrag(ev.clientX);
    const onUp   = () => { isDraggingRef.current = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
  function handleDividerTouchStart(e: React.TouchEvent) {
    startDrag(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => { ev.preventDefault(); applyDrag(ev.touches[0].clientX); };
    const onEnd  = () => { isDraggingRef.current = false; window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd); };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col flex-1 overflow-hidden"
      style={{ display: visible ? 'flex' : 'none' }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-white select-none shrink-0 border-b border-gray-700">
        {!hideBackButton && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-xs font-medium"
          >
            {t('mathbox.back')}
          </button>
        )}

        <MathboxInsertMenu group={mathboxBasicGroup}    onInsert={handleInsert} />
        <MathboxInsertMenu group={mathboxExamplesGroup} label={t('mathbox.menu_examples')} onInsert={handleInsert} />

        <button
          onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); run(); }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 transition-colors text-xs font-semibold"
          title={t('mathbox.run_title')}
        >
          ▶ Run
        </button>

        {runCount > 0 && !error && (
          <span className="text-green-400 text-xs">✓ OK</span>
        )}
      </div>

      {/* ── Two-column main area ──────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden" style={{ cursor: isDraggingRef.current ? 'col-resize' : 'auto' }}>

        {/* ── Left: editor ─────────────────────────────────────────────────── */}
        <div className="flex flex-col bg-[#282c34] overflow-hidden" style={{ width: `${splitPct}%` }}>
          <div className="flex items-center px-3 py-1 bg-[#21252b] border-b border-[#3e4451] shrink-0">
            <span className="text-[#abb2bf] text-xs font-mono tracking-wide mr-auto">mathbox.js</span>
            <button
              onClick={() => { setDisplayCode(DEFAULT_CODE); codeCacheRef.current = DEFAULT_CODE; onCodeChange?.(); }}
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              title={t('mathbox.reset_title')}
            >
              reset
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-900/80 border-b border-red-700 shrink-0 max-h-28 overflow-y-auto">
              <span className="text-red-300 text-xs mt-0.5 shrink-0">⚠ Runtime</span>
              <pre className="text-red-200 text-xs font-mono whitespace-pre-wrap leading-5 flex-1">{error}</pre>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 shrink-0 text-xs">✕</button>
            </div>
          )}

          <MathboxCodeEditor
            ref={editorRef}
            initialCode={displayCode}
            onChange={handleCodeChange}
            onRun={() => { if (debounceRef.current) clearTimeout(debounceRef.current); run(); }}
          />
        </div>

        {/* ── Draggable divider ─────────────────────────────────────────────── */}
        <div
          onMouseDown={handleDividerMouseDown}
          onTouchStart={handleDividerTouchStart}
          className="w-3 shrink-0 bg-gray-700 hover:bg-cyan-500 active:bg-cyan-400 transition-colors cursor-col-resize select-none touch-none flex items-center justify-center group"
          title={t('mathbox.drag_title')}
        >
          <div className="w-0.5 h-8 bg-gray-500 group-hover:bg-cyan-300 rounded-full transition-colors" />
        </div>

        {/* ── Right: MathBox preview ────────────────────────────────────────── */}
        <div className="flex flex-col bg-white overflow-hidden" style={{ width: `${100 - splitPct}%` }}>
          <div className="flex items-center px-3 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
            <span className="text-gray-500 text-xs">Preview – MathBox (WebGL)</span>
            {runCount > 0 && (
              <span className="ml-2 text-gray-400 text-xs">{t('mathbox.auto_runs', { count: runCount })}</span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {/* React skips the srcDoc write when the rebuilt string is identical, so Run would not restart the scene. */}
            <iframe
              ref={iframeRef}
              key={runCount}
              srcDoc={previewSrcdoc}
              sandbox="allow-scripts"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 500 }}
              title="MathBox preview"
            />
          </div>
        </div>

      </div>
    </div>
  );
});

export default MathboxModePanel;
