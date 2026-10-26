'use client';

/**
 * CindyModePanel – CindyJS Code Mode for HeyGeo Web
 *
 * User writes plain JavaScript that calls CindyJS({...}):
 *
 *   var instance = CindyJS({
 *     ports: [{ id: BOARDID, width: 600, height: 500 }],
 *     geometry: [...],
 *     scripts: { cs_init: "init", cs_draw: "draw" },
 *   });
 *
 * BOARDID is injected as a variable pointing to the preview <div>.
 * Previous CindyJS instance is shut down before each re-run.
 *
 * Editor: CodeMirror 6 with CindyJS autocomplete and real-time lint.
 */

import dynamic from 'next/dynamic';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { cindyBasicGroup, cindyScriptsGroup } from './snippets/cindySnippets';
import type { CodeEditorHandle } from './CindyJSCodeEditor';

// CindyJS script elements (for inline scripts referenced by id)
// CindyModePanel injects a <link> for CindyJS CSS and a <script> tag once.

// CodeMirror uses browser APIs – must be client-only (no SSR)
const CindyJSCodeEditor = dynamic(
  () => import('./CindyJSCodeEditor'),
  { ssr: false }
);

const CODE_BOARD_ID = 'heygeo-cindy-preview';

const CINDY_CDN = 'https://cindyjs.org/dist/v0.8/Cindy.js';
const CINDY_CSS = 'https://cindyjs.org/dist/v0.8/CindyJS.css';

/** Detect whether code is an HTML fragment (gallery paste) or plain JS.
 * HTML mode: code starts with an HTML tag (possibly after whitespace/comments).
 * JS mode: anything else — even if the JS happens to contain template-literal HTML.
 */
function detectCodeMode(code: string): 'html' | 'js' {
  return /^\s*</.test(code) ? 'html' : 'js';
}

/**
 * Build sandboxed iframe HTML for the editor preview.
 *
 * HTML mode – user pastes a gallery HTML fragment; embedded directly in
 *             <body> so CindyJS DOM scanning (canvasname, x-cindyscript) works.
 * JS mode   – user writes plain JS with BOARDID / CindyJS variables.
 */
function buildPreviewSrcdoc(code: string): string {
  const isHtml = detectCodeMode(code) === 'html';

  const head = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <link rel="stylesheet" href="${CINDY_CSS}">
  <style>html,body{margin:0;padding:0;}</style>
  <script>window.cindyDontWait=true;<\/script>
  <script src="${CINDY_CDN}"><\/script>
</head>
<body>`;

  const thumbScript = `
  <script>
    setTimeout(function(){
      var canvas = document.querySelector('canvas');
      var dataUrl = null;
      if(canvas){ try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
      window.parent.postMessage({type:'heygeo-cindy-thumb',data:dataUrl},'*');
    }, 1800);
  <\/script>`;

  if (isHtml) {
    // HTML mode: embed raw fragment — </script> tags must stay intact for the HTML parser.
    // Applying the safeCode escape would break CindyJS's own <script> closing tags.
    return `${head}\n${code}\n${thumbScript}\n</body></html>`;
  }

  // JS mode: escape </script> to prevent early termination of our injected <script> block.
  const safeCode = code.replace(/<\/script>/gi, '<\\/script>');
  return `${head}
  <div id="${CODE_BOARD_ID}"></div>
  <script>
    (function(){
      var BOARDID = ${JSON.stringify(CODE_BOARD_ID)};
      var CindyJS = window.CindyJS;
      try {
        ${safeCode}
      } catch(err) {
        var pre = document.createElement('pre');
        pre.style.cssText = 'color:red;padding:8px;white-space:pre-wrap;font-size:13px;';
        pre.textContent = String(err);
        document.body.prepend(pre);
      }
      // Capture canvas thumbnail and notify parent.
      setTimeout(function(){
        var canvas = document.querySelector('canvas');
        var dataUrl = null;
        if(canvas){ try { dataUrl = canvas.toDataURL('image/png'); } catch(e){} }
        window.parent.postMessage({type:'heygeo-cindy-thumb',data:dataUrl},'*');
      }, 1800);
    })();
  <\/script>
</body></html>`;
}

// ─── Default sample code ──────────────────────────────────────────────────────
const DEFAULT_CODE = `// CindyJS Code Mode – HeyGeo Web
// Tham khảo: https://cindyjs.org/docs/
//
// Cách dùng:
//   • Viết JavaScript dùng biến BOARDID và CindyJS, hoặc
//   • Paste HTML fragment từ gallery CindyJS
//     (phần body, không gồm <html>/<head>).
//
// BOARDID là id của canvas preview (biến sẵn có, không cần nhập).
// Gọi CindyJS({...}) để tạo mô hình:

var instance = CindyJS({
  ports: [{ id: BOARDID, width: 600, height: 500, background: "rgb(255,255,255)" }],
  defaultAppearance: {
    dimDependent: 0.7,
    fontFamily: "sans-serif",
    lineSize: 1.5,
    pointSize: 6.0,
    textsize: 14.0,
  },
  angleUnit: "°",
  geometry: [
    // Ba đỉnh tam giác (kéo được)
    { name: "A", type: "Free", pos: [4, -3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "B", type: "Free", pos: [4,  3, -1.5], color: [1, 0, 0], labeled: true },
    { name: "C", type: "Free", pos: [4,  0,  3  ], color: [1, 0, 0], labeled: true },
    // Các cạnh
    { name: "AB", type: "Segment", args: ["A", "B"], color: [0, 0, 0.8] },
    { name: "BC", type: "Segment", args: ["B", "C"], color: [0, 0, 0.8] },
    { name: "CA", type: "Segment", args: ["C", "A"], color: [0, 0, 0.8] },
    // Đường thẳng ẩn để dựng đường cao
    { name: "lAB", type: "Join", args: ["A", "B"], visible: false },
    { name: "lBC", type: "Join", args: ["B", "C"], visible: false },
    { name: "lCA", type: "Join", args: ["C", "A"], visible: false },
    // Đường cao qua A, B
    { name: "hA", type: "Orthogonal", args: ["lBC", "A"], color: [0.1, 0.7, 0.1] },
    { name: "hB", type: "Orthogonal", args: ["lCA", "B"], color: [0.1, 0.7, 0.1] },
    // Trực tâm H = giao điểm hai đường cao
    { name: "H", type: "Meet", args: ["hA", "hB"], color: [0.8, 0.2, 0.8], labeled: true },
  ],
  csconsole: false,
});
`;

// ─── Execute user code ────────────────────────────────────────────────────────
// (Legacy – kept for reference; preview now runs in a sandboxed iframe)

// ─── Imperative handle ────────────────────────────────────────────────────────
export interface CindyPanelHandle {
  getCode: () => string;
  /**
   * Capture the current preview canvas as a PNG data-URL.
   * Returns a Promise that resolves immediately if the iframe already sent the
   * thumbnail, or waits up to 3 s for the postMessage to arrive.
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
// Re-uses the existing InsertMenu concept but drives CindyJS snippet groups.
// We need a local version because InsertMenu hardcodes SNIPPET_GROUPS internally.
// A lightweight inline implementation is used here.

import type { Group } from './snippets/types';

function CindyInsertMenu({ group, onInsert }: { group: Group; onInsert: (code: string) => void }) {
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
          ${open ? 'bg-violet-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-100'}`}
      >
        {group.name}
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
                  ${activeCat === ci ? 'bg-violet-700 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'}`}
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
const CindyModePanel = forwardRef<CindyPanelHandle, Props>(function CindyModePanel(
  { visible, onBack, initialCode, hideBackButton, onCodeChange },
  ref
) {
  const editorRef    = useRef<CodeEditorHandle | null>(null);
  const codeCacheRef = useRef<string>(initialCode ?? DEFAULT_CODE);

  const [displayCode, setDisplayCode] = useState(initialCode ?? DEFAULT_CODE);
  const [error, setError]             = useState<string | null>(null);
  const [runCount, setRunCount]       = useState(0);
  const [previewSrcdoc, setPreviewSrcdoc] = useState('');
  const [codeMode, setCodeMode]       = useState<'html' | 'js'>(
    detectCodeMode(initialCode ?? DEFAULT_CODE)
  );
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef        = useRef<HTMLIFrameElement | null>(null);
  // undefined = not yet received; null = received but no canvas; string = data URL
  const thumbDataRef     = useRef<string | null | undefined>(undefined);
  const thumbResolversRef = useRef<((v: string | null) => void)[]>([]);

  // Listen for canvas thumbnail sent via postMessage from the sandboxed iframe.
  useEffect(() => {
    function handler(ev: MessageEvent) {
      const msg = ev.data as { type?: string; data?: string | null } | null;
      if (msg?.type === 'heygeo-cindy-thumb') {
        const val = msg.data ?? null;
        thumbDataRef.current = val;
        // Resolve any pending waiters (e.g. save clicked before 1800 ms)
        thumbResolversRef.current.forEach(r => r(val));
        thumbResolversRef.current = [];
      }
    }
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useImperativeHandle(ref, () => ({
    getCode: () => editorRef.current?.getCode() ?? codeCacheRef.current,
    captureThumb: () => {
      // Already received (string or null)
      if (thumbDataRef.current !== undefined) {
        return Promise.resolve(thumbDataRef.current);
      }
      // Wait up to 3 s for the iframe postMessage
      return new Promise<string | null>((resolve) => {
        const timer = setTimeout(() => {
          thumbResolversRef.current = thumbResolversRef.current.filter(r => r !== resolver);
          resolve(null);
        }, 3000);
        const resolver = (v: string | null) => { clearTimeout(timer); resolve(v); };
        thumbResolversRef.current.push(resolver);
      });
    },
  }));

  // ── Run: rebuild iframe srcdoc ──────────────────────────────────────────────
  const run = useCallback(() => {
    const code = editorRef.current?.getCode() ?? codeCacheRef.current;
    thumbDataRef.current = undefined; // reset — not yet received for this run
    thumbResolversRef.current = [];   // cancel any pending waiters
    setCodeMode(detectCodeMode(code));
    setPreviewSrcdoc(buildPreviewSrcdoc(code));
    setError(null);
    setRunCount(c => c + 1);
  }, []);

  // ── Auto-run debounced when code changes ────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 1200);
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
    setCodeMode(detectCodeMode(newCode));
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
            ← Quay lại
          </button>
        )}

        <CindyInsertMenu group={cindyBasicGroup}   onInsert={handleInsert} />
        <CindyInsertMenu group={cindyScriptsGroup} onInsert={handleInsert} />

        <button
          onClick={() => { if (debounceRef.current) clearTimeout(debounceRef.current); run(); }}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-violet-600 hover:bg-violet-500 transition-colors text-xs font-semibold"
          title="Chạy code (Ctrl+Enter)"
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
            <span className="text-[#abb2bf] text-xs font-mono tracking-wide mr-auto">cindy.js</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold mr-2 ${
              codeMode === 'html' ? 'bg-amber-700 text-amber-100' : 'bg-violet-800 text-violet-200'
            }`}>
              {codeMode === 'html' ? 'HTML' : 'JS'}
            </span>
            <button
              onClick={() => { setDisplayCode(DEFAULT_CODE); codeCacheRef.current = DEFAULT_CODE; }}
              className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
              title="Khôi phục code mẫu"
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

          <CindyJSCodeEditor
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
          className="w-3 shrink-0 bg-gray-700 hover:bg-violet-500 active:bg-violet-400 transition-colors cursor-col-resize select-none touch-none flex items-center justify-center group"
          title="Kéo để thay đổi độ rộng"
        >
          <div className="w-0.5 h-8 bg-gray-500 group-hover:bg-violet-300 rounded-full transition-colors" />
        </div>

        {/* ── Right: CindyJS preview ────────────────────────────────────────── */}
        <div className="flex flex-col bg-white overflow-hidden" style={{ width: `${100 - splitPct}%` }}>
          <div className="flex items-center px-3 py-1 bg-gray-50 border-b border-gray-200 shrink-0">
            <span className="text-gray-500 text-xs">Preview – CindyJS</span>
            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              codeMode === 'html' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
            }`}>
              {codeMode === 'html' ? 'HTML mode' : 'JS mode'}
            </span>
            {runCount > 0 && (
              <span className="ml-2 text-gray-400 text-xs">tự động · {runCount}×</span>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            <iframe
              ref={iframeRef}
              srcDoc={previewSrcdoc}
              sandbox="allow-scripts"
              style={{ width: '100%', height: '100%', border: 'none', display: 'block', minHeight: 500 }}
              title="CindyJS preview"
            />
          </div>
        </div>

      </div>
    </div>
  );
});

export default CindyModePanel;
